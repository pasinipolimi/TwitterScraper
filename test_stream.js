'use strict';

let stream = require( 'stream' );
let debug = require( 'debug' )( 'TestTweet' );
let StreamScraper = require( './' ).StreamScraper;


let num = 0;
// Support fn
function doSomething( id, enc, cb ) {
  num++;
  debug( 'Got %d ids: %s', num, id );
  cb();
}


// Main
let scraper = new StreamScraper( {
  hash: 'yourexpo2015',
} );

let tr = new stream.Transform( {
  objectMode: true,
  transform: doSomething
} )

scraper.pipe( tr );
scraper.on( 'end', ()=> debug( 'DONE' ) );
scraper.on( 'error', debug );

scraper.start();
