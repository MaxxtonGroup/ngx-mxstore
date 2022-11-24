import { EffectStatus } from "../models";

export class ReducerUtil {
  static setLoadingStatusKey<STATEI>( key: keyof STATEI ) {
    return ( status: EffectStatus, state: STATEI ) => {
      return {
        ...state,
        [ key ]: status,
      };
    };
  }
}
