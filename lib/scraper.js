'use strict';

// Load system modules
let stream = require( 'stream' );

// Load modules
let Promise = require( 'bluebird' );
let request = require( 'request' );
let debug = require( 'debug' )( 'twitter-scraper:stream' );

// Load my modules
let buildQuery = require( './query-builder' );
let PageHandler = require( './page-handler' );

// Constant declaration

// Module variables declaration
let i = 0;

// Module functions declaration

// Module class declaration
class StreamScraper extends stream.Readable {
  constructor( query ) {
    super( { objectMode: true } );
    debug( 'Creating scraper' );

    this.ph = new PageHandler();
    if( typeof query === 'string' ) {
      this.query = query;
    } else {
      this.query = buildQuery( query );
    }
    this.total = 0;

    debug( 'Query is: "%s"', this.query );

    this.name = 'Scraper '+( ++i );
  }

  // Implement method (dummy)
  _read() {}

  toString() {
    return this.name;
    // return `Scraper for "${this.query}"`;
  }

  sendIds( ids ) {
    debug( 'Pushing %d ids', ids.length );
    for( let id of ids ) {
      // Only if string
      if( typeof id==='string' ) this.sendId( id );
    }
  }
  sendId( id ) {
    // debug( 'Pushing id: %s', id );
    this.push( id );
  }

  loop( session, first, last ) {
    debug( 'Loop: %s,%s,%s', session, first, last );
    let maxPosition = this.ph.getMaxPosition( session, first, last );

    debug( 'Max position is: "%s"', maxPosition );
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
      this.total += ids.length;
      this.sendIds( ids );

      // Next loop
      first = ids[0];
      last = ids[ ids.length-1 ];

      setImmediate( ()=> {
        this.loop( session, first, last );
      } );
    } )
  }

  start( first, last ) {
    this.ph
    .getSession( this.query )
    .then( session => {

      setImmediate( ()=> {
        this.loop( session, first, last );
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

// Module exports

module.exports = StreamScraper;
