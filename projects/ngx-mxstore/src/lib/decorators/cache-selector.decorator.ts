import { isDevMode, NgZone } from "@angular/core";

export function CacheSelector( hashFunction?: ( ...args: Array<any> ) => any, keepOldValues: boolean = false ) {
  // @ts-ignore
  return ( target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<any> ) => {
    if ( descriptor.value != null ) {
      descriptor.value = getCachedFunction( descriptor.value, hashFunction, keepOldValues );
    } else if ( descriptor.get != null ) {
      descriptor.get = getCachedFunction( descriptor.get, hashFunction, keepOldValues );
    } else {
      throw new Error('Only put a CacheSelector() decorator on a method or get accessor.');
    }
  };
}

let counter = 0;

export function getCachedFunction( originalMethod: () => void, hashFunction?: ( ...args: Array<any> ) => any, keepOldValues: boolean = true ) {
  const identifier = ++counter;

  // The function returned here gets called instead of originalMethod.
  return function (...args: Array<any>) {
    const propMapName = `__memoized_map_${identifier}`;

    let returnedValue: any;
    // Get or create map
    // @ts-ignore
    if (!this.hasOwnProperty(propMapName)) {
      // @ts-ignore
      Object.defineProperty(this, propMapName, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: new Map<any, any>()
      });

    }
    // @ts-ignore
    const myMap: Map<any, any> = this[propMapName];

    let hashKey: any;

    if (hashFunction) {
      const start = performance.now();
      // @ts-ignore
      hashKey = hashFunction.apply(this, args);

      if (NgZone.isInAngularZone() && isDevMode() && performance.now() - start > 10) {
        console.warn(`creating cache key for ${originalMethod.name} takes ${performance.now() - start}. Change logic behind cacheKey to improve performance.`);
      }
    } else {
      hashKey = args[0];
    }

    // ensure we always have a hashkey
    if (!hashKey) {
      hashKey = 0;
    }

    if (myMap.get(hashKey)) {
      returnedValue = myMap.get(hashKey);
    } else {
      // @ts-ignore
      returnedValue = originalMethod.apply(this, args);
      if (!keepOldValues) {
        myMap.clear();
      }
      myMap.set(hashKey, returnedValue);
    }


    return returnedValue;
  };
}
