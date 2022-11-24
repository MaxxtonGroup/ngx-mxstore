import { Observable, of as observableOf } from 'rxjs';

import { delay,  mergeMap, takeUntil, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { EffectStatus } from "../models";
import { ActionUtil } from "./action.util";

export class EffectUtil {
  static withStatus<S>( obs$: () => Observable<S>, setStatus: ( status: EffectStatus ) => void = () => {} ) {
    return EffectUtil.withActions( obs$,
      () => setStatus( EffectStatus.DONE ),
      () => setStatus( EffectStatus.ERROR ),
      () => setStatus( EffectStatus.PENDING )
    );
  }

  static withActions<S>( obs$: () => Observable<S>, onCompleteSuccess: ( lastPayload: S ) => void, onError: ( error: any ) => void, onStart?: () => void ): Observable<S> {
    let lastPayload: S;
    let emittedSuccessFully = false;
    return observableOf( null ).pipe(
      tap( () => onStart && onStart() ),
      mergeMap( obs$ ),
      tap(
        ( payload ) => {
          lastPayload = payload;
          emittedSuccessFully = true;
        },
        ( error ) => {
          emittedSuccessFully = false;
          if ( onError ) {
            onError( error );
          }
        },
        () => emittedSuccessFully && onCompleteSuccess( lastPayload )
      ), );
  }

  static withActionHandlers<S>( obs$: () => Observable<S>, actionHandlers: ReturnType<typeof ActionUtil.createActionWithSuccessAndFailure<any, S>> ) {
    return EffectUtil.withStatus( () =>
        EffectUtil.withActions( obs$,
          actionHandlers.success,
          actionHandlers.error,
        ),
      typeof actionHandlers.setStatus === "function" ? actionHandlers.setStatus : () => {}
    );
  }

  static delayOnActions<S>( obs$: () => Observable<S>, delayOnListOfActions: Array<any>, delayInMs: number = 100 ) {
    return of( null )
      .pipe(
        delay( delayInMs ),
        mergeMap( obs$ ),
        takeUntil( ActionUtil.onFirstAction$(
          ...delayOnListOfActions
        ) )
      );
  }
}

