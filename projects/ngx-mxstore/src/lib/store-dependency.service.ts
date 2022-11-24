import { NgZone } from "@angular/core";

export class StoreDependencyService {
  constructor( public ngZone: NgZone ) { }
}
