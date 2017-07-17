/**
 * Created by Shane on 14/07/2017.
 */
// Libraries/Includes
var Knwl = require('knwl.js');
var cheerio = require('cheerio');
var http = require('http');
var request = require('request');
var fs = require('fs');
var googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyCxhu3CZLL6FGnXnQrpI3CKJqxJ9SK-XxM'
});

// Variables
var inputEmail = process.argv[2];        // Input email is taken from commandline arguments
var domain;                              // Domain take from email address
var knwlInstance = new Knwl('english');  // Knwl instance for using Knwl functions
var siteDir;                             // Folder directory of the site where data is to be stored
var words;                               // All words on website scraped by Knwl
var bodyG;                               // Global body variable
var finalEmails = [];                    // Final processed emails
var finalPhoneNumbers = [];              // Final processed phonenumbers
var scrapeObj = {};                      // Final object storing scraped data
var homePageTitle;                       // Title of home page
var hyperLinks = [];                     // Array of hyperlinks on the domain
var address;
var place;
var companyName;
var companyRating;
var googleMapsResults;
var googleMapsOpenNow;
var googleMapsAPIKey = "AIzaSyCxhu3CZLL6FGnXnQrpI3CKJqxJ9SK-XxM";

//Load Knwl plugins
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));
knwlInstance.register('internationalPhones', require('knwl.js/experimental_plugins/internationalPhones'));
knwlInstance.register('places', require('knwl.js/default_plugins/places'));

/**
 * Uses commandline arguments to grab domain from email
 */
if (process.argv[2] != null) {
    domain = grabDomain(inputEmail);
}
else {
    console.log('Missing email arguments please refer to README.MD');
    process.exit();
}

/**
 * Main promise chain that steps through in the following order:
 * 1. Makes request to domain - Returns body
 *     - Grabs words from body using Knwl
 * 2. Loads body in to cheerio - returns $ (Cheerio API enabled HTML body)
 * 3. Finds all hyperlinks on page - returns link array
 *     - Uses links/$ to find phone numbers and save to array
 *     - Uses links/body to find email addresses and save to array
 * 4. Use Google API to locate the address of the company
 * 5. Outputs the scraped data to console and json file in corresponding domain folder
 *
 * @type {Promise}
 */
var body = makeRequest(); //sets the first promise in the sequence
body.then(function (body) {
    words = getWords(body);
    bodyG = body;
    return loadToCheerio(body);
}).then(function ($) {
    homePageTitle = $('title').text();
    return findHyperLinks($);
}).then(function (links) {
    findPhoneNumber(links);
    findEmails(bodyG);
    hyperLinks = links;
    return findOnGoogleMaps(domain);
}).then(function (){
}).then(function () {
    scrapeObj = {
        'website': domain,
        'URL': 'http://www.' + domain,
        'homepageName': homePageTitle,
        'companyName': companyName,
        'companyRating': companyRating.toString(),
        'openNow': googleMapsOpenNow.toString(),
        'address': address,
        'emails': finalEmails,
        'telephone': finalPhoneNumbers,
    };
    var json = JSON.stringify(scrapeObj, null, 4);
    var domainS = domain.split('.')[0]; // Take away the domain suffix, so domain name can be used as filename
    fs.writeFile(siteDir + domainS + '.json', json, 'utf8');
    console.dir(scrapeObj, { // Display json in console
        depth: null,
        colors: true,
    });
}).catch(function (error) {
    console.log(error);
});

/**
 * Grabs the domain part of any given email by splitting it at the "@" symbol
 * Also creates a directory for the given domain if one does not already exist
 *
 * @param ie - Email entered in arguments
 * @returns {*} - Domain
 */
function grabDomain (ie) {
    domain = ie.split('@')[1];
    siteDir = './scraped sites/' + domain + '/';
    if (!fs.existsSync(siteDir)) {
        fs.mkdirSync(siteDir);
    }
    return domain;
}

/**
 * Makes the request to the domain to get the body
 *
 * @returns {Promise}
 * @resolve {variable} - Resolves if body of site is obtained successfully
 * @reject {err} - Rejects promise if error is given
 */
function makeRequest () {
    return new Promise(function (resolve, reject) {
        request({
            'rejectUnauthorized': false,
            'url': 'http://www.' + grabDomain(inputEmail),
            'method': 'GET',
        }, function (error, response, body) {
            if (!error) {
                if (response.statusCode === 200) {
                    console.log('StatusCode OK');
                    resolve(body);
                }
                else {
                    console.log('Bad response code: ' + response.statusCode);
                    reject(response.statusCode);
                }
            }
            else {
                console.log(error);
                console.log('Unable to scrape given domain, exiting program (see error above)');
                process.exit();
            }
        });
    });
}

/**
 * Loads the body generated by the request into Cheerio
 *
 * @param body - The HTML body returned from the original request
 * @returns {Promise}
 * @resolve {variable} - Cheerio loaded HTML body
 */
function loadToCheerio (body) {
    return new Promise(function (resolve, reject) {
        var $ = cheerio.load(body, {
            normalizeWhitespace: true,
            xmlMode: true,
            decodeEntities: true,
            withDomLvl1: true,
        });
        resolve($);
    });
}

/**
 * Checks if the variable found already exists in a given array
 *
 * @param entry - Proposed variable
 * @param array - Array to check for duplicate in
 * @returns {boolean} - Returns true if duplicate found
 */
function checkDuplicate (entry, array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] == entry) {
            return true;
        }
    }
    return false;
}

/**
 * Finds all phone numbers on websites using two methods:
 * Method 1 - Searches links array for hyperlinks containing "tel:"
 * Method 2 - Uses Knwl to find all international phone numbers on website
 *
 * Using both methods has a higher success rate than using one or the other
 *
 * @param links
 */
function findPhoneNumber (links) {
    links.forEach(function (link) { // Method 1
        if (link.indexOf('tel:') !== -1) {
            link = link.split(':')[1];
            link = link.replace(/\s/g, '');
            if (link.charAt(0) == 0) {
                link = link.replace(link.charAt(0), '+44');
            }
            if (link.length > 5) {
                if (!checkDuplicate(link, finalPhoneNumbers)) {
                    finalPhoneNumbers.push(link);
                }
            }
        }
    });
    var phones = knwlInstance.get('internationalPhones'); // Method 2
    phones.forEach(function (phone) {
        if (phone) {
            if (!checkDuplicate(phone['number'], finalPhoneNumbers)) {
                finalPhoneNumbers.push(phone['number']);
            }
        }
    });
}

/**
 * Grabs all emails on the website using Knwl and pushes them to the finalEmails array
 *
 * @returns {boolean} - True if emails are found, false if not
 */
function findEmails () {
    var emails = knwlInstance.get('emails');
    var anyEmails = false;
    emails.forEach(function (email) {
        if (email) {
            if (!checkDuplicate(email['address'], finalEmails)) {
                finalEmails.push(email['address']);
            }
            anyEmails = true;
        }
    });
    return anyEmails;
}

/**
 * Grabs all hyperlinks on the website using cheerios stored HREF tags
 *
 * @param $ - Cheerio API loaded HTML body
 * @returns {Promise}
 * @resolve {array} - Resolves and returns array of hyperlinks
 */
function findHyperLinks ($) {
    return new Promise(function (resolve, reject) {
        anchors = $('a'); //Grabs the anchors from cheerio
        links = [];
        $(anchors).each(function (i, anchor) { //For each anchor on the website grab the href.
            links.push($(anchor).attr('href'));
        });
        resolve(links);
    });
}

/**
 * Uses Knwl to grab all words on the given website
 *
 * @param body - The HTML body returned from the original request
 */
function getWords (body) {
    knwlInstance.init(body);
    return (knwlInstance.words.get('linkWordsCasesensitive'));
}

/**
 * This function uses the google maps API to find information about the company
 * who owns the given domain the following information is pulled from the API:
 *
 * Company Name
 * Formatted address
 * Company Rating
 * If they are open or not right now
 *
 * @param domain
 * @returns {Promise}
 * @resolve {string} - Resolves formatted address from Google Maps API
 * @reject {error} - Rejected if an error occurs when accessing Google API
 */
function findOnGoogleMaps (domain) {
    return new Promise(function (resolve, reject) {
        place = googleMapsClient.places({
            query: domain,
            language: 'en',
            location: 'United Kingdom',
        }, function (err, response) {
            if (!err) {
                googleMapsResults = response.json.results[0];
                address = response.json.results[0].formatted_address;
                companyName = response.json.results[0].name;
                companyRating = response.json.results[0].rating;
                googleMapsOpenNow = response.json.results[0].opening_hours.open_now;
                resolve(address);
            }else{
                console.log(err);
                reject(err);
            }
        });

    });
}

