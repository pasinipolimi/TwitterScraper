// Load system modules
import { Readable } from 'stream';
import { format as formatUrl } from 'url';

// Load modules
import initDebug = require( 'debug' );
import request = require( 'request-promise' );
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
export function scrape( query: string, callback?: Function ): Promise<Tweet[]> {
  const tweets: Tweet[] = [];

  const scraper = new Scraper( query );
  scraper.on( 'data', t => tweets.push( t ) );

  return scraper
  .start()
  .then( ()=> {
    if( callback ) callback( null, tweets );
    return tweets;
  } )
  .catch( err => {
    if( callback ) callback( err );
    throw err;
  } )
  ;
}
// Module class declaration
export class Scraper extends Readable {
  protected query: string;
  protected total: number = 0;
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
  protected async getPage( url: string ): Promise<PageResponse> {
    const options = {
      url: url,
      json: true,
      timeout: REQUEST_TIMEOUT,
    };

    let response: any;
    do {
      try {
        response = await request( options );
        break; // Exit loop
      } catch( err ) {
        debug( 'Error %s', err.code, err.stack );
        debug( 'REDO REQUEST' );
      }
    } while( true );

    // Get html
    let html: string = response;

    // Create response
    const res: PageResponse = {
      html: html,
    };

    // In case of AJAX call
    if( typeof response!=='string' ) {
      const last = this.parseMaxPosition( response.min_position ).last;
      res.html = response.items_html;
      res.last = last;
    }

    // Parse the page with cheerio
    res.cheerio = cheerio.load( res.html );

    return res;
  }
  protected async getSession( query: string ): Promise<MaxPosition> {
    debug( 'Get session' );
    const pageUrl = this.getTwitterUrl( query );

    // Extract the parsed page as $
    const pageResult = await this.getPage( pageUrl );
    const $ = pageResult.cheerio;
    const maxPosition = $( SESSION_CONTAINER ).attr( 'data-max-position' );

    const tweets = this.parsePage( $ );

    if( maxPosition ) {
      return this.parseMaxPosition( maxPosition );
    } else {
      throw new Error( '"data-max-position" not found in "'+SESSION_CONTAINER+'"' );
    }
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
      const timestamp = Number( $( '._timestamp', div ).attr( 'data-time' ) );

      tweets.push( { id, text, timestamp } );
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
  protected async loop( last?: string ): Promise<string> {
    debug( 'Loop for: %s', last );
    const maxPosition = this.getMaxPosition( last );
    const pageUrl = this.getTwitterUrl( this.query, maxPosition );
    const pageResult = await this.getPage( pageUrl );
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

    await this.loop( newLast );
  }

  // Public methods
  async start( last?: string, fixed?: string ): Promise<number> {

    const maxPosition = await this.getSession( this.query );
    debug( 'Got maxPosition: ', maxPosition );

    this.session = maxPosition.session;
    this.fixed = fixed || maxPosition.fixed;

    await this.loop( last || maxPosition.last );

    return this.total;
  }
}

// Module initialization (at first load)

// Module exports

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78
