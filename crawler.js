var phantom = require('phantom');
var cheerio = require('cheerio');
var async = require('async');
var mongoose = require('mongoose');
var _ = require("underscore");
var querystring = require("querystring");
var fs = require('fs');

var configuration = require('./config/config.json');
var idx = parseInt(fs.readFileSync('./status.idx'));

var saveTweets = function(tweets, callback) {

  var Tweet = db.model('tweet');

  console.log('Saving ' + tweets.length + ' tweets');

  return Tweet.create(tweets, callback);
};

var parseHtml = function(html) {
  var $ = cheerio.load(html);

  var $tweets = $("#stream-items-id .tweet");

  console.log('Retrieved ' + $tweets.length + ' tweets');

  var tweets = _.map($tweets, function(element) {

    var $tweet = $(element);

    // Retrieving the id
    var id = $tweet.attr('data-tweet-id');

    // Retrieving the text
    var text = $tweet.find('.tweet-text').text();

    // Retrieving the account
    var $account = $tweet.find('.account-group');
    var userId = $account.attr('data-user-id');

    // Retrieving the account
    var $timestamp = $tweet.find('._timestamp');
    var timestamp = $timestamp.attr('data-time');

    // Retrieving the geolocalization
    var $geo = $tweet.find('.ProfileTweet-geo');
    var geo;
    if ($geo.length !== 0) {
      geo = $geo.attr('data-original-title') || $geo.attr('title') || $geo.find('.u-hiddenVisually').text();
    }

    return {
      tweetId: id,
      text: text,
      userId: userId,
      timestamp: timestamp,
      location: geo
    };
  });

  return tweets;
};

var queryWeb = function(url, callback) {
  console.log('querying the web');

  phantom.create(function(ph) {
    console.log('Initalizing phantom');
    ph.createPage(function(page) {
      console.log('Creating the page');

      page.onConsoleMessage = function(msg) {
        console.log(msg);
      };

      page.open(url, function(status) {
        console.log("Opened page? ", status);

        var interval = setInterval(function() {

          page.evaluate(function() {
            window.document.body.scrollTop = window.document.body.scrollTop + 10000;

            var count = $("#stream-items-id .tweet").length;
            console.log(count);
            var endTag = $('.stream-end');
            var end = false;
            if (endTag) {
              end = (endTag.css('display') !== 'none');
            }
            var html = document.body.innerHTML;

            return {
              count: count,
              html: html,
              end: end
            };
          }, function(result) {
            if (result.end) {
              console.log('Finished scrolling');
              clearInterval(interval);
              console.log('Exiting from phantom');
              ph.exit();

              var tweets = parseHtml(result.html);
              return callback(null, tweets);
            } else {
              console.log('Need to go on');
            }
          });

        }, 1500); // Number of milliseconds to wait between scrolls


      });
    });
  });
};

var startScraping = function(dates, callback) {

  var url = 'https://twitter.com/search?';

  var query = {
    f: 'realtime',
    q: 'Aleksandr Antonenko since:' + dates.since + ' until:' + dates.until,
    src: 'sprv'
  };

  url = url + querystring.stringify(query);

  console.log('Scraping the url');
  console.log(url);

  var steps = [_.partial(queryWeb, url), saveTweets];
  return async.waterfall(steps, function(err) {
    if (err) console.log(err);

    console.log('done single iteration');
    return updateStatus(callback);
  });
};

var updateStatus = function(callback) {
  idx++;
  return fs.writeFile('status.idx', idx, callback);
};


console.log('Connecting to the database');
mongoose.connect(configuration.db);
var db = mongoose.connection;


db.once('open', function() {
  var Tweet = require('./models/tweet.js');

  var dates = require('./dates3.json');

  dates.splice(0, idx);
  async.eachSeries(dates, startScraping, function() {
    console.log('done all');
  });


});