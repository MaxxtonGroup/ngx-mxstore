# ngx-mxstore

## Installation

```
npm install @ngx-mxstore
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
        BarrierControlBarrierDashboardStoreService,
        { provide: ApiService, useValue: apiServiceMock },
      ],
    });
    service = TestBed.inject(BarrierControlBarrierDashboardStoreService);
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
