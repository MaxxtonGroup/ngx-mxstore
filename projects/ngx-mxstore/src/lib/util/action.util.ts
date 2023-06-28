import { ActionService } from "../action.service";
import { EffectStatus, StoreService } from "..";
import { ActionMeta } from "../models";

let actionInstanceNum = 0;
// @dynamic
export class ActionUtil {

  static onAction = ActionService.onAction;
  static onFirstAction$ = ActionService.onFirstAction$;

  static createActionWithSuccessAndFailure<START, SUCCESS>( actionType: string ) {
    return {
      start: ActionUtil.createAction<any>( `${ actionType }/start` ),
      success: ActionUtil.createAction<SUCCESS>( `${ actionType }/success` ),
      error: ActionUtil.createAction<{ error?: string } & any>( `${ actionType }/error` ),
      setStatus: ActionUtil.createAction<EffectStatus>( `${ actionType }/setStatus` )
    };
  }

  static createAction<T>( type: string ) {
    actionInstanceNum = actionInstanceNum + 1;
    const actionType = `${ actionInstanceNum }/${ type }`;

    const actionFunction: any = ( payload: T, meta?: ActionMeta ) => {
      ActionService.pushAction( actionType, payload, meta );
    };

    Object.defineProperty( actionFunction, 'ACTION_TYPE', {
      value: actionType,
      writable: false
    } );
    return actionFunction as ( payload: T, meta?: ActionMeta ) => void;
  }

  static getContextAwareActions( actions: any, service: StoreService<any> ) {
    return new Proxy( actions, ActionUtil.getProxyMethods( service ) );
  }

  static getProxyMethods: ( service: StoreService<any> ) => { get: (target: any, propKey: string) => any } = ( service: StoreService<any> ) => {
    return {
      get: (target: any, propKey: string) => {

        const propValue = target.constructor[propKey] || target[propKey];
        if ( propValue == null) {
          return propValue;
        }

        if ( typeof propValue === 'object') {
          return new Proxy( propValue, ActionUtil.getProxyMethods( service ) );
        }

        return (...args: Array<any>) => {
          return propValue.apply( target, [ ...args, { context: service } ] );
        };
      }
    };
  }
}
