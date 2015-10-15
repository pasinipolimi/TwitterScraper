'use strict';

// Load system modules
let stream = require( 'stream' );

// Load modules
let Promise = require( 'bluebird' );
let request = require( 'request' );
let debug = require( 'debug' )( 'twitter-scraper:stream' );

// Load my modules
let composeQuery = require( './twitter-query' );
let PageHandler = require( './page-handler' );

// Constant declaration


// Module variables declaration

// Module functions declaration

// Module class declaration
class StreamScraper extends stream.Readable {
  constructor( query ) {
    super( { objectMode: true } );
    debug( 'Creating scraper' );

    this.ph = new PageHandler();
    this.query = composeQuery( query );
    debug( 'Query is: "%s"', this.query );
  }

  // Implement method (dummy)
  _read() {}

  sendIds( ids ) {
    debug( 'Pushing %d ids', ids.length );
    for( let id of ids ) {
      // Only if string
      if( typeof id==='string' ) this.sendId( id );
    }
  }
  sendId( id ) {
    debug( 'Pushing id: %s', id );
    this.push( id );
  }

  loop( session, first, last ) {
    // debug( 'Loop: %s,%s,%s', session, first, last );
    let maxPosition = this.ph.getMaxPosition( session, first, last );

    // debug( 'Max position is: "%s"', maxPosition );
    let pageUrl = this.ph.getTwitterUrl( this.query, maxPosition );

    this.ph
    .getPage( pageUrl )
    .then( pageFragment => {
      let ids = this.ph.getTweetIds( pageFragment );

      if( ids.length===0 ) {
        debug( 'No more data bye' );
        // No more, return total ids number
        this.push( null );
        return;
      }


      // Push all ids
      debug( 'Got %d ids', ids.length );
      this.sendIds( ids );

      // Next loop
      first = ids[0];
      last = ids[ ids.length-1 ];

      setImmediate( ()=> {
        this.loop( session, first, last );
      } );
    } )
  }

  start() {
    this.ph
    .getSession( this.query )
    .bind( this )
    .then( this.loop );
  }
}

// Module initialization (at first load)
request = Promise.promisifyAll( request );

// Module exports

module.exports = StreamScraper;
