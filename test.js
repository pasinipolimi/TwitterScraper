'use strict';

let co = require( 'co' );
let Scraper = require( './' );
let db = require( './lib/db' );
// words words1 "phrase" any OR any1 -none -none1 #hash OR #hash1 lang:en from:from OR from:from1 to:to OR to:to1 @mention OR @mention1 since:2015-08-05 until:2015-09-01

let scraper = new Scraper( {
  query: {
    // from: 'RiccardoVolo',
    hash: 'yourexpo2015',
    // since: new Date( Date.UTC( 1985, 9, 5 ) ),
    // until: new Date(),
  },
} );


co( function* () {
  yield db.open();

  yield scraper.getAllTweets();

  yield db.close();
} )
.catch( function( err ) {
  console.error( 'Cannot use scraper', err.stack );
  return db.close();
} );