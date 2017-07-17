/**
 * Created by Shane on 14/07/2017.
 */

// Libraries/Includes
var Knwl = require('knwl.js');
var cheerio = require('cheerio');
var http = require('http');
var request = require('request');

// Variables
var hostname = '127.0.0.1';
var port = 3000;
var inputEmail = process.argv[2]; // Input email is taken from commandline arguments
var domain;
var knwlInstance = new Knwl('english');
var finalPhoneNumbers = [];

//Load Knwl plugins
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));
knwlInstance.register('phones', require('knwl.js/default_plugins/phones'));

// Function to grab the domain from the email.
function grabDomain(ie){
	domain = ie.split("@")[1]; //Splits the email at the @ symbol taking the second part of the split as the domain.
	return domain;
}

//Checks if user inputted an email address in arguments
if(process.argv[2] != null) {
	domain = grabDomain(inputEmail); //Will process the email domain only if an email is given
}else{
	console.log("Missing email arguments please refer to README.MD");
	process.exit(); //Stops the program due to lack of email address in arguments
}

// Makes request to web page returning any errors/ responses and the body of the website.
function makeRequest(){

}

request("http://www." + grabDomain(inputEmail), function (error, response, body) {
	if (!error) {
		if(response.statusCode === 200) { // 200 = OK response
			var $ = cheerio.load(body, { //Using cheerio to store the pages HTML in a variable
                normalizeWhitespace: true,
                xmlMode: true,
                decodeEntities: true,
                withDomLvl1: true
            });
            console.log("Page title: " + $('title').text()); //Report the pages title to user
            links = $('a'); //jquery get all hyperlinks
            $(links).each(function(i, link){ //For each hyperlink on the website grab the href.
                findPhoneNumber($(link).text() + ':\n  ' + $(link).attr('href'));//Send href to findPhoneNumber()
            });
		}else{
			console.log("Bad response code: " + response.statusCode); //Returns the response code if connecting fails
		}

	}else{
		console.log(error); //Displays any error messages returned by the request
	}

});

RegExp.escape = function(value) {
   return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/gi, "\\$&");
};

function cleanArray(actual) { //A method to delete duplicate entries from an array
    var newArray = new Array();
    for (var i = 0; i < actual.length; i++) {
        if (actual[i]) {
            newArray.push(actual[i]);
        }
    }
    return newArray;
}

function findPhoneNumber(link){ //A method to find phone numbers on websites using tel: hyperlinks
	if(link.indexOf("tel:") !== -1){
		var finalLink = link.split("\n")[1].trim();
		if(finalLink.length > 5) {
            console.log("FINAL PHONENUMBER: " + finalLink);
			finalPhoneNumbers.push(finalLink);
            console.log(finalPhoneNumbers);
        }
	}
}

