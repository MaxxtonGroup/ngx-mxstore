import { NgModule } from '@angular/core';
import { MX_STORE_INITIAL_STATE, MX_STORE_STORE_ID } from "./tokens";
import { StoreService } from "./store.service";

@NgModule({
  providers: [
    { provide: MX_STORE_STORE_ID, useValue: null },
    { provide: MX_STORE_INITIAL_STATE, useValue: null },
    StoreService,
  ]
})
export class NgxMxstoreModule { }
