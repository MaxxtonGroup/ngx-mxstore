import { StoreService } from "../store.service";

export function Effect( action: any ): PropertyDecorator {
  return ( target: Object, propertyKey: string | symbol ) => {
    // register the action handler to the target (handling this action is done by the store service).
    if ( (target as StoreService<any>).effectHandlers && (target as StoreService<any>).effectHandlers?.[ action.ACTION_TYPE ] ) {
      (target as StoreService<any>).effectHandlers?.[ action.ACTION_TYPE ].push(propertyKey);
    } else {
      // register the action handler to the target (handling this action is done by the store service).
      Object.defineProperty( target, 'effectHandlers', {
          enumerable: true,
          configurable: true,
          value: {
            ...(target as StoreService<any>).effectHandlers,
            [ action.ACTION_TYPE ]: [ propertyKey ]
          }
        }
      );
    }
  };
}
