import { Subscription } from 'rxjs';
import { ActionService, ActionTypeWithPayload } from './action.service';
import { GlobalStateService } from './global-state.service';

interface ReduxDevtoolsConnection {
  init: ( state: any ) => void;
  send: ( action: any, state: any ) => void;
  subscribe: ( listener: ( message: any ) => void ) => void;
  unsubscribe: () => void;
}

interface ReduxDevtoolsExtension {
  connect: ( options?: { name?: string } ) => ReduxDevtoolsConnection;
}

export interface DevToolsOptions {
  name?: string;
}

// tslint:disable-next-line:class-name
class _DevToolsService {

  private static connection: ReduxDevtoolsConnection | null = null;
  private static initialState: { [ key: string ]: any } | null = null;
  private static actionSubscription: Subscription | null = null;

  /**
   * connects to the Redux DevTools browser extension (if installed) and starts forwarding
   * every dispatched action and the resulting state to it. Also allows the extension to
   * time-travel the application by jumping to, committing or resetting state.
   */
  static enable( options: DevToolsOptions = {} ) {
    const extension: ReduxDevtoolsExtension | undefined = ( window as any ).__REDUX_DEVTOOLS_EXTENSION__;

    if ( !extension ) {
      console.warn( 'ngx-mxstore: Redux DevTools extension was not found in this browser.' );
      return;
    }

    if ( DevToolsService.connection ) {
      return;
    }

    DevToolsService.connection = extension.connect( { name: options.name || 'ngx-mxstore' } );
    DevToolsService.initialState = GlobalStateService.snapshot;
    DevToolsService.connection.init( DevToolsService.initialState );

    DevToolsService.actionSubscription = ActionService.onActions$().subscribe( ( action: ActionTypeWithPayload ) => {
      // reducers/effects triggered synchronously by this action have run by the time this microtask executes.
      Promise.resolve().then( () => {
        DevToolsService.connection?.send( { type: action.type, payload: action.payload }, GlobalStateService.snapshot );
      } );
    } );

    DevToolsService.connection.subscribe( ( message: any ) => DevToolsService.onDevToolsMessage( message ) );
  }

  /**
   * disconnects from the Redux DevTools extension.
   */
  static disable() {
    DevToolsService.actionSubscription?.unsubscribe();
    DevToolsService.actionSubscription = null;
    DevToolsService.connection?.unsubscribe();
    DevToolsService.connection = null;
    DevToolsService.initialState = null;
  }

  private static onDevToolsMessage( message: any ) {
    if ( !DevToolsService.connection || message.type !== 'DISPATCH' ) {
      return;
    }

    switch ( message.payload.type ) {
      case 'JUMP_TO_ACTION':
      case 'JUMP_TO_STATE':
        DevToolsService.applyState( JSON.parse( message.state ) );
        break;
      case 'ROLLBACK':
        DevToolsService.applyState( JSON.parse( message.state ) );
        DevToolsService.connection.init( GlobalStateService.snapshot );
        break;
      case 'COMMIT':
        DevToolsService.connection.init( GlobalStateService.snapshot );
        break;
      case 'RESET':
        DevToolsService.applyState( DevToolsService.initialState || {} );
        DevToolsService.connection.init( GlobalStateService.snapshot );
        break;
      case 'IMPORT_STATE': {
        const computedStates = message.payload.nextLiftedState.computedStates;
        DevToolsService.applyState( computedStates[ computedStates.length - 1 ].state );
        DevToolsService.connection.send( null, GlobalStateService.snapshot );
        break;
      }
    }
  }

  private static applyState( state: { [ key: string ]: any } ) {
    GlobalStateService.setState( state, false );
  }

}

export const DevToolsService: typeof _DevToolsService = ( window as any ).__DEVTOOLS || _DevToolsService;

( window as any ).__DEVTOOLS = DevToolsService;
