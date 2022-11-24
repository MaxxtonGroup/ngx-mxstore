import {ActionUtil} from "../util/action.util";

export function Action( ): MethodDecorator {
  return ( target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor ) => {
    descriptor.value = ActionUtil.createAction<any>(`${(target as {name:string}).name}/${String(propertyKey)}`);
    return descriptor;
  };
}



