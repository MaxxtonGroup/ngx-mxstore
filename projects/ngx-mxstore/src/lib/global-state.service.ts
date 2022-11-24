import { debounceTime, filter, map, share, startWith } from 'rxjs/operators';
import { BehaviorSubject, Observable, of } from "rxjs";
import { LogType, StoreLoggingUtil } from "./util/store-logging.util";
import _ from 'lodash/fp';
import {StringUtil} from './util/string.util';

export class GlobalStateService {
  private static globalState: { [ key: string ]: any } = {};
  private static readonly globalStateChanges = new BehaviorSubject<any>( GlobalStateService.globalState );
  private static debugMode: boolean = false;
  private static readonly globalStateChangesObs$ = GlobalStateService.globalStateChanges.asObservable().pipe(
    debounceTime( 20 ), // make sure state is stable for at least 20ms before we push an update to the interface.
    share(),
  );

  static enableDebugInfo() {
    GlobalStateService.debugMode = true;
  }

  static disableDebugInfo() {
    GlobalStateService.debugMode = false;
  }

  /**
   * used to set the current state of the application (this can be used to initialize the complete state when the application is starting up)
   * @param state
   * @param mergeWithCurrentState
   */
  static setState( state: { [ key: string ]: any, }, mergeWithCurrentState: boolean = true ) {
    if ( state === GlobalStateService.globalState ) {
      console.warn( 'No need to update state' );
      return;
    }
    if ( state && typeof state === 'object' ) {
      const globalState = mergeWithCurrentState ? { ...GlobalStateService.globalState, ...state } : state;
      if ( GlobalStateService.debugMode ) {
        let oldState: any;
        let newState: any;
        let errorWhileLogging = false;

        try {
          oldState = _.cloneDeep( GlobalStateService.globalState );
        } catch ( error ) {
          errorWhileLogging = true;
          oldState = GlobalStateService.globalState;
        }

        try {
          newState = _.cloneDeep( globalState );
        } catch ( error ) {
          errorWhileLogging = true;
          newState = globalState;
        }

        let logText = 'SET NEW STATE';
        if ( errorWhileLogging ) {
          logText += ' [ AWARE - logging is by reference! ]';
        }
        StoreLoggingUtil.log( LogType.STATE, logText, [
          { subject: 'old-state', log: oldState },
          { subject: 'new-state', log: newState },
        ] );
      }

      GlobalStateService.globalState = globalState;
      GlobalStateService.globalStateChanges.next( globalState );

    } else {
      throw new Error( 'Cannot update state without an object containing state' );
    }
  }

  /**
   * get an observable that emits the current state of the application
   */
  static globalState$(): Observable<any> {
    return GlobalStateService.globalStateChangesObs$;
  }


  /**
   * this method should only be used by the action decorators to inject the current state into the handler;
   */
  static get snapshot(): { [ key: string ]: any } {
    return { ...GlobalStateService.globalState };
  }

  /**
   * used to get a specific slice of state
   * @param slice
   */
  static sliceOfState$( slice: string ) {
    return GlobalStateService.globalState$().pipe(
      startWith(of(null)),
      map( () => this.getSliceSnapshot( slice ) ),
      filter( ( state: any ) => state != null ),
    );
  }

  /**
   * used to update a specific slice of state and then push an update trough the application
   * @param slice
   * @param state
   */
  static setSliceOfState( slice: string, state: { [ key: string ]: any } ) {
    if ( StringUtil.isEmpty( slice ) ) {
      throw new Error( `Cannot update state as it is not clear what slice you wish to update` );
    }

    if ( !state && typeof state === 'object' ) {
      throw new Error( `Cannot update slice of state ${ slice } with ${ state } are you sure this is a Object?` );
    }

    if ( state === GlobalStateService.getSliceSnapshot( slice ) ) {
      console.warn( `no need to update ${slice}` );
      return;
    }

    const currentState = GlobalStateService.snapshot;
    GlobalStateService.setState( { ...currentState, [ slice ]: state } );
  }

  static getSliceSnapshot( slice: string ) {
    return GlobalStateService.snapshot[ slice ];
  }

  /**
   * used to delete a specific slice in the state. use this to clean up a part of state after the information is not needed anymore.
   * @param slice
   */
  static deleteSlice( slice: string ) {
    const globalState = GlobalStateService.snapshot;
    delete globalState[ slice ];
    GlobalStateService.setState( { ...globalState }, false );
  }

}

( window as any ).__STATE = GlobalStateService;

