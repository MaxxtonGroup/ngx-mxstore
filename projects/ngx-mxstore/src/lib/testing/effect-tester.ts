import { debounceTime, filter, take, tap, startWith } from 'rxjs/operators';
import { StoreService } from "../store.service";
import { Observable, Subscription } from "rxjs";
import { ActionService, ActionTypeWithPayload } from "../action.service";

export class EffectTester {

  private effectFn: undefined | (() => Observable<any> | void | false);
  private service: StoreService<any>;
  private expectedActions: Array<{ action: any, payload: any }> = [];
  private actionTypes: Array<string>                            = [];
  private state: any                                       = {};
  private actionsNotCalled: any                            = [];

  constructor( service: StoreService<any> ) {
    this.service = service;
  }

  expectEffect<P, S>( effectFn: ( payload: P, state: S, meta?: any ) => Observable<any> | void | false, payload?: P, meta: any = {} ) {
    if ( this.effectFn ) {
      throw new Error( 'It is not possible to test multiple effects in a single test' );
    }

    this.effectFn = () => {
      return effectFn.apply( this.service, [ payload as P, this.state, meta ] );
    };
    return this;
  }

  toCallAction<S>( action: any, payload?: S ) {
    this.actionTypes.push( action.ACTION_TYPE );
    this.expectedActions.push( { action, payload } );
    return this;
  }

  withState<S>( state: S ) {
    this.service.setState( state );
    this.state = state;

    return this;
  }

  run( done: () => void ) {
    let sub: Subscription | null    = null;
    const calledActions: Array<any> = [];

    if ( this.actionTypes.length === 0 && this.actionsNotCalled.length === 0 ) {
      return done();
    }

    ActionService.onActions$().pipe(
      // we only test the actions that have been added to this test, all other actions will be ignored.
      startWith( { type: null, payload: null } as ActionTypeWithPayload ),
      filter( ( action: ActionTypeWithPayload ) => this.actionTypes.length > 0 ? this.actionTypes.some( type => action.type === type ) : true ),
      tap( ( action: ActionTypeWithPayload ) => {
        calledActions.push( action );

        const expectedActionsApplicable = this.expectedActions.filter( ( actionToTest ) => {
          return actionToTest.action.ACTION_TYPE === action.type;
        } );

        const firstAction = expectedActionsApplicable[ 0 ];

        // remove expected action from the list of actions;
        this.expectedActions = this.removeWhen( this.expectedActions, ( actionToRemove ) => actionToRemove.action.ACTION_TYPE === action.type );

        if ( firstAction ) {
          // test action type;
          expect( action.type ).toEqual( firstAction.action.ACTION_TYPE );

          // optionally test the action payload
          if ( firstAction.payload ) {
            expect( action.payload ).toEqual( firstAction.payload );
          }
        }

      } ),
      debounceTime( 50 ),
      take( 1 ),
    ).subscribe( () => {
      if ( sub ) {
        sub.unsubscribe();
      }
      if ( this.actionsNotCalled.length ) {
        this.actionsNotCalled.forEach( ( action: any ) => {
          const hasBeenCalled = calledActions.some( calledAction => calledAction.type === action );
          if ( hasBeenCalled ) {
            expect( `action ${action} was called where it was expected not to be called` ).toBe( false );
          } else {
            expect( true ).toBe( true );
          }
        } );
      }

      ActionService.__UNSAFE__resetActionDispatcher();
      done();
    } );

    const effectResult = this.effectFn ? this.effectFn() : null;
    if ( effectResult ) {
      sub = effectResult.subscribe();
    }
  }

  notHaveBeenCalledAction( action: any ) {
    this.actionsNotCalled.push( action.ACTION_TYPE );
    return this;
  }

  private removeWhen<T>( list: Array<T>, predicate: ( a: T ) => boolean ) {
    const filteredList = list.filter( item => !predicate( item ) );
    if ( filteredList.length < list.length ) {
      return filteredList;
    }
    return list;
  }
}

