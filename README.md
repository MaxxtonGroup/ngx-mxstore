# ngx-mxstore

## Installation

```
npm install -s ngx-mxstore
```

## Purpose of the ngx-mxstore
- keep state out of components
- it helps to move business logic inside of pure methods
- it helps to create testable code

## Basic Example
A component can be decorated with the StoreAware decorator. 
This will connect the component with the store and gives it superpowers!

```ts
@Component({
  ...
})
@StoreAware()
export class CalculatorComponent {
  state: CalculatorState;
  
  get currentValue() {
      return CalculatorSelectors.currentValue( this.state );
  }
  
  constructor(private calculator: CalculatorStoreService) {
  }

  add() {
    CalculatorActions.add( { amount: 4 } );
  }
}
```

The StoreAware decorator will find the CalculatorStoreService injected in the constructor
and provide that state inside the component. This state variable will always reflect the
most recent version of the state.

Via actions we can mutate the state. With selectors we can fetch data from the state.

The idea of ngx-mxstore is that you can have many different stores in your application. They will all be stored in a single global state.
The reason of this approach is that you can subdivide your application in different parts and keep the state of each part in a separate store.

Sometimes there is a need to have multiple instances of the same store, this is also possible and will be explained in [the advanced-usage chapter](#advanced-usage).

Ok there are already a couple of terms we need to explain:

## Terms explained

### State
An immutable representation of the applications state. 
The goal is to store the data in a way that is can be easily reused across multiple components. 

The state is stored as a javascript object.

There is one global state across the whole angular application, but it is divided
into several sub-stores.

A sub-store is available whenever there is an instance for the associated store-service.
More on this in the paragraph about store-services.

### Action
When an action is called it will dispatch an event with its payload to the action queue 
that can be resolved by a Reducer or an Effect.

Actions can be called from components, services etc. 
If there is no Reducer or Effect available, the action will simply be ignored.

### Reducer
When an action is dispatched it can be handled by a Reducer to mutate a part of the application state.
This function has the sole responsibility to manipulate and return a new instance of the edited state.

- Reducers should be pure.
- When Reducers manipulate state they must return a new object.
- When Reducers not manipulate state they should return the injected state.

A reducer is a function located in a store-service file. The function is decorated
with the Reducer() Decorator. In this decorator we link an action to this method:

```ts
@Reducer( CalculatorActions.add )
onAdd( payload, state: CalculatorState ) {
  return { currentValue: state.currentValue + payload.amount };
}
```

### Effect
When an action is dispatched it can be handled by an Effect to call a service or do any 
other side effect. When the effect is completed it can mutate the state by calling an Action()
The effect should return an Observable.

- Effects are not allowed to directly manipulate state
- Effects manipulate state via actions.
- Effects are allowed to access variables in a service.
- Effects are allowed to call services.
- Effects are allowed to store information in the url.
- Effects are allowed to retrieve information from the url.
- Etc (everything non-pure)

An effect is a function located in a store-service file. The function is decorated
with the Effect() Decorator. In this decorator we link an action to this method:

```ts
@Effect( CalculatorActions.addFromUrl.start )
addFromUrl( payload, state: CalculatorState ) {
  return this.urlService.getNumberFromUrl().pipe(
    tap((numberFromUrl) => CalculatorActions.addFromUrl.success(numberFromUrl))
  );
}
```

The effect will be called when an action is dispatched. You normally don't call the effect directly. The effect can return an observable that will be subscribed to.
You don't have to unsubscribe from the observable, this is done automatically.

### StoreAware
A class decorator that allows a Component to connect to a Store based service.
This Decorator connects the Injected StoreService to a state property on the 
component and makes sure that this property gets updated on every mutation of the state.

The component must be injected with the Store based service.
Every store based service requires a StoreAware decorator. When multiple storeServices 
are injected it is required to define the storeKey and the state Key param in the decorator.
Changes to the assigned property are pushed trough ngOnChanges to make it possible to 
update component state when mutations to application state happen. 

```ts
@Component({
  ...
})
@StoreAware({ storeKey: 'storeService', stateKey: 'state' })
@StoreAware({ storeKey: 'loadingStoreService', stateKey: 'loadingState' })
export class MyComponent {
  protected storeService = inject(StoreService);
  protected state!: BarrierControlBarrierDashboardInterface;

  protected loadingStoreService = inject(LoadingStoreService);
  protected loadingState!: LoadingStoreState;
}
```

### Selector
A pure function receives the current state of the application and optionally can receive parameters. 
It is used to return a specific value that can be used in a component or another Selector.

- Selectors receive at least the current state of the application.
- Selectors are allowed to receive optional parameters that can be passed through via the component.
- Selectors can return a specific key of the state, or calculate a derivative from the state
- Selectors should be pure

```ts
static getPropertyFromState(state: MyState): number {
    return state.property;
  );
}
```

The reason to use selectors, and not directly access the state, is that the component or any other code 
should not be aware of the structure of the state. This makes it easier to refactor the state without 
changing the components.

### CacheSelector
Sometimes a selector is more complex and is being called multiple times in a short period. In that case it can be useful to cache the result of the selector. This can be done by adding the CacheSelector decorator to the selector.
The cacheSelector decorator takes a function that returns a unique key for the selector. This key is used to cache the result of the selector. The key is calculated based on the state and the parameters passed to the selector.

```ts
@CacheSelector((state: CalculatorState) => state.number1 + state.number2)
static getSum(state: CalculatorState): number {
    return state.number1 + state.number2;
  );
}
```

Another use of the CacheSelector is when a selector returns a unique array or object every time it is called. In that case it can be useful to cache the result of the selector to prevent unnecessary rerenders of the component.

```ts
@CacheSelector((state: MyState) => [...state.array, ...state.array2].map(item => item.id).join(''))
static getArray(state: MyState): number[] {
    return [...state.array, ...state.array2];
  );
}
```

## Helpers
The library provides a couple of helper functions to make it easier to work with the store.

### ActionUtil.createActionWithSuccessAndFailure and EffectUtil.withActionHandlers
The createActionWithSuccessAndFailure and the withActionHandlers helper functions can be used together to create an action with a success and failure action, and handle loading as well.
So, oftentimes you have an effect that calls a service that can either succeed or fail. If you want to handle this consistently, without repeating the same code over and over, you can use these helper functions.

When defining the action you can use the createActionWithSuccessAndFailure function to create an action with a success and failure action.
Instead of having an action, say: 'fetchUser', the helper functions create four actions: 'fetchUser.start', 'fetchUser.success', 'fetchUser.error' and 'fetchUser.setStatus'

```ts
// my-store.actions.ts
export class TemplateEditorActions {
  
export const MyActions = {
  static fetchUser = ActionUtil.createActionWithSuccessAndFailure<number, UserModel>( 'MyActions/fetchUser' );
};
```

So now we have four actions that we can use in the store service for the reducers and effects:

```ts
// my-store.service.ts
// ..

@Effect( MyActions.fetchUser.start )
fetchUser( payload: number ) {
  return EffectUtil.withActionHandlers(
    () => this.userService.getUser( payload ),
    MyActions.fetchUser // <-- return the action so that withActionHandlers can handle the success and failure
  );
}

@Reducer( MyActions.fetchUser.success )
onFetchUserSuccess( user: UserModel, state: MyState ) {
  return { ...state, user };
}
```

It is also possible to change the result before passing it on to the success action:

```ts
@Effect( MyActions.fetchUser.start )
fetchUser( payload: number ) {
  return EffectUtil.withActionHandlers(
    () => this.userService.getUser( payload ),
    { 
      ...MyActions.fetchUser,
      success: (response: Response<UserModel>) => MyActions.fetchUser.success(response[0]) // <-- change the result before passing it on
    }
  );
}
```

Examples of the setStatus and error actions:

```ts
@Reducer( MyActions.fetchUser.setStatus )
onFetchUserSetStatus( status: EffectStatus, state: MyState ) {
  return { ...state, fetchUserIsLoading: status === status.Pending };
}

@Effect( MyActions.fetchUser.error )
fetchUserError() {
  this.notifyService.error( 'Failed to fetch user' );
}
```

In the setStatus method you see that the type of status is EffectStatus. This is an enum that is provided by the library. The EffectStatus enum is used to represent the status of an effect in the state management system. It is defined in the core/lib/state-management/src/models/effect-status.model.ts file.  Here are the possible values for EffectStatus:  
IDLE: This status indicates that the effect is idle and not currently in progress. It is the default status of an effect.  
PENDING: This status indicates that the effect has been triggered and is currently in progress.  
DONE: This status indicates that the effect has completed successfully.  
ERROR: This status indicates that an error occurred while executing the effect.  

### ReducerUtil.setLoadingStatusKey
Because the loading status is a common pattern, the library provides a helper function to set the loading status key in the state. This function can be used as a reducer to set the loading status key in the state.

In the following example the loading status key is set to 'uploadDocumentStatus' when the action 'uploadDocument.setStatus' is dispatched.
```ts
// my-store.service
// ..
@Reducer(MyActions.uploadDocument.setStatus)
uploadDocumentStatus = ReducerUtil.setLoadingStatusKey('uploadDocumentStatus');
```

## Advanced usage

### Limit the triggering of an effect
Sometimes an effect get triggered multiple times in a short period. In that case it can be useful to limit the triggering of the effect. 
Most of the times this happens when you have multiple actions that trigger the same effect, and you have no control when these actions are triggered.

In this case you can use the ConfigureEffectHandler decorator to limit the triggering of the effect. The decorator takes an object with the following properties:
- takeLatest: boolean - If true, the effect will only be triggered when the last action is triggered. If false, the effect will be triggered for every action.
- delayTime: number - The time in milliseconds that the effect will be delayed. If the effect is triggered multiple times in the delayTime, only the last effect will be triggered.

```ts
@Effect( MyActions.urlChange.start )
@Effect( MyActions.buttonClick.start )
@ConfigureEffectHandler({ takeLatest: true, delayTime: 100 })
myEffect( payload, state: MyState ) {
  return this.urlService.getNumberFromUrl().pipe(
    tap((numberFromUrl) => MyActions.urlChange.success(numberFromUrl))
  );
}
```

### Listen to an action outside the store service
Sometimes you want to listen to an action outside the store service. Most of the time this is not necessary, and you should use this with care.
Normally you should handle actions inside the store service, but sometimes there are limitations you can't work around.

In this case you can use the ActionService to listen to an action. The ActionService is a singleton that can be used to listen to actions from anywhere in the application.

```ts
// Listen to an action in a component
ActionService.onAction$( TemplateActions.createNewTemplateDraftVersion.success )
  .pipe( takeUntil( this.onDestroy$ ), delay( 100 ) ).subscribe( () => {
    this.resetDraftChangeToDefault();
    this.resetTemplateValues();
} );
```

### Cancel an effect
When an effect is triggered, it will run until it is completed. Sometimes you want to cancel an effect when a specific action is triggered. In this case you can use the takeUntil operator to cancel the effect.

```ts
@Effect( StoreActions.startExecutionOfRequest.start )
startExecution( payload: { property: number } ) {

  return EffectUtil.withActionHandlers(
    () => of( null )
      .pipe(
        delay( 100 ),
        mergeMap( () => this.myService.getSomethingFromBackend( payload.property ) ),
        mergeMap( ( result: MyModel ) => {
          return this.myOtherService.getSomethingFromLocalStorage( result.id );
        } ),
        takeUntil( ActionUtil.onFirstAction$(
          StoreActions.startOtherExecutionOfRequest.start
        ) )
      ),
    {
      ...StoreActions.startExecutionOfRequest,
    }
  );
}
```

### Having multiple instances of a store 
Depending on how you want to structure your application there might be a need to have multiple instances of the same store.
E.g. when having a component with a store that is used multiple times on the same page.

This is possible by providing the store service at the component level. This way the store service is only available for that component and its children.
When multiple instances of the same store exists ngx-mxstore will make sure that the state of each store is kept separate, by giving it a unique name.

Be aware that actions being triggered will be listened by all instances of the store. Sometimes this can be a good thing but oftentimes
you want a certain action only to be listened by a specific instance of the store.

To manage this you can give every instance of the store a unique name that set on the component level. Then give every
action a context that is the same as the unique name of the store. In the effects and reducers you can check if the context
is the same as the unique name of the store.

## Testing

### Reducers
Testing reducers is easy. Just call the reducer with the current state and the payload and check the result.

```ts
it('should add 4 to the current value', () => {
  const state = { currentValue: 5 };
  const result = calculatorReducer.onAdd( { amount: 4 }, state );
  expect( result.currentValue ).toBe( 9 );
});
```

### Effects
Testing effects is a bit more complex. You need to mock the services that are being called in the effect. You need to
know about the Angular TestBed and how to use it. Read more about this [[in the Angular documentation]](https://angular.io/guide/testing-services#angular-testbed).

Also you need to know about the jest spy functions. Read more about this [[in the jest documentation]](https://jestjs.io/docs/en/jest-object#jestspyonobject-methodname).

In this example we will use [[jest-generic-mock-class]](https://github.com/MaxxtonGroup/jest-generic-mock-class) to mock services.

```ts
import { EffectTester } from 'ngx-mxstore';
import { GenericMockClass } from 'jest-generic-mock-class';
import { MyStoreService } from './my-store.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('MyStoreService', () => {
  let service: MyStoreService;
  let effectTester: EffectTester;
  
  const apiServiceMock: GenericMockClass<ApiService> = GenericMockClass.create<ApiService>({
    functionToTest: jest.fn().mockReturnValue(of([{ id: 1, name: 'test' }])),
  });
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MyStoreService,
        { provide: ApiService, useValue: apiServiceMock },
      ],
    });
    service = TestBed.inject(MyStoreService);
    effectTester = new EffectTester(service);
  });
  
  it('should test an effect', (done) => {
    effectTester
      .expectEffect(MyStoreActions.doSomething.start)
      .withState({
        ...MyStoreService.initialState,
      })
      .toCallAction(MyStoreActions.doSomething.success)
      .run(() => {
        expect(apiServiceMock.getSpyFor('functionToTest')).toHaveBeenCalled();
        done();
      });
  });
});
```
