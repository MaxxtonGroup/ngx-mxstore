

export class StateNotChangedError extends Error {

  public type = 'StateNotChangedError';

  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, StateNotChangedError.prototype);
  }
}

// tslint:disable-next-line:max-classes-per-file
export class AssertUtil {
  static assertChange( stateIsUpToDate: boolean ) {
    if ( stateIsUpToDate ) {
      throw new StateNotChangedError( `No state change needed` );
    }
  }
}
