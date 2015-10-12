'use strict';

// Load system modules
let url = require( 'url' );

// Load modules
let _ = require( 'lodash' );
let cheerio = require( 'cheerio' );
let Promise = require( 'bluebird' );
let request = require( 'request' );
let debug = require( 'debug' )( 'Scraper' );

// Load my modules
let composeQuery = require( './twitter-query' );

// Constant declaration
const TW_BASE_URL = 'twitter.com';
const TW_QUERY_PATH = 'search';
const SESSION_CONTAINER = '.stream-container[data-max-position]';
const TWEETS_SELECTOR = '.stream-item[data-item-id]';


// Module variables declaration

// Module functions declaration

// Module class declaration
class TwitterScraper {
  constructor( options ) {
    debug( 'Creating scraper' );
    this.query = composeQuery( options.query );
    this.processFn = options.process;
    debug( 'Query is: "%s"', this.query );
  }

  getTwitterUrl( max ) {
    debug( 'Creating full twitter url' );

    let qs = {
      /* eslint-disable camelcase */
      f: 'tweets',
      vertical: 'news',
      include_entities: 1,
      max_position: max,
      q: this.query,
      /* eslint-enable camelcase */
    };

    let fullPath = TW_QUERY_PATH;
    if( max ) {
      fullPath = 'i/search/timeline';
    }

    let fullUrl = url.format( {
      protocol: 'https',
      host: TW_BASE_URL,
      pathname: fullPath,
      query: qs,
    } );

    return fullUrl;
  }

  * getPage( fullUrl ) {
    // debug( 'Get page: %s', fullUrl );

    let result = yield request.getAsync( {
      method: 'GET',
      url: fullUrl,
      json: true,
    } );
    let body = result[1];

    if( typeof body==='string' ) {
      return body;
    } else {
      return body.items_html;
    }

  }

  getSession( page ) {
    let $ = cheerio.load( page );

    let maxPosition = $( SESSION_CONTAINER ).data( 'max-position' );

    if( maxPosition ) {
      return maxPosition.split( '-' )[3];
    }
  }
  getTweets( html ) {
    let $ = cheerio.load( html );
    let selection = $( TWEETS_SELECTOR );
    let ids = selection.map( function( i, div ) {
      let id = $( div ).data( 'item-id' );
      return {
        id,
      };
    } ).get();

    return ids;
  }

  * getAllTweets() {
    let firstPage = yield this.getPage( this.getTwitterUrl() );
    let session = this.getSession( firstPage );
    let first, last;

    while( true ) {
      try {
        let maxPosition = null;
        if( first && last ) {
          maxPosition = `TWEET-${last}-${first}-${session}`;
        }

        debug( 'Max position is: "%s"', maxPosition );

        let page = yield this.getPage( this.getTwitterUrl( maxPosition ) );
        let tweets = this.getTweets( page );
        debug( 'Got %d tweets', tweets.length );

        if( tweets.length===0 ) {
          break;
        }

        if( _.isFunction( this.processFn ) ) {
          yield this.processFn( tweets );
        }

        first = _.first( tweets ).id;
        last = _.last( tweets ).id;

      } catch( err ) {
        debug( 'Got Error', err );
        break;
      }
    }
  }
}

// Module initialization (at first load)
request = Promise.promisifyAll( request );

// Module exports

module.exports = TwitterScraper;
