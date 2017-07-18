# Dynamic Web Scraper
> Scrapes a Website that is taken from an inputted emails domain.

This project uses ECMAScript 6(2015)

This is a NodeJS project that is designed to get as much data as possible from an email address.
It will grab the domain from an email address and visit the corresponding website. From the website
it will scrape phone numbers and email addresses with a fantastic success rate. Then it will use
GoogleMaps API to find out much more about the company that owns the website. It grabs the address,
the company name, company GMaps rating and whether or not the company is currently open. All scraped
data is saved in a json file, which is also passed to a HTML5 table, within a webapp, hosted on localhost:8000,
to make the data much more readable.

## Screenshots
### Webapp view
![](webapp.PNG)

### CLI view
![](cli.PNG)

## Installation

Windows & OS X & Linux:

```sh
git pull https://github.com/Crithane/dynamicWebScraper.git
npm install
```

## Usage example

```sh
node app.js johndoe@example.com
```

## Features
* Dynamically scrapes any domain's website from an inputted email address
* Grabs all phone numbers from website
* Grabs all email addresses from website
* Utilizes GMaps API to grab companies address
* Utilizes GMaps API to grab companies name
* Utilizes GMaps API to grab companies rating
* Utilizes GMaps API to see if company is open at the time of the request
* Saves all scraped data to /domain/domain.json
* Displays data in a table on a webapp hosted on localhost:8000

## Dependencies
* NodeJS - https://nodejs.org/en/
* npm - https://github.com/npm/npm
* express - https://github.com/expressjs/express
* express-handlebars - https://github.com/ericf/express-handlebars
* cheerio - https://github.com/cheeriojs/cheerio
* knwl - https://github.com/loadfive/Knwl.js/
* google-maps-services-js - https://github.com/googlemaps/google-maps-services-js

## Authors

* **Shane Critchley-Kenyon**


<!-- Markdown link & img dfn's -->
[npm-image]: https://img.shields.io/npm/v/datadog-metrics.svg?style=flat-square
[npm-url]: https://npmjs.org/package/datadog-metrics
[npm-downloads]: https://img.shields.io/npm/dm/datadog-metrics.svg?style=flat-square
[travis-image]: https://img.shields.io/travis/dbader/node-datadog-metrics/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/dbader/node-datadog-metrics
[wiki]: https://github.com/yourname/yourproject/wiki
