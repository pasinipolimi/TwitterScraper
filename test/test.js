'use strict';

let chai = require( 'chai' );
let scrape = require( '../' ).scrape;
let expect = chai.expect;

let query = 'from:riccardovolo since:2015-01-01 until:2015-05-02';
// let query = 'monza lang:it since:2015-07-09 until:2015-07-10';
// let query = 'lissone lang:it since:2015-01-01 until:2015-05-12';
// let query = 'arcore lang:it since:2015-01-01 until:2015-06-25';
// let query = '#yourexpo2015';
// let query = '"human technopole" OR arexpo OR  OR humantechnopole OR human-techno-pole OR dopoexpo OR dopo-expo OR postexpo OR post-expo -from:Post_Expo since:2015-12-01';


describe( 'StreamScraper', function() {
  this.timeout( 0 );

  let tweets = [];

  before( function() {
    return scrape( query )
    .then( t => tweets = t );
  } );
  after( function() {
    console.log( 'Scraped %d tweets', tweets.length );
  } );

  describe.skip( 'Test arcore', function() {
    it( 'should get almost tweets', function() {
      // console.log( 'tweets', tweets.map( t => t.text ) );
      console.log( 'Got %d tweets', tweets.length );
      // expect( tweets ).to.have.length.within( 2500, 2871 );
    } );
  } );

  describe.skip( 'Test lissone', function() {
    it( 'should get almost 2871 tweets', function() {
      console.log( 'Got %d tweets', tweets.length );
      expect( tweets ).to.have.length.within( 2500, 2900 );
    } );
  } );

  describe.skip( 'Test monza', function() {
    it( 'should get 344 tweets some', function() {
      console.log( 'Got %d tweets', tweets.length );
      expect( tweets ).to.have.length.within( 300, 360 );
    } );
  } );

  describe( 'Test volo', function() {
    it( 'should get 4 tweets', function() {
      expect( tweets ).to.have.length( 4 );
    } );
    it( 'the first tweet id should be 590789562064117760', function() {
      // Check first tweet
      expect( tweets[0] ).to.have.property( 'id' );
      expect( tweets[0].id ).to.be.equal( '590789562064117760' );
    } );
    it( 'the last tweet id should have timestamp 1426163528', function() {
      // Check last tweet
      expect( tweets[3] ).to.have.property( 'timestamp' );
      expect( tweets[3].timestamp ).to.be.equal( 1426163528 );
    } );
  } );
} );
