'use strict';

// Load system modules
var path = require( 'path' );
var url = require( 'url' );
var fs = require( 'fs' );

// Load modules
var _ = require( 'lodash' );
var jsdom = require( 'jsdom' );
var cheerio = require( 'cheerio' );
var Promise = require( 'bluebird' );
var request = require( 'request' );

// Load my modules
var composeQuery = require( './twitter-query' );

// Constant declaration
var TW_BASE_URL = 'twitter.com';
var TW_QUERY_PATH = 'search';
var TWEETS_SELECTOR = '#stream-items-id > .stream-item';

// Module variables declaration

// Module functions declaration

function Scraper( options ) {
  console.log( 'Creating' );

  this.query = composeQuery( options.query );

  console.log( 'Query is: "%s"', this.query );
}
Scraper.prototype.getTwitterUrl = function() {
  console.log( 'Creating full twitter url' );
  var qs = {
    f: 'tweets',
    q: this.query,
  };

  var fullUrl = url.format( {
    protocol: 'https',
    host: TW_BASE_URL,
    pathname: TW_QUERY_PATH,
    query: qs,
  } );
  console.log( 'Full url: %s', fullUrl );

  return fullUrl;
}
Scraper.prototype.getUrl = function( fullUrl ) {
  console.log( 'Get page:', fullUrl );

  return request
  .getAsync( fullUrl )
  .spread( function( resp, markup ) {
    return markup;
  } )
  .catch( function( err ) {
    console.error( 'Cannot getUrl', err.stack );
    throw err.cause || err;
  } );
}
Scraper.prototype.parsePage = function( markup ) {
  console.log( 'Parsing page' );

  var virtualConsole = jsdom.createVirtualConsole().sendTo( console );
  virtualConsole.on( 'jsdomError', function( error ) {
    console.error( 'JSDOM error', error.stack, error.detail );
  } );

  // Init JSDOM
  var window = jsdom.jsdom( markup, {
    virtualConsole: virtualConsole,
    features: {
      FetchExternalResources: [ 'script' ],
      ProcessExternalResources: [ 'script' ],
    },
  } ).defaultView;

  window.navigator.language = 'en';

  window.addEventListener( 'error', function( event ) {
    console.error( 'Win event', event.error );
  } );

  var promise = new Promise( function( res ) {
    window.addEventListener( 'load', function( event ) {
      console.error( 'Load event' );
      res( window.$, window );
    } );
  } );

  return promise
  .catch( function( err ) {
    console.error( 'Cannot parse page' );
    throw new Error( 'Cannot parse page' );
  } );
}
Scraper.prototype.getMoreData = function( $, window ) {
  console.log( 'Get more data' );

  $( window ).trigger( 'uiNearTheBottom' );


  // DOMSubtreeModified


  return Promise.delay( 5000 );
}
Scraper.prototype.getTweetsFromDocument = function( $ ) {
  console.log( 'Retrieving tweets from the page' );

  var $tweets = $( TWEETS_SELECTOR );

  var ids = $tweets.map( function( i, element ) {
    return $( element ).data( 'item-id' )
  } ).get();

  return ids;
}
Scraper.prototype.run = function( cb ) {
  console.log( 'Running' );

  return Promise
  .resolve()
  .bind( this )
  .then( this.getTwitterUrl )
  .then( this.getUrl )
  .then( this.parsePage )
  .tap( this.getMoreData )
  .then( this.getTweetsFromDocument )
  // .then( function() { return []; } )
  .nodeify( cb )
  ;
};
function go( options, cb ) {
  var scraper = new Scraper( options );
  return scraper.run( cb );
}

// Module initialization (at first load)
jsdom = Promise.promisifyAll( jsdom );
request = Promise.promisifyAll( request );
// Module exports

module.exports.Scraper = Scraper;
module.exports.go = go;