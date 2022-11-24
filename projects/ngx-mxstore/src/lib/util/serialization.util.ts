/**
 * @license
 * Copyright Maxxton Group. All Rights Reserved.
 */
import rison from "rison";

export class SerializationUtil {

  static encode( input: any ): string {
    if ( input ) {
      return rison.encode( input );
    }
    return '';
  }

  static decode( urlParam: string ): any {
    return rison.decode( urlParam );
  }
}
