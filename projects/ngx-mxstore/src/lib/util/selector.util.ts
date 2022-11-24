export class SelectorUtil {
  static uniqueObjectString( objectArray: Array<any>, identifiers: Array<string> ): string {
    if ( !objectArray ) {
      return '';
    }

    return objectArray.map( item => {
      let uniqueString = '';
      identifiers.forEach( (key: string) => {
        if ( item && item[key] ) {
          if ( item[key] instanceof Date ) {
            uniqueString += item[key].getTime();
          } else {
            uniqueString += item[key];
          }
        }
      } );
      return uniqueString;
    } ).join('');
  }
}
