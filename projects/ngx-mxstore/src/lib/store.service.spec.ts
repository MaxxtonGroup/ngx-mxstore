import { SimpleChange } from '@angular/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  Action, ActionUtil, Effect, EffectStatus, EffectTester, EffectUtil, Reducer, StoreAware, StoreAwareComponent, StoreService,
} from '../public-api';

interface CounterState {
  count: number;
  status: EffectStatus;
}

class CounterActions {
  @Action()
  static increment( _payload: number ): void {}

  static load = ActionUtil.createActionWithSuccessAndFailure<number, number>( 'CounterActions/load' );
}

class CounterStore extends StoreService<CounterState> {
  @Reducer( CounterActions.increment )
  onIncrement( payload: number, state: CounterState ) {
    return { count: state.count + payload };
  }

  @Reducer( CounterActions.load.success )
  onLoadSuccess( payload: number ) {
    return { count: payload };
  }

  @Reducer( CounterActions.load.setStatus )
  onLoadStatus( status: EffectStatus ) {
    return { status };
  }

  @Effect( CounterActions.load.start )
  load( payload: number ): Observable<number> {
    return EffectUtil.withActionHandlers( () => of( payload * 10 ), CounterActions.load );
  }
}

@StoreAware()
class CounterHost extends StoreAwareComponent {
  changes: SimpleChange[] = [];

  constructor( public store: CounterStore ) {
    super();
  }

  ngOnChanges( changes: { [ key: string ]: SimpleChange } ) {
    this.changes.push( changes[ 'state' ] );
  }
}

let storeSeq = 0;
const newStore = () =>
  new CounterStore( `counter-spec-${ ++storeSeq }`, { count: 0, status: EffectStatus.IDLE } );

describe( 'ngx-mxstore smoke', () => {
  let store: CounterStore;

  beforeEach( () => {
    store = newStore();
  } );

  afterEach( () => {
    store.ngOnDestroy();
  } );

  it( 'applies a @Reducer when its @Action is dispatched', () => {
    CounterActions.increment( 2 );
    CounterActions.increment( 3 );

    expect( store.snapshot.count ).toBe( 5 );
  } );

  it( 'runs an @Effect via withActionHandlers: success reducer + status DONE', () => {
    CounterActions.load.start( 4 );

    expect( store.snapshot.count ).toBe( 40 );
    expect( store.snapshot.status ).toBe( EffectStatus.DONE );
  } );

  it( 'emits the updated state on state$()', async () => {
    const updated = firstValueFrom( store.state$().pipe( filter( s => s.count === 7 ) ) );

    CounterActions.increment( 7 );

    expect( ( await updated ).count ).toBe( 7 );
  } );

  it( 'routes context-aware actions only to their own store', () => {
    const other = newStore();
    try {
      ActionUtil.getContextAwareActions( CounterActions, store ).increment( 5 );

      expect( store.snapshot.count ).toBe( 5 );
      expect( other.snapshot.count ).toBe( 0 );
    } finally {
      other.ngOnDestroy();
    }
  } );

  it( 'EffectTester: the effect calls the success action with the mapped payload', ( done ) => {
    new EffectTester( store )
      .expectEffect( store.load, 4 )
      .toCallAction( CounterActions.load.success, 40 )
      .run( done );
  } );

  it( '@StoreAware forwards state changes to ngOnChanges and onDestroy$ fires', async () => {
    const host = new CounterHost( store );
    let destroyed: unknown;
    host.onDestroy$.subscribe( value => destroyed = value );

    host.ngOnInit();
    expect( host.changes.length ).toBe( 1 );
    expect( host.changes[ 0 ].firstChange ).toBeTrue();
    expect( host.changes[ 0 ].currentValue.count ).toBe( 0 );

    const updated = firstValueFrom( store.state$().pipe( filter( s => s.count === 3 ) ) );
    CounterActions.increment( 3 );
    await updated;

    const last = host.changes[ host.changes.length - 1 ];
    expect( last.firstChange ).toBeFalse();
    expect( last.currentValue.count ).toBe( 3 );
    expect( ( host as unknown as { state: CounterState } ).state.count ).toBe( 3 );

    host.ngOnDestroy();
    expect( destroyed ).toBe( 'ngOnDestroy' );
  } );
} );
