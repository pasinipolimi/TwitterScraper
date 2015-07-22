var fs = require('fs');
var cheerio = require('cheerio');
var _ = require('underscore');
var mongoose = require('mongoose');

var configuration = require('./config/config.json');

var parseHtml = function(html) {
  var $ = cheerio.load(html);

  var $tweets = $("#stream-items-id .tweet");

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

var saveTweets = function(tweets, callback) {

  var Tweet = db.model('tweet');

  console.log('Saving ' + tweets.length + ' tweets');

  return Tweet.create(tweets, callback);
};


console.log('Connecting to the database');
mongoose.connect(configuration.db);
var db = mongoose.connection;


db.once('open', function() {
  var Tweet = require('./models/tweet.js');

  var page = fs.readFileSync('turandot20140501.html').toString();
  var tweets = parseHtml(page);

  saveTweets(tweets, function(err) {
    if (err) return console.log(err);

    return console.log('done');
  });

});