/**
 * @license
 * Copyright Maxxton Group. All Rights Reserved.
 */

/**
 * Util class with useful object related functions.
 */
export class ObjectUtil {

  static deepFreeze<T>( object: T ): Readonly<T> {
    Object.freeze( object );

    const oIsFunction = typeof object === "function";
    const hasOwnProp = Object.prototype.hasOwnProperty;

    Object.getOwnPropertyNames( object ).forEach( ( prop ) => {
      if ( hasOwnProp.call( object, prop )
        && ( oIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true )
        && ( object as any )[ prop ] !== null
        && ( typeof ( object as any )[ prop ] === "object" || typeof ( object as any )[ prop ] === "function" )
        && !Object.isFrozen( ( object as any )[ prop ] ) ) {
        ObjectUtil.deepFreeze( ( object as any )[ prop ] );
      }
    } );

    return object;
  }
}
