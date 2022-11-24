import {StoreService} from "../store.service";

export function Reducer(action: any ): PropertyDecorator {
  return ( target: Object, propertyKey: string | symbol ) => {
    // register the action handler to the target (handling this action is done by the store service).
    if ((target as StoreService<any>).actionHandlers && (target as StoreService<any>).actionHandlers?.[action.ACTION_TYPE]) {
      throw new Error(`It is not possible to have multiple REDUCERS for the same action in the same service.
      action: ${action.ACTION_TYPE}, reducer: ${target.constructor.name}.${Object(propertyKey)}`);
    }

    Object.defineProperty( target, 'actionHandlers', {
        enumerable: true,
        configurable: true,
        value: {
          ...(target as StoreService<any>).actionHandlers,
          [ action.ACTION_TYPE ]: propertyKey
        }
      }
    );
  };
}
