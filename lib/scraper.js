'use strict';

// Load system modules
let stream = require( 'stream' );
let url = require( 'url' );

// Load modules
let cheerio = require( 'cheerio' );
let Promise = require( 'bluebird' );
let request = require( 'request' );
let debug = require( 'debug' )( 'twitter-scraper:stream' );

// Load my modules

// Constant declaration
const TW_BASE_URL = 'twitter.com';
const TW_QUERY_PATH = 'search';
const SESSION_CONTAINER = '.stream-container[data-max-position]';
const TWEETS_SELECTOR = '.stream-item[data-item-id]';
const RETRY_DELAY = 1000*5;

// Module variables declaration
let i = 0;

// Module functions declaration

// Module class declaration
class StreamScraper extends stream.Readable {
  constructor( query ) {
    super( { objectMode: true } );
    debug( 'Creating scraper' );

    if( typeof query !== 'string' ) {
      throw new Error( 'Query must be a string' );
    }

    this.query = query;
    this.total = 0;
    this.session = null;
    this.fixed = null;

    debug( 'Query is: "%s"', this.query );

    this.name = 'Scraper '+( ++i );
  }

  // Implement method (dummy)
  _read() {}

  toString() {
    return this.name;
    // return `Scraper for "${this.query}"`;
  }

  getMaxPosition( last ) {
    let maxPosition = null;
    if( last ) {
      maxPosition = `TWEET-${last}-${this.fixed}-${this.session}`;
      // maxPosition = `TWEET-${last}-1-${this.session}`;
    }

    return maxPosition;
  }
  // in <- maxPosition: TWEET-613732225062977536-613857714108788736-BD1UO2FFu9QAAAAAAAAETAAAAAcAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  // out: [ 613732225062977536, 613857714108788736, BD1UO2FFu9QAAAAAAAAETAAAAAcAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA ]
  parseMaxPosition( maxPosition ) {
    return maxPosition.split( '-' ).slice( 1 );
  }
  getTwitterUrl( query, maxPosition ) {
    let qs = {
      /* eslint-disable camelcase */
      f: 'tweets',
      vertical: 'news',
      include_entities: 0,
      max_position: maxPosition,
      q: query,
      src: 'sprv',
      /* eslint-enable camelcase */
    };

    let fullPath = TW_QUERY_PATH;
    if( maxPosition ) {
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
  getPage( fullUrl ) {
    let fullPath = url.parse( fullUrl ).path;
    debug( 'Getting page: %s', fullPath );

    return request
    .getAsync( {
      method: 'GET',
      url: fullUrl,
      json: true,
      timeout: 1000*10, // 10s
    } )
    .spread( ( res, body )=> {
      if( res.statusCode!==200 ) {
        debug( 'Status[%d]: ', res.statusCode );
        debug( body );
        throw new Error( 'Status not 200' );
      }

      if( typeof body==='string' ) {
        return [ body ];
      } else {
        // debug( 'Min pos: %s', body.min_position );
        let last = this.parseMaxPosition( body.min_position )[ 0 ];
        let html = body.items_html;

        return [ html, last ];
      }
    } )
    .catch( err => {
      debug( 'Error %s', err.code, err.stack );

      return Promise
      .delay( RETRY_DELAY )
      .then( () => this.getPage( fullUrl ) );
    } )
    ;
  }
  getSession( query ) {
    debug( 'Getting session' );
    let pageUrl = this.getTwitterUrl( query );
    // debug( 'Get page url for session: %s', pageUrl );

    return this
    .getPage( pageUrl )
    .spread( page => {
      let ids = this.parsePage( page );
      debug( 'First session id: ', ids[ 0 ].tweetId );
      debug( 'Last session id: ', ids[ ids.length - 1 ].tweetId );

      let $ = cheerio.load( page );
      let $container = $( SESSION_CONTAINER );
      let maxPosition = $container.attr( 'data-max-position' );

      if( maxPosition ) {
        return this.parseMaxPosition( maxPosition );
      } else {
        debug( 'No max position' );
      }

      throw new Error( '"data-max-position" not found in "'+SESSION_CONTAINER+'"' );
    } )
    ;
  }
  getTweetIds( html ) {
    // Parse the html with cheerio
    let $ = cheerio.load( html );

    // debug( 'Got HTML:', html );

    // Get the list of tweets
    let tweets = $( TWEETS_SELECTOR )
    .map( ( c, div ) => {
      let $div = $( div );

      // Get the "data-user-id" attribute (so it is a string)
      // let userId = $div.attr( 'data-user-id' );
      // Get the "data-item-id" attribute (so it is a string)
      let id = $div.attr( 'data-item-id' )
      let text = $( '.tweet-text', $div ).text();
      let timestamp = $( '._timestamp', $div ).attr( 'data-time' );

      // debug( '[%s] %s', id, text );

      return {
        tweetId: id,
        // userId,
        text,
        timestamp,
        location : null,
      }
    } )
    // Get the array of tweets
    .get();

    return tweets;
  }


  sendIds( ids ) {
    debug( 'Pushing %d ids', ids.length );
    for( let id of ids ) {
      // Only if string
      // if( typeof id==='string' ) this.sendId( id );
      this.sendId( id );
    }
  }
  sendId( id ) {
    // debug( 'Pushing id: %s', id );
    this.push( id );
  }

  parsePage( page ) {
    debug( 'Parsing page' );
    let ids = this.getTweetIds( page );

    // Push all ids
    debug( 'Got %d ids', ids.length );
    this.total += ids.length;
    this.sendIds( ids );

    return ids;
  }
  loop( last ) {
    debug( 'Loop %s => %s', last, this.fixed );

    let maxPosition = this.getMaxPosition( last );
    // debug( 'Max position is: "%s"', maxPosition );

    let pageUrl = this.getTwitterUrl( this.query, maxPosition );

    this.getPage( pageUrl )
    .spread( ( page, newLast ) => {
      // Parse tweets
      this.parsePage( page );

      // Exit strategy
      if( newLast===last ) {
        debug( 'No more data bye, %s===%s', newLast, last );
        this.push( null );
        return;
      }

      // Next loop
      setImmediate( ()=> {
        this.loop( newLast );
      } );
    } )
  }

  start( last, fixed ) {
    debug( 'Starting scraper with: %s -> %s', last, fixed );

    this.getSession( this.query )
    .spread( ( sessionLast, sessionFixed, session ) => {
      debug( 'Got session: ', session );
      debug( 'Session last: ', sessionLast );
      debug( 'Session fixed: ', sessionFixed );


      this.session = session;
      this.fixed = fixed || sessionFixed;
      // this.fixed = fixed;

      setImmediate( ()=> {
        this.loop( last || sessionLast );
      } );

    } )
    .catch( err => {
      debug( 'Error', err );
      this.emit( 'error', err );
      this.push( null );
      return;
    } )
    ;
  }
}

// Module initialization (at first load)
request = Promise.promisifyAll( request );
// Promise.longStackTraces();

// Module exports

module.exports = StreamScraper;
