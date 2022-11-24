import { filter } from 'rxjs/operators';
import { Observable, race, Subject } from "rxjs";
import { LogType, StoreLoggingUtil } from "./util/store-logging.util";
import { ActionMeta } from "./models";

export type ActionTypeWithPayload = Readonly<{ type: string, payload?: any, meta?: ActionMeta }>;

// tslint:disable-next-line:class-name
class _ActionService {

  private static actionDispatcher = new Subject<ActionTypeWithPayload>();
  private static debugMode: boolean = false;

  public static get debugEnabled() {
    return ActionService.debugMode;
  }

  static enableDebugInfo() {
    ActionService.debugMode = true;
  }

  static disableDebugInfo() {
    ActionService.debugMode = false;
  }

  static onActions$() {
    return ActionService.actionDispatcher.asObservable();
  }

  static pushAction( type: string, payload: any, meta?: ActionMeta ) {
    if ( ActionService.debugMode ) {
      StoreLoggingUtil.log( LogType.ACTION, `NEW ACTION ${type}`, [
        { subject: 'type', log: type },
        { subject: 'payload', log: payload },
      ] );
    }
    ActionService.actionDispatcher.next( { type, payload, meta } );
  }

  static onAction( type: string ): Observable<ActionTypeWithPayload> {
    if ( !type ) {
      throw new Error( 'type is required when calling onAction' );
    }
    return ActionService.onActions$().pipe(
      filter( ActionService.whenAction( type ) ) );
  }

  static whenAction( type: string ) {
    return ( action: ActionTypeWithPayload ) => action && action.type === type;
  }

  static onFirstAction$( ...types: Array<any> ) {
    return race( ...types.map( type => ActionService.onAction$( type ) ) );
  }

  static onAction$( type: any ) {
    return ActionService.onAction( type ? (type as any).ACTION_TYPE : null );
  }

  static __UNSAFE__resetActionDispatcher() {
    ActionService.actionDispatcher.complete();
    ActionService.actionDispatcher = new Subject();
  }

}

export const ActionService: typeof _ActionService = (window as any).__ACTIONS || _ActionService;

(window as any).__ACTIONS = _ActionService;

