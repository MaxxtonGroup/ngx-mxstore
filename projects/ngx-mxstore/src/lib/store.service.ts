import { catchError, delay, filter, mergeMap, take, takeUntil, tap } from 'rxjs/operators';
import { Observable, of, Subject, EMPTY, } from "rxjs";
import { ActionService } from "./action.service";
import { GlobalStateService } from "./global-state.service";
import { LogType, StoreLoggingUtil } from "./util/store-logging.util";
import { Inject, Injectable, isDevMode, NgZone, Optional } from '@angular/core';
import _ from "lodash";
import { ObjectUtil } from './util/object.util';
import { MX_STORE_INITIAL_STATE, MX_STORE_STORE_ID } from "./tokens";

@Injectable()
export class StoreService<S extends object> {

  // gets injected by decorator
  public actionHandlers: { [key: string]: any; } | undefined;
  public effectHandlerConfig: { [ key: string ]: { delayTime: number, takeLatest: boolean } } = {};
  public effectHandlers: { [key: string]: Array<any>; } | undefined;// = {};


  private _storeId: string | undefined;

  private onDestroy$: Subject<void> = new Subject();
  private onTriggerEffectHandler: Subject<string | null> = new Subject();
  private ngZone: NgZone;

  constructor( @Inject( MX_STORE_STORE_ID ) storeId?: string, @Inject( MX_STORE_INITIAL_STATE ) initialState?: any, @Optional() ngZone?: NgZone ) {
    this.ngZone = ngZone || new NgZone( { enableLongStackTrace: false } );
    this._storeId = storeId;
    this.setInitialState(initialState);
    this.setupActionHandlers();
  }

  setInitialState( initialState: Partial<S> ) {
    if ( initialState && Object.keys( this.snapshot || {} ).length == 0 ) {
      this.setState( initialState );
    }
  }

  get storeId(): string {
    if ( !this._storeId ) {
      const name = this.constructor.name;

      // when multiple instances of the same store service are running it will add an instanceId to the slice of state
      if ( GlobalStateService.getSliceSnapshot( name ) ) {
        const newStoreName = `${ name }-instance-${ Date.now() }`;
        console.info( `${ name } is already defined in the global state and will be created as ${ newStoreName }` );
        this._storeId = newStoreName;
      } else {
        this._storeId = name;
      }
    }

    return this._storeId;
  }

  /**
   * update the current state with a new version of the state and return the updated version of the state.
   */
  setState( state: Partial<S>, actionId: string = 'callee' ) {
    if ( !!state && state != this.snapshot
      && Object.keys( { ...this.snapshot || {}, ...state || {} } )
        .some( key => {
          return ( this.snapshot as any || {} )[ key ] !== ( state as any )[ key ];
        } ) ) {

      if ( isDevMode() && _.isEqual( state, this.snapshot ) ) {
        console.warn( `State is not changed by ${ this.storeId } - ${ actionId }!` );
      }

      GlobalStateService.setSliceOfState( this.storeId, state );
    }
  }

  /**
   * get a stream of state updates (used to show information in a component)
   */
  state$ = () => {
    return GlobalStateService.sliceOfState$( this.storeId )
      .pipe(
        takeUntil( this.onDestroy$ )
      ) as Observable<Readonly<S>>;
  }

  /**
   * get the current state as an Observable (this can be used in effects);
   */
  stateSnapshot$ = () => {
    return of( this.snapshot ) as Observable<S>;
  }


  /**
   * this method should only be used by the action decorators to inject the current state into the handler;
   */
  get snapshot(): Readonly<S> {
    const snapshot = GlobalStateService.getSliceSnapshot( this.storeId );
    if ( isDevMode() && snapshot ) {
      return ObjectUtil.deepFreeze( snapshot );
    }
    return snapshot;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    // this.onDestroy$ = null;
    this.onTriggerEffectHandler.next( null );
    this.onTriggerEffectHandler.complete();
    // this.onTriggerEffectHandler = null;

    GlobalStateService.deleteSlice( this.storeId );
  }

  setupActionHandlers() {
    ( ( ActionService.onActions$()
        .pipe( takeUntil( this.onDestroy$ ) )
    ) as Observable<any> ).subscribe( ( action ) => {
      const isContextAware = ( action && 'meta' in action && action.meta && 'context' in action.meta && action.meta.context );
      const actionType = action.type.toString();
      if ( isContextAware && action.meta.context.storeId !== this.storeId ) {
        return;
      }

      const initialState = { ...this.snapshot };
      // handle direct state manipulation
      if ( action && this.actionHandlers && this.actionHandlers[ actionType ] ) {

        let debugSubject = `REDUCER RAN FOR ACTION ${ action.type }`;
        let result: Partial<S> = initialState;
        try {
          result = ( this as any )[ this.actionHandlers[ actionType ] ]( action.payload, initialState );
        } catch ( e: any ) {
          if ( !( e.hasOwnProperty( 'type' ) && e.type === 'StateNotChangedError' ) ) {
            throw( e );
          }
          debugSubject = `REDUCER IGNORED FOR ACTION ${ action.type }`;
        }

        if ( ActionService.debugEnabled ) {
          StoreLoggingUtil.log( LogType.REDUCER, debugSubject, [
            { subject: 'method', log: `${ this.constructor.name }.${ this.actionHandlers[ action.type ] }` },
            { subject: 'payload', log: StoreLoggingUtil.clonePayload( action.payload ) },
            { subject: 'result', log: result },
          ] );
        }

        if ( result && result != initialState ) {
          if ( NgZone.isInAngularZone() ) {
            this.setState( result, actionType );
          } else {
            this.ngZone.run( () => {
              this.setState( result, actionType );
            } );
          }
        }
      }

      // handle sideEffects
      if ( action && this.effectHandlers && this.effectHandlers[ actionType ] ) {
        const snapShot = { ...( this.snapshot as any ) };
        this.effectHandlers[ actionType ].forEach( effectMethodKey => {

          if ( ActionService.debugEnabled ) {
            StoreLoggingUtil.log( LogType.EFFECT, `EFFECT STARTED FOR ACTION ${ action.type }`, [
              { subject: 'method', log: `${ this.constructor.name }.${ effectMethodKey }` },
              { subject: 'payload', log: StoreLoggingUtil.clonePayload( action.payload ) },
            ], false, false );
          }
          const result: Observable<any> | null = ( this as any )[ effectMethodKey ]( action.payload, snapShot, {
            action: action.type.toString(),
            previousState: initialState,
            ...( action.meta ? action.meta : {} )
          } );

          const noop = () => {
          };

          if ( result ) {
            this.onTriggerEffectHandler.next( effectMethodKey );
            const debounce = this.effectHandlerConfig ? this.effectHandlerConfig[ effectMethodKey ]?.takeLatest || false : false;
            const delayTimeMs = this.effectHandlerConfig ? this.effectHandlerConfig[ effectMethodKey ]?.delayTime || 0 : 0;
            const onTriggerHandler = this.onTriggerEffectHandler.asObservable()
              .pipe( filter( key => key == effectMethodKey ), take( 1 ) );


            // notify that the effectHandler observable will be called.
            of( null ).pipe(
              delayTimeMs > 0 ? delay( delayTimeMs ) : tap(),
              mergeMap( () => result ),
              tap( noop, noop, () => {
//            on complete
                if ( ActionService.debugEnabled ) {
                  StoreLoggingUtil.log( LogType.EFFECT, `EFFECT COMPLETED FOR ACTION ${ action.type }`, [
                    { subject: 'method', log: `${ this.constructor.name }.${ effectMethodKey }` },
                    { subject: 'payload', log: StoreLoggingUtil.clonePayload( action.payload ) },
                  ], false, true );
                }
              } ),
              debounce ? takeUntil( onTriggerHandler ) : tap(),
              takeUntil( this.onDestroy$ ),
              catchError( ( error ) => {
                console.error( `There was an error during execution of effect ${ this.constructor.name }.${ effectMethodKey }`, error );
                return EMPTY;
              } )
            ).subscribe();
          }

          if ( ActionService.debugEnabled && !result ) {
            StoreLoggingUtil.log( LogType.EFFECT, `COULD NOT START EFFECT FOR ACTION ${ action.type }`, [
              { subject: 'method', log: `${ this.constructor.name }.${ effectMethodKey }` },
              { subject: 'payload', log: StoreLoggingUtil.clonePayload( action.payload ) },
            ], false, true );
          }
        } );
      }
    } );
  }
}
