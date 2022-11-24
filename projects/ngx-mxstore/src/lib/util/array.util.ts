
/**
 * Util class with useful array related functions.
 *
 * @author m.gawade (m.gawade@maxxton.com)
 */
// @dynamic
export class ArrayUtil {

  static removeWhen<T>( list: Array<T>, predicate: ( a: T ) => boolean ) {
    const filteredList = list.filter( item => !predicate( item ) );
    if ( filteredList.length < list.length ) {
      return filteredList;
    }
    return list;
  }
}
