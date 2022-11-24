
export class RouterUtil {

  static getDeepestUrlValues( activatedRoute: any, valueToObtain: string ) {
    let firstChild = activatedRoute?.firstChild;
    let value = activatedRoute[ valueToObtain ];
    let counter = 0;
    if ( firstChild ) {
      // this will get the deepest child of the URL. Added counter for safety.
      while ( firstChild != null && counter < 30 ) {
        value = firstChild[ valueToObtain ];
        firstChild = firstChild.firstChild;
        counter++;
      }
      return value;
    }
    return null;
  }
}
