import { Subject } from "rxjs";

/**
 * @license
 * Copyright Maxxton Group. All Rights Reserved.
 */

/**
 * Decorator function that provides the Component with an observable that emits a value when ngOnDestroy is called.
 */
export function HookNgOnDestroy( target: any ) {
  const originalNgOnDestroy: () => void = target.prototype.ngOnDestroy;
  target.prototype.hasMxtNgOnDestroyHookDecorator = true;

  if ( !originalNgOnDestroy ) {
    throw new Error( `Trying to us @HookNgOnDestroy without ngOnDestroy will not work in Production mode, implement ngOnDestroy on ${ target.name }.` );
  }

  target.prototype.ngOnDestroy = function (): void {
    // call the original ngOnDestroy logic.
    // @ts-ignore
    originalNgOnDestroy && typeof originalNgOnDestroy === 'function' && originalNgOnDestroy.apply( this, arguments );

    // mxtNgOnDestroyHookSubject will contain the Subject. This is a long variable name to make sure it's unique. (else it might override some custom variable defined inside the component)
    if ( this.mxtNgOnDestroyHookSubject ) {
      this.mxtNgOnDestroyDestroyed = true;
      // Send something to the observable stream to indicate ngOnDestroy is called.
      this.mxtNgOnDestroyHookSubject.next( 'ngOnDestroy' );
      this.mxtNgOnDestroyHookSubject.complete();
      this.mxtNgOnDestroyHookSubject = undefined;
      this.mxtNgOnDestroyHookObservable = undefined;
    } else if ( this.hasMxtNgOnDestroyHookObservable && !this.mxtNgOnDestroyDestroyed ) {
      console.error( 'Cannot trigger onDestroy$ as it is not registered anymore', target.name );
    }
  };

}

/**
 * Property decorator that will make the decorated property contain the ngOnDestroy$;
 */
export function OnDestroy$(): PropertyDecorator {
  return ( target: any, propertyKey: string | symbol ) => {
    Object.defineProperty( target, propertyKey, {
      get () {
        if ( !this.hasMxtNgOnDestroyHookDecorator ) {
          console.error( '@OnDestroy$ is used without @HookOnDestroy' );
        }

        if ( !this.mxtNgOnDestroyHookSubject ) {
          this.mxtNgOnDestroyHookSubject = new Subject();
          this.hasMxtNgOnDestroyHookObservable = true;
        }
        return this.mxtNgOnDestroyHookSubject.asObservable();
      },
      set () {}
    } );
  };
}
