/**
 *
 * Maxxton Group 2019
 *
 * @author W. Hollebrandse (w.hollebrandse@maxxton.com)
 */
import _ from "lodash";

export enum LogType {
  ACTION = 'A',
  REDUCER = 'R',
  EFFECT = 'E',
  STATE = 'S',
}

export class StoreLoggingUtil {

  static readonly colors: Record<LogType, { backgroundColor: string, color: string}> = {
    'A': { backgroundColor: '#5bd1d7', color: '#348498'},
    'R': { backgroundColor: '#348498', color: '#004d61'},
    'E': { backgroundColor: '#004d61', color: '#5bd1d7'},
    'S': { backgroundColor: '#ff502f', color: '#004d61'},
  };

  static log(type: LogType, subject: string, details: Array<{ subject: string, log: any }>, open: boolean = true, close: boolean = true) {
    let groupStart = (open) ? 'group' : 'info';
    groupStart += (close && open) ? 'Collapsed' : '';
    // @ts-ignore
    console[groupStart]( `%c${type}` + `%c${subject}`, StoreLoggingUtil.styles( type ), 'color: #4b535a' );

    console.groupCollapsed('trace');
    console.trace();
    console.groupEnd();

    details.forEach(detail => console.info( detail.subject, detail.log ));
    if (close) {
      console.groupEnd();
    }
  }

  static styles(type: LogType): string {
    const { backgroundColor, color } = StoreLoggingUtil.colors[type];
    return `
      box-sizing: border-box;
      display: inline-block;
      background-color: ${backgroundColor};
      color: ${color};

      border-radius: 1rem;
      text-align: center;

      font-size: 0.7rem;
      font-weight: 200;
      padding: .05rem .5rem .1rem;
      margin-right: .5rem;
      line-height: inherit;`;
  }

  static clonePayload( payload: any ) {
    return _.isObject( payload ) ? _.cloneDeep( payload ) : payload;
  }
}
