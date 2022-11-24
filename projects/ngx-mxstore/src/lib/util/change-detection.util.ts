/**
 * @license
 * Copyright Maxxton Group. All Rights Reserved.
 */

/**
 * Used to safely detectChanges. Will not fail if the cdr is already destroyed
 *
 * @author P.Kromhout (p.kromhout@maxxton.com)
 */
export function detectChanges( cdr: any ): void {
  if ( cdr && 'destroyed' in cdr && !!cdr.context && !cdr.destroyed ) {
    cdr.detectChanges();
  } else if ( !cdr || !( 'destroyed' in cdr ) ) {
    console.warn( 'Trying to detectChanges using a ChangeDetectorRef that is not an instance of ViewRef.' );
  }
}

/**
 * Used to safely mark for check. Will not fail if the cdr is already destroyed
 *
 * @author P.Kromhout (p.kromhout@maxxton.com)
 */
export function markForCheck( cdr: any ): void {
  if ( cdr && 'destroyed' in cdr && !!cdr.context && !cdr.destroyed ) {
    cdr.markForCheck();
  } else if ( !cdr || !( 'destroyed' in cdr ) ) {
    console.warn( 'Trying to markForCheck using a ChangeDetectorRef that is not an instance of ViewRef.' );
  }
}


