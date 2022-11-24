# ngx-mxstore

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.2.1.

## Installation

```
npm install @ngx-mxstore
```

## Purpose of the ngx-mxstore

- keep state out of components
- it helps to move business logic inside of pure methods
- it helps to create testable code
- 

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

### Selector
A pure function receives the current state of the application and optionally can receive parameters. 
It is used to return a specific value that can be used in a component or another Selector.

- Selectors receive at least the current state of the application.
- Selectors are allowed to receive optional parameters that can be passed through via the component.
- Selectors can return a specific key of the state, or calculate a derivative from the state
- Selectors should be pure
