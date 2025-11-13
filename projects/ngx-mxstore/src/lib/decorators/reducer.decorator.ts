import {StoreService} from "../store.service";

export interface ReducerHandler {
  propertyKey: string | symbol;
  priority: number;
}

export function Reducer(action: any, priority?: number): PropertyDecorator {
  return ( target: Object, propertyKey: string | symbol ) => {
    const targetStoreService = target.constructor as unknown as StoreService<any>;

    // Default priority is 0 if not specified
    const reducerPriority = priority !== undefined ? priority : 0;

    // Initialize actionHandlers if it doesn't exist
    if (!targetStoreService.actionHandlers) {
      Object.defineProperty( target, 'actionHandlers', {
        enumerable: true,
        configurable: true,
        value: {}
      });
    }

    // Get existing handlers for this action type
    const existingHandlers = targetStoreService.actionHandlers?.[action.ACTION_TYPE];
    let handlersArray: ReducerHandler[] = [];

    // Handle both old format (single propertyKey) and new format (array)
    if (existingHandlers) {
      if (Array.isArray(existingHandlers)) {
        handlersArray = [...existingHandlers];
      } else {
        // Convert old format to new format (assume default priority 0)
        handlersArray = [{ propertyKey: existingHandlers, priority: 0 }];
      }
    }

    // Check for duplicate priority
    const duplicatePriority = handlersArray.find(h => h.priority === reducerPriority);
    if (duplicatePriority) {
      throw new Error(`It is not possible to have multiple REDUCERS with the same priority for the same action in the same service.
      action: ${action.ACTION_TYPE}, priority: ${reducerPriority}, reducer: ${target.constructor.name}.${Object(propertyKey)}`);
    }

    // Add the new reducer handler
    const newHandler: ReducerHandler = { propertyKey, priority: reducerPriority };
    handlersArray.push(newHandler);

    // Sort by priority (lower numbers = higher priority, executed first)
    handlersArray.sort((a, b) => a.priority - b.priority);

    // Update actionHandlers with the sorted array
    Object.defineProperty( target, 'actionHandlers', {
      enumerable: true,
      configurable: true,
      value: {
        ...(target as StoreService<any>).actionHandlers,
        [ action.ACTION_TYPE ]: handlersArray
      }
    });
  };
}
