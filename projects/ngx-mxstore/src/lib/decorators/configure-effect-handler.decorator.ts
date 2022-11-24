import { StoreService } from "../store.service";

/**
 * Make it possible to configure an EffectHandler.
 * @param config: Object containing the configuration for this effecthandler.
 * @param config.takeLatest: true/false will make it possible to cancel an effect. When cancel is enabled it will cancel existing subscriptions once it gets called again.
 * @param config.delayTime: makes it possible to delay the execution of an effect, this is mostly useful in combination with takeLatest.
 * @constructor
 */
export function ConfigureEffectHandler( config: { delayTime?: number, takeLatest?: boolean } ): PropertyDecorator {
  return ( target: Object, propertyKey: string | symbol ) => {
    const defaultConfig = { delayTime: 300, takeLatest: true };
    // register the action handler to the target (handling this action is done by the store service).
    if ( (target as StoreService<any>).effectHandlerConfig && (target as StoreService<any>).effectHandlerConfig[ String(propertyKey) ] ) {
      console.error(`Unable to add ConfigureEffectHandler to ${String(propertyKey)}, this effecthandler has already been configured`);
    } else {
      // register the action handler to the target (handling this action is done by the store service).
      Object.defineProperty( target, 'effectHandlerConfig', {
          enumerable: true,
          configurable: true,
          value: {
            ...(target as StoreService<any>).effectHandlerConfig,
            [ propertyKey ]: {
              ...defaultConfig,
              ...config,
            }
          }
        }
      );
    }
  };
}
