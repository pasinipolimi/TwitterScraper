'use strict';

let co = require( 'co' );
let Promise = require( 'bluebird' );
let MongoClient = require( 'mongodb' ).MongoClient;
let Scraper = require( './' );
let db;

const DB_URL = 'mongodb://localhost:27017';
const DB_NAME = 'Sample';
const COLLECTION = 'tweets';


// Support fn
function dbOpen() {
  let dbUrl = DB_URL+'/'+DB_NAME;
  let connectionOptions = {
    promiseLibrary: Promise,
  };
  return MongoClient
  .connect( dbUrl, connectionOptions )
  .then( ( myDB ) => db = myDB )
  ;
}
function dbClose() {
  return db.close();
}
function save( tweets ) {
  let coll = db.collection( COLLECTION );
  return coll.insertMany( tweets )
}


// Main
co( function* () {
  yield dbOpen();

  let scraper = new Scraper( {
    query: {
      hash: 'yourexpo2015',
    },
    process: save,
  } );
  yield scraper.getAllTweets();

  yield dbClose();
} )
.catch( function( err ) {
  console.error( 'Cannot use scraper', err.stack );
  return db.close();
} );