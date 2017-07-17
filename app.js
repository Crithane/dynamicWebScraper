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
var postCodeRegex = /^['|"]{0,1}[A-Za-z]{1,2}[0-9]{1,2}[ \n]{0,1}[\n ]{0,1}?[0-9][A-Za-z]{2}['|"]{0,1}$/
var bodyG; //Global body variable
var finalEmails = []; //Final processed emails
var finalPhoneNumbers = []; //Final processed phonenumbers
var scrapeObj = {} //Final object storing scraped data
var homePageTitle; //Title of home page


//Load Knwl plugins
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));
knwlInstance.register('internationalPhones', require('knwl.js/experimental_plugins/internationalPhones'));
knwlInstance.register('places', require('knwl.js/default_plugins/places'));

//Checks if user inputted an email address in arguments
if(process.argv[2] != null) {
	domain = grabDomain(inputEmail); //Will process the email domain only if an email is given
}else{
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
}).then(function(links){ //Executes findHyperLinks() returning all HREF's as links[]
	findPhoneNumber(links); //sends links[] to findphonenumber
	findEmails(bodyG); //sends global body variable to the findEmails() function
}).then(function() {
	//Executes once emails and phone numbers have been stored
	scrapeObj = {"website": domain, //Saves scraped data to an object
		"URL": "http://www." + domain,
		"homepageName": homePageTitle,
		"emails" : finalEmails,
		"telephone" : finalPhoneNumbers};
	var json = JSON.stringify(scrapeObj, null, 4); //Convert object to string
	var domainS = domain.split(".")[0]; // Take away the domain suffix, so domain name can be used as filename
	fs.writeFile(siteDir + domainS + ".json", json, 'utf8'); // Write json to file domain.json
	console.dir(scrapeObj, {depth: null, colors: true}) // Display json in console
}).catch(function(error){ //Catch any errors produced by promises
	console.log(error); //Log any errors caught
});

// Function to grab the domain from the email.
function grabDomain(ie){
	domain = ie.split("@")[1]; //Splits the email at the @ symbol taking the second part of the split as the domain.
  siteDir = './scraped sites/' + domain + "/"; //Set directory for individual domains
  if (!fs.existsSync(siteDir)){ //Check if directory already exists
    fs.mkdirSync(siteDir); //Make the directory
  }
	return domain; //Returns the grabbed domain.
}

function makeRequest() {
	return new Promise(function(resolve, reject) {
	request({
		"rejectUnauthorized": false,
		"url": "http://www." + grabDomain(inputEmail),
		"method": "GET"
	}, function (error, response, body) {
		if (!error) {
			if (response.statusCode === 200) {
				console.log("StatusCode OK");
				resolve(body); //Resolves the promise, sending the data back
			} else {
				console.log("Bad response code: " + response.statusCode);//Returns the response code if connecting fails
				reject(response.statusCode); //Rejects the promise, sends back the error code
			}
		} else {
			console.log(error);//Displays any error messages returned by the request
			console.log("Unable to scrape given domain, exiting program (see error above)")
			process.exit();
		}
	});
  });
}

function loadToCheerio(body){
	return new Promise(function(resolve, reject) {
		var $ = cheerio.load(body, { //Using cheerio to store the pages HTML in a variable
			normalizeWhitespace: true,
			xmlMode: true,
			decodeEntities: true,
			withDomLvl1: true
		});
		resolve($);
	});
}

function checkDuplicate(entry, array){
	for (var i = 0; i < array.length; i++) {
		if (array[i] == entry) {
			return true;
		}
	}
	return false;
}

function findPostCode(word){
	if(word.match(postCodeRegex)){
		console.log("Found a post code " + word);
	}else {
    // console.log("no postcode")
  }
}

function findPhoneNumber(links){//A method to find phone numbers on websites using tel: hyperlinks
	// console.log(links);
  links.forEach(function(link){
		if(link.indexOf("tel:") !== -1){
			// var finalLink = link.split("\n")[1].trim();
			link = link.split(":")[1]
			link = link.replace(/\s/g, '');
			if(link.charAt(0) == 0){
				link = link.replace(link.charAt(0), "+44");
			}
			if(link.length > 5) {
				// console.log("FINAL PHONENUMBER: " + link);
				if (!checkDuplicate(link, finalPhoneNumbers)) {
					finalPhoneNumbers.push(link);
				}
			}
		}
  });
  var phones = knwlInstance.get('internationalPhones');
  // console.log(finalPhoneNumbers);
  phones.forEach(function(phone){
  	if(phone) {
		  // console.log("Phone number found " + phone['number']);
		  if(!checkDuplicate(phone['number'], finalPhoneNumbers)){
			  finalPhoneNumbers.push(phone['number']);
		  }
	  }
  });
}

function findEmails(){
  var emails = knwlInstance.get('emails');
  var anyEmails = false;
  // var email = emails[0];
  emails.forEach(function(email){
    if(email) {
    	// console.log("Email found " + email['address']);
    	if(!checkDuplicate(email['address'], finalEmails)){
        finalEmails.push(email['address']);
      }
      anyEmails = true;
    }
  });
  if(anyEmails)
  	return true;
  else
  	return false;
}

function findHyperLinks($){
  return new Promise(function(resolve, reject) {
    anchors = $('a');
    links = [];
    $(anchors).each(function(i, anchor){ //For each hyperlink on the website grab the href.
      links.push($(anchor).attr('href'));//Send href to findPhoneNumber()
    });
    resolve(links);
  });
}

function getWords(body){
    knwlInstance.init(body);
    return(knwlInstance.words.get('linkWordsCasesensitive'));
}



