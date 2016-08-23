// Load system modules

// Load modules
import cheerio = require( 'cheerio' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module interfaces declaration
export interface MaxPosition {
  session: string;
  fixed: string;
  last: string;
}
export interface PageResponse {
  html: string;
  cheerio?: cheerio.Static;
  last?: string;
}
export interface Tweet {
  id: string;
  text: string;
  timestamp: number;
  date: Date;
  retweeter: String;
}
// Module types declaration

// Module functions declaration

// Module class declaration

// Module initialization (at first load)

// Module exports

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78
