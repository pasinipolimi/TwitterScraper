  var mongoose = require('mongoose');

  var TweetSchema = new mongoose.Schema({

    tweetId: String,
    text: String,
    location: String,
    timestamp: String,
    userId: String,
    date: Date

  });

  console.log('Loading the schema');

  var Tweet = mongoose.model('tweet', TweetSchema);

  exports = module.exports = Tweet;