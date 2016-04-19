// Load system modules
import { EventEmitter } from 'events';

// Load modules

// Load my modules

// Constant declaration

// Module variables declaration

// Module interfaces declaration

// Module types declaration

// Module functions declaration
export function streamToPromise( stream: EventEmitter, emitErrors: boolean = false ): Promise<any> {
  const promise = new Promise( ( res, rej ) => {
    stream.once( 'finish', res ); // For writable streams
    stream.once( 'end', res ); // For all others

    if( emitErrors===true ) {
      stream.once( 'error', rej );
    }
  } );

  return promise;
}

// Module class declaration

// Module initialization (at first load)

// Module exports


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78