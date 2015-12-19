'use strict';

let chai = require( 'chai' );
let StreamScraper = require( '../' ).StreamScraper;
let expect = chai.expect;

let query = 'from:riccardovolo since:2015-01-01 until:2015-05-02';


describe( 'StreamScraper', function() {
  describe( '', function() {
    this.timeout( 0 );

    let scraper;
    let tweets = [];

    before( function( done ) {
      scraper = new StreamScraper( query );
      scraper.on( 'data', d => tweets.push( d ) );
      scraper.on( 'end', done );
      scraper.start();
    } );

    it( 'should get 4 tweets', function() {
      expect( tweets ).to.have.length( 4 );
    } );
    it( 'the first tweet id should be 590789562064117760', function() {
      // Check first tweet
      expect( tweets[0] ).to.have.property( 'tweetId' );
      expect( tweets[0].tweetId ).to.be.equal( '590789562064117760' );
    } );
    it( 'the last tweet id should have timestamp 1426163528', function() {
      // Check last tweet
      expect( tweets[3] ).to.have.property( 'timestamp' );
      expect( tweets[3].timestamp ).to.be.equal( '1426163528' );
    } );
  } );
} );
