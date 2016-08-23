// Load system modules
import { Readable } from 'stream';
import { format as formatUrl } from 'url';

// Load modules
import initDebug = require( 'debug' );
import request = require( 'request' );
import cheerio = require( 'cheerio' );

// Load my modules
import { Tweet, PageResponse, MaxPosition } from './types';

// Constant declaration
const debug = initDebug( 'twitter-scraper' );
const TW_HOST = 'twitter.com';
const TW_QUERY_PATH = 'search';
const TW_AJAX_PATH = 'i/search/timeline';
const SESSION_CONTAINER = '.stream-container[data-max-position]';
const TWEETS_SELECTOR = '.stream-item[data-item-id]';
const REQUEST_TIMEOUT = 1000 * 10; // 10s
const RETRY_DELAY = 1000 * 5; // 5s

// Module variables declaration

// Module interfaces declaration

// Module functions declaration
export function scrape( query: string, callback: ( err: Error, tweets?: Tweet[] ) => any ) {
  const tweets: Tweet[] = [];

  const scraper = new Scraper( query );
  scraper.on( 'data', t => tweets.push( t ) );
  scraper.on( 'end', () => callback( null, tweets ) );
  scraper.on( 'error', err => callback( err ) );

  return scraper.start();
}
// Module class declaration
export class Scraper extends Readable {
  protected query: string;
  public total: number = 0;
  protected session: string = null;
  protected fixed: string = null;
  protected lastTweet: Tweet = null;

  constructor( query: string ) {
    super( { objectMode: true } );

    if( typeof query!=='string' ) {
      throw new Error( 'Query must be a string' );
    }

    this.query = query;
    debug( 'Query: "%s"', query );
  }

  // Overrides
  _read() {}
  toString() { return 'TwitterScraper'; }

  // unleak( s: string ): string {
    // return ( ' ' + s ).substr( 1 );
  // }

  // Max position is a string in the format:
  // TWEET-<numbers>-<numbers>-<sessionId>
  protected getMaxPosition( last: string ): string {
    let maxPosition = null;
    if( last ) {
      maxPosition = `TWEET-${last}-${this.fixed}-${this.session}`;
    }
    return maxPosition;
  }
  protected parseMaxPosition( maxPosition: string ): MaxPosition {
    const parts = maxPosition.split( '-' ).slice( 1 ); // Remove the "TWEET" part

    return {
      session: parts[2],
      fixed: parts[1],
      last: parts[0],
    };
  }

  // Twitter URL
  protected getTwitterUrl( query: string, maxPosition?: string ) {
    const qs = {
      q: query,
      max_position: maxPosition,
      // Fixed
      f: 'tweets',
      vertical: 'news',
      include_entities: 0,
      src: 'sprv',
    };

    const fullPath = maxPosition? TW_AJAX_PATH : TW_QUERY_PATH;
    const fullTwUrl = formatUrl( {
      host: TW_HOST,
      pathname: fullPath,
      query: qs,
      protocol: 'https',
    } );

    return fullTwUrl;
  }


  // Requests
  protected getPage( url: string, callback: ( err: Error, response?: PageResponse ) => any ) {
    const options = {
      url: url,
      json: true,
      timeout: REQUEST_TIMEOUT,
    };

    return request( options, ( err, req, body ) => {
      // Handle errors
      if( err ) {
        debug( 'Error %s', err.code, err.stack );
        debug( 'REDO REQUEST' );
        return this.getPage( url, callback );
      }

      // Parse response, get html
      let html: string = body;

      // Create response
      const res: PageResponse = {
        html: html,
      };

      // In case of AJAX call
      if( body && body.min_position ) {
        const last = this.parseMaxPosition( body.min_position ).last;
        res.html = body.items_html;
        res.last = last;
      }

      // Parse the page with cheerio
      res.cheerio = cheerio.load( res.html );

      return callback( null, res );
    } );
  }
  protected getSession( query: string, callback: ( err: Error, maxPosition?: MaxPosition ) => any ) {
    debug( 'Get session' );
    const pageUrl = this.getTwitterUrl( query );

    return this.getPage( pageUrl, ( err, pageResult ) => {
      // Pass back the error
      if( err ) return callback( err );

      // Extract the parsed page as $
      const $ = pageResult.cheerio;
      const maxPositionStr = $( SESSION_CONTAINER ).attr( 'data-max-position' );
      // const maxPositionStr = this.unleak( $( SESSION_CONTAINER ).attr( 'data-max-position' ) );

      const tweets = this.parsePage( $ );

      if( maxPositionStr ) {
        const maxPosition = this.parseMaxPosition( maxPositionStr );
        return callback( null, maxPosition );
      } else {
        const error = new Error( '"data-max-position" not found in "'+SESSION_CONTAINER+'"' );
        return callback( error );
      }
    } );
  }


  // Tweet data extraction
  protected parsePage( $: cheerio.Static ): Tweet[] {
    const tweets = this.getTweetIds( $ );
    this.sendTweets( tweets );
    return tweets;
  }
  protected getTweetIds( $: cheerio.Static ): Tweet[] {
    const divs = $( TWEETS_SELECTOR ).toArray();

    const tweets: Tweet[] = [];
    for( const div of divs ) {
      const id = $( div ).attr( 'data-item-id' );
      const text = $( '.tweet-text', div ).text();
      const retweeter = $( '.original-tweet', div ).attr(' data-retweeter');
      const timestamp = Number( $( '._timestamp', div ).attr( 'data-time' ) );
      // const id = this.unleak( $( div ).attr( 'data-item-id' ) );
      // const text = this.unleak( $( '.tweet-text', div ).text() );
      // const timestamp = Number( this.unleak( $( '._timestamp', div ).attr( 'data-time' ) ) );
      const date = new Date( timestamp*1000 );


     

      tweets.push( { id, text, timestamp, date , retweeter} );
    }

    return tweets;
  }


  // Stream send data
  protected sendTweet( tweet: Tweet ) {
    this.lastTweet = tweet;
    this.total += 1;
    debug( 'Pushing tweet %d: %s', this.total, tweet.id );
    this.push( tweet );
  }
  protected sendTweets( tweets: Tweet[] ) {
    for( const tweet of tweets ) {
      this.sendTweet( tweet );
    }
  }


  // Loop page loop
  protected loop( last?: string ) {
    debug( 'Loop for: %s', last );
    const maxPosition = this.getMaxPosition( last );
    const pageUrl = this.getTwitterUrl( this.query, maxPosition );

    return this.getPage( pageUrl, ( err, pageResult ) => {
      const $ = pageResult.cheerio;
      const newLast = pageResult.last;

      // Parse results
      this.parsePage( $ );

      // Exit strategy
      if( newLast===last ) {
        debug( 'No more data, bye' );
        this.push( null );
        return;
      }

      // Start nel loop
      setImmediate( () => this.loop( newLast ) );
    } );
  }

  // Public methods
  start( last?: string, fixed?: string ) {
    return this.getSession( this.query, ( err, maxPosition ) => {
      debug( 'Got maxPosition: ', maxPosition );

      this.session = maxPosition.session;
      this.fixed = fixed || maxPosition.fixed;

      this.loop( last || maxPosition.last );
    } );
  }
}

// Module initialization (at first load)

// Module exports

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78
