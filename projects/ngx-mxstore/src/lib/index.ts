import { ActionService } from "./action.service";
import { GlobalStateService } from "./global-state.service";
import { AssertUtil } from './util/assert.util';

export { Action } from './decorators/action.decorator';
export { Effect } from './decorators/effect.decorator';
export { Reducer } from './decorators/reducer.decorator';
export { CacheSelector } from './decorators/cache-selector.decorator';
export { StoreAware, StoreAwareOptions, StoreAwareComponent } from './decorators/store-aware.decorator';
export { ConfigureEffectHandler } from "./decorators/configure-effect-handler.decorator";
export { StoreDependencyService } from './store-dependency.service';
export { StoreService } from './store.service';
export { EffectUtil } from './util/effect.util';
export { ActionUtil } from './util/action.util';
export { SelectorUtil } from './util/selector.util';
export { AssertUtil, StateNotChangedError } from "./util/assert.util";
export { EffectStatus, CrudEffectStatus, ActionMeta, CrudEffectStringStatus } from './models/index';
export { ActionService } from "./action.service";
export { GlobalStateService } from "./global-state.service";
export { ReducerUtil } from "./util/reducer.util";
export { NgxMxstoreModule } from "./ngx-mxstore.module";

export const assertChange = AssertUtil.assertChange;

const enableDebugState = GlobalStateService.enableDebugInfo;
const disableDebugState = GlobalStateService.disableDebugInfo;
const enableDebugActions = ActionService.enableDebugInfo;
const disableDebugActions = ActionService.disableDebugInfo;

export const stateManagementTools = {
  enableDebugState,
  enableDebugActions,
  disableDebugActions,
  disableDebugState,
};
