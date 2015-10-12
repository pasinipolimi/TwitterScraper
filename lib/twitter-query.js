'use strict';

// Load system modules

// Load modules
var _ = require( 'lodash' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// words words1 "phrase" any OR any1 -none -none1 #hash OR #hash1 lang:en from:from OR from:from1 to:to OR to:to1 @mention OR @mention1 since:2015-08-05 until:2015-09-01
function zeroPad( value, digits ) {
  digits = digits || 2;
  return _.padLeft( value, digits, '0' );
}
function formatDate( date ) {
  var string = date.getUTCFullYear();
  string += '-'+zeroPad( date.getUTCMonth() + 1 );
  string += '-'+zeroPad( date.getUTCDate() );
  return string;
}

function toArray( data ) {
  if( !_.isArray( data ) ) {
    return [ data ];
  } else {
    return data;
  }
}
function prependIfMissing( prefix, term ) {
  if( term.indexOf( prefix )===0 ) {
    return term;
  } else {
    return prefix + term;
  }
}
function convertWordsToQuery( words ) {
  words = toArray( words );
  return words.join( ' ' );
}
function convertPhraseToQuery( phrase ) {
  return '"'+phrase+'"';
}
function convertAnyToQuery( any ) {
  any = toArray( any );
  return any.join( ' OR ' );
}
function convertNoneToQuery( none ) {
  none = toArray( none );
  none = none.map( function( term ) {
    return prependIfMissing( '-', term );
  } );
  return none.join( ' ' );
}
function convertHashToQuery( hash ) {
  hash = toArray( hash );
  hash = hash.map( function( term ) {
    return prependIfMissing( '#', term );
  } );
  return hash.join( ' OR ' );
}
function convertLangToQuery( lang ) {
  return 'lang:'+lang;
}
function convertFromToQuery( from ) {
  from = toArray( from );
  from = from.map( function( term ) {
    return prependIfMissing( 'from:', term );
  } );
  return from.join( ' OR ' );
}
function convertToToQuery( to ) {
  to = toArray( to );
  to = to.map( function( term ) {
    return prependIfMissing( 'to:', term );
  } );
  return to.join( ' OR ' );
}
function convertMentionToQuery( mention ) {
  mention = toArray( mention );
  mention = mention.map( function( term ) {
    return prependIfMissing( '@', term );
  } );
  return mention.join( ' OR ' );
}
function convertSinceToQuery( since ) {
  return 'since:'+formatDate( since );
}
function convertUntilToQuery( until ) {
  return 'until:'+formatDate( until );
}
function composeQuery( data ) {
  var filters = [];

  if( data.words ) {
    filters.push( convertWordsToQuery( data.words ) );
  }
  if( data.phrase ) {
    filters.push( convertPhraseToQuery( data.phrase ) );
  }
  if( data.any ) {
    filters.push( convertAnyToQuery( data.any ) );
  }
  if( data.none ) {
    filters.push( convertNoneToQuery( data.none ) );
  }
  if( data.hash ) {
    filters.push( convertHashToQuery( data.hash ) );
  }
  if( data.lang ) {
    filters.push( convertLangToQuery( data.lang ) );
  }
  if( data.from ) {
    filters.push( convertFromToQuery( data.from ) );
  }
  if( data.to ) {
    filters.push( convertToToQuery( data.to ) );
  }
  if( data.mention ) {
    filters.push( convertMentionToQuery( data.mention ) );
  }
  if( data.since ) {
    filters.push( convertSinceToQuery( data.since ) );
  }
  if( data.until ) {
    filters.push( convertUntilToQuery( data.until ) );
  }

  return filters.join( ' ' );
}

// Module initialization (at first load)

// Module exports

module.exports = composeQuery;