var configuration = require('./config/config.json');
var mongoose = require('mongoose');
var fs = require('fs');

console.log('Connecting to the database');
mongoose.connect(configuration.db);
var db = mongoose.connection;



db.once('open', function() {
  var Tweet = require('./models/tweet.js');

  /*Tweet
    .find({
      $where: 'this.date.toJSON().slice(0,10)=="2014-10-10"'
    })
    .exec(function(err, results) {

      fs.writeFileSync('tweet20141010.json', JSON.stringify(results, '\n', true));
    });*/
  /*Tweet.aggregate({
      $group: {
        _id: {
          year: {
            $year: "$date"
          },
          month: {
            $month: "$date"
          },
          day: {
            $dayOfMonth: "$date"
          },
        },
        count: {
          $sum: 1
        }
      }
    })
    .exec(function(err, results) {


      var count = {};

      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var date = r._id.year + '-' + r._id.month + '-' + r._id.day;

        console.log(date);

        count[date] = r.count;

      }

      fs.writeFileSync('dayStats.json', JSON.stringify(count, '\t', true));
    });*/

  /*Tweet.aggregate({
    $group: {
      _id: '$userId',
      count: {
        $sum: 1
      }
    }
  }, function(err, results) {

    var count = {};

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var user = r._id;


      count[user] = r.count;

    }

    fs.writeFileSync('userStats.json', JSON.stringify(count, '\t', true));

  });*/



  var tweets = [];
  Tweet
    .find({})
    .exec(function(err, results) {

      for (var i = 0; i < results.length; i++) {
        var tweet = results[i];


        var text = tweet.text.toLowerCase();

        if (text.search('accademia') !== -1) {
          tweets.push(tweet);
        }
      }

      fs.writeFileSync('accademia.json', JSON.stringify(tweets, '\t', true));
    });
});