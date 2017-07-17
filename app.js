/**
 * Created by Shane on 14/07/2017.
 */
// Libraries/Includes
var Knwl = require('knwl.js');
var cheerio = require('cheerio');
var http = require('http');
var request = require('request');
var fs = require('fs');

// Variables
var inputEmail = process.argv[2]; // Input email is taken from commandline arguments
var domain;
var knwlInstance = new Knwl('english');
var siteDir;
var words;
// var phoneNumberRegex = /^(((\+44)? ?(\(0\))? ?)|(0))( ?[0-9]{3,4}){3}$/
// var postCodeRegex = /^['|"]{0,1}[A-Za-z]{1,2}[0-9]{1,2}[ \n]{0,1}[\n ]{0,1}?[0-9][A-Za-z]{2}['|"]{0,1}$/
var bodyG; //Global body variable
var finalEmails = []; //Final processed emails
var finalPhoneNumbers = []; //Final processed phonenumbers
var scrapeObj = {} //Final object storing scraped data
var homePageTitle; //Title of home page
var hyperLinks = []; //Array of hyperlinks on the domain


//Load Knwl plugins
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));
knwlInstance.register('internationalPhones', require('knwl.js/experimental_plugins/internationalPhones'));
knwlInstance.register('places', require('knwl.js/default_plugins/places'));

//Checks if user inputted an email address in arguments
if (process.argv[2] != null) {
  domain = grabDomain(inputEmail); //Will process the email domain only if an email is given
} else {
  console.log("Missing email arguments please refer to README.MD");
  process.exit(); //Stops the program due to lack of email address in arguments
}

//Main Promise sequence
var body = makeRequest(); //sets the first promise in the sequence
body.then(function(body) { // executes first promise returning body (HTML body)
  words = getWords(body); // Uses getWords() to grab all the words from the body
  bodyG = body; // Saves the body as a global variable
  return loadToCheerio(body); //Loads the next promise
}).then(function($) { // Uses the loadToCheerio() function to load the body into the cheerio api
  homePageTitle = $('title').text(); //Save HTML title to variable
  return findHyperLinks($); //Loads the next promise
}).then(function(links) { //Executes findHyperLinks() returning all HREF's as links[]
  findPhoneNumber(links); //sends links[] to findphonenumber
  findEmails(bodyG); //sends global body variable to the findEmails() function
  hyperLinks = links; //Saves links to global variable
}).then(function() {
  //Executes once emails and phone numbers have been stored
  scrapeObj = {
    "website": domain, //Saves scraped data to an object
    "URL": "http://www." + domain,
    "homepageName": homePageTitle,
    "emails": finalEmails,
    "telephone": finalPhoneNumbers
  };
  var json = JSON.stringify(scrapeObj, null, 4); //Convert object to string
  var domainS = domain.split(".")[0]; // Take away the domain suffix, so domain name can be used as filename
  fs.writeFile(siteDir + domainS + ".json", json, 'utf8'); // Write json to file domain.json
  console.dir(scrapeObj, { // Display json in console
    depth: null,
    colors: true
  })
}).catch(function(error) { //Catch any errors produced by promises
  console.log(error); //Log any errors caught
});

// Function to grab the domain from the email.
function grabDomain(ie) {
  domain = ie.split("@")[1]; //Splits the email at the @ symbol taking the second part of the split as the domain.
  siteDir = './scraped sites/' + domain + "/"; //Set directory for individual domains
  if (!fs.existsSync(siteDir)) { //Check if directory already exists
    fs.mkdirSync(siteDir); //Make the directory
  }
  return domain; //Returns the grabbed domain.
}

function makeRequest() {
  return new Promise(function(resolve, reject) {
    request({ //Make request to the website
      "rejectUnauthorized": false,
      "url": "http://www." + grabDomain(inputEmail), //Use grabDomain() to get the domain from email
      "method": "GET" //Use GET method to retrieve site data
    }, function(error, response, body) {
      if (!error) {
        if (response.statusCode === 200) { //Status code 200 signifies success
          console.log("StatusCode OK");
          resolve(body); //Resolves the promise, sending the data back
        } else {
          console.log("Bad response code: " + response.statusCode); //Returns the response code if connecting fails
          reject(response.statusCode); //Rejects the promise, sends back the error code
        }
      } else {
        console.log(error); //Displays any error messages returned by the request
        console.log("Unable to scrape given domain, exiting program (see error above)")
        process.exit();
      }
    });
  });
}

function loadToCheerio(body) {
  return new Promise(function(resolve, reject) {
    var $ = cheerio.load(body, { //Using cheerio to store the pages HTML in a variable
      normalizeWhitespace: true,
      xmlMode: true,
      decodeEntities: true,
      withDomLvl1: true
    });
    resolve($); //Returns cheerio variable to promise chain
  });
}

function checkDuplicate(entry, array) { //Checks if a value already exists within an array
  for (var i = 0; i < array.length; i++) {
    if (array[i] == entry) {
      return true;
    }
  }
  return false;
}

function findPhoneNumber(links) {
  // console.log(links);
  links.forEach(function(link) { //A method to find phone numbers on websites using tel: hyperlinks
    if (link.indexOf("tel:") !== -1) {
      link = link.split(":")[1] //Splits string after : to get the phone number
      link = link.replace(/\s/g, ''); //Removes spaces in phone number
      if (link.charAt(0) == 0) { //Replaces first 0 with country code
        link = link.replace(link.charAt(0), "+44"); // UK country code +44
      }
      if (link.length > 5) { //Only pushes to array if phoneumber more than 5 digits
        // console.log("FINAL PHONENUMBER: " + link);
        if (!checkDuplicate(link, finalPhoneNumbers)) {
          finalPhoneNumbers.push(link);
        }
      }
    }
  });
  var phones = knwlInstance.get('internationalPhones'); //Uses Knwl to get phone numbers not listed as hyperlinks
  phones.forEach(function(phone) {
    if (phone) {
      if (!checkDuplicate(phone['number'], finalPhoneNumbers)) { //Checks if each number is a duplicate
        finalPhoneNumbers.push(phone['number']); //Pushes to finalPhoneNumbers array
      }
    }
  });
}

function findEmails() { //Uses Knwl to retrieve emails from the page
  var emails = knwlInstance.get('emails');
  var anyEmails = false; //Variable to declare if Knwl was able to find any emails or not
  emails.forEach(function(email) {
    if (email) {
      if (!checkDuplicate(email['address'], finalEmails)) { //Checks array for duplicate entries
        finalEmails.push(email['address']); //If no duplicates, pushes email to array
      }
      anyEmails = true; // Sets emails found variable to true
    }
  });
  if (anyEmails)
    return true; // Returns true if emails were found
  else
    return false; // Returns false if no emails were found
}

function findHyperLinks($) { //function that grabs all hyperlinks in HREF tags
  return new Promise(function(resolve, reject) {
    anchors = $('a'); //grabs the anchors from cheerio
    links = [];
    $(anchors).each(function(i, anchor) { //For each hyperlink on the website grab the href.
      links.push($(anchor).attr('href')); //Send href to findPhoneNumber()
    });
    resolve(links); //Returns links found to the promise chain
  });
}

function getWords(body) { //Uses Knwl to grab all words on the website
  knwlInstance.init(body);
  return (knwlInstance.words.get('linkWordsCasesensitive'));
}