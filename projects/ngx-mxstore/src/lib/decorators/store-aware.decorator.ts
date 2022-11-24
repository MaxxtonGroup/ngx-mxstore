/**
 *
 * Maxxton Group 2019
 *
 * @author W. Hollebrandse (w.hollebrandse@maxxton.com)
 */
import { Subject, Subscription } from "rxjs";
import { StoreService } from "../store.service";
import { ChangeDetectorRef, OnDestroy, OnInit, SimpleChange } from "@angular/core";
import {HookNgOnDestroy, OnDestroy$} from './hook-ng-on-destroy.decorator';
import {detectChanges, markForCheck} from '../util/change-detection.util';

export interface StoreAwareOptions {
  storeKey?: string;
  stateKey?: string | 'state';
  forceDetectChanges?: boolean;
  stateAsGetter?: boolean;
}
@HookNgOnDestroy
export class StoreAwareComponent implements OnDestroy, OnInit {
  @OnDestroy$()
  onDestroy$: Subject<any> = new Subject();

  ngOnDestroy(): void {
  }

  ngOnInit(): void {
  }
}

export function StoreAware( { stateKey = 'state', storeKey, forceDetectChanges = false, stateAsGetter = true }: StoreAwareOptions = {} ) {
// tslint:disable-next-line:ban-types
  return ( constructor: Function ) => {

    const originalNgOnDestroy: () => void = constructor.prototype.ngOnDestroy;
    const originalNgOnOnit: () => void = constructor.prototype.ngOnInit;

    if ( !originalNgOnDestroy || !originalNgOnOnit ) {
      throw new Error( 'When using @StoreAware ngOnInit and ngOnDestroy must be implemented. (can also be an empty function)' );
    }

    if ( stateAsGetter ) {
      Object.defineProperty( constructor.prototype, stateKey, {
        get () {
          const params: Array<any> = Object.getOwnPropertyNames( this );
          const store: StoreService<any> = storeKey ? this[ storeKey ] : this[ params.find( param => this[ param ] instanceof StoreService ) ];
          return store ? store.snapshot : {};
        },
        set () {
          throw new Error( "State is readonly and cannot be altered." );
        },
        configurable: false,

      } );
    }

    constructor.prototype.ngOnInit = function (): void {
      this.storeAwarestateSubscriptions = this.storeAwarestateSubscriptions || [];
      this.storeAwarestateKeys = this.storeAwarestateKeys || [];

      let params = Object.getOwnPropertyNames( this );
      const store: StoreService<any> = storeKey ? this[ storeKey ] : this[ params.find( param => this[ param ] instanceof StoreService ) || 0 ];
      const cdr: ChangeDetectorRef = this[ params.find( param => this[ param ] && this[ param ][ 'detectChanges' ] && this[ param ][ 'markForCheck' ] ) || 0 ];
      const initialState = this[ stateKey ];
      let firstChange = true;
      let previousValue: any;

      if ( this.storeAwarestateKeys.some( ( key: string ) => key === stateKey ) ) {
        throw new Error( `${ constructor.name } has multiple store aware decorators that point to the same stateKey. ` );
      } else {
        this.storeAwarestateKeys.push( storeKey )
      }

      if ( initialState != null && !stateAsGetter ) {
        throw new Error( `Trying to set StoreAware state on a non empty property: ${ constructor.name }.${ stateKey } ` );
      }

      const updateState = ( state: any ) => {
        if ( previousValue != state ) {
          // trigger angular lifecycle hook to trigger functions when state has been updated.
          if ( this.ngOnChanges ) {
            this.ngOnChanges( { [ stateKey ]: new SimpleChange( previousValue, state, firstChange ) } );
          }
          previousValue = state;

          if ( !stateAsGetter ) {
            this[ stateKey ] = state;
          }

          if ( cdr ) {
            if ( forceDetectChanges ) {
              detectChanges( cdr );
            } else {
              markForCheck( cdr );
            }
          } else if ( forceDetectChanges ) {
            throw new Error( `Could not detect changes as not ChangeDetectorRef is found` );
          }

          firstChange = false;
        }
      };

      if ( store ) {
        // track state changes.
        const sub = store.state$().subscribe( state => {
          updateState( state );
        } );

        this.storeAwarestateSubscriptions.push( sub );
        updateState( store.snapshot );
      } else {
        throw new Error( `Cannot make ${ constructor.name } StoreAware as it does not have an injected store. Did you forget to inject a store in the constructor?` );
      }

      // @ts-ignore
      originalNgOnOnit.apply( this, arguments );


      this.onInit = originalNgOnOnit;
    };

    constructor.prototype.ngOnDestroy = function (): void {
      // call the original ngOnDestroy logic.
      // @ts-ignore
      originalNgOnDestroy.apply( this, arguments );

      if ( this.storeAwarestateSubscriptions ) {
        this.storeAwarestateSubscriptions.forEach( ( sub: Subscription ) => {
          sub.unsubscribe();
          // sub = null;
        } );
        this.storeAwarestateSubscriptions = [];
      } else {
        console.warn( 'Cannot destroy state subscription', constructor.name );
      }
    };
  };
}
