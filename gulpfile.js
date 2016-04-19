'use strict';

const gulp = require( 'gulp' );
const sourcemaps = require('gulp-sourcemaps');
const ts = require( 'gulp-typescript' );
const babel = require( 'gulp-babel' );
const del = require( 'del' );
const merge = require( 'merge2' );

const tsProject = ts.createProject('./tsconfig.json');

const SOURCE = [
  './typings/main.d.ts',
  './src/**/*.ts',
];
const DESTINATION = './lib/';


gulp.task( 'clean', function() {
  return del( DESTINATION );
} );
gulp.task( 'build', [ 'clean' ], function() {
  const tsStream = ts( tsProject );
  const jsStream = gulp.src( SOURCE )
  .pipe( sourcemaps.init() )
  .pipe( tsStream.js )
  .pipe( babel() )
  .pipe( sourcemaps.write( '.', {
    includeContent: false,
    sourceRoot: '../src'
  } ) );

  return merge( [
    tsStream.dts,
    jsStream,
  ] )
  .pipe( gulp.dest( DESTINATION ) );
} );

gulp.task( 'watch', [ 'build' ], function() {
  gulp.watch( SOURCE, [ 'build' ] );
} );

gulp.task( 'default', [ 'build' ] );
