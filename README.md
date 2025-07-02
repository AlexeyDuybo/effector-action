# Effector Action

This library provides api which allows changing the state of stores or calling events in an imperative style without breaking the static approach of the Effector. This should eliminate the problem when one synchronous task is split into several samples, or when the task turns into a mess of nested samples, conditions and splits.
Therefore this abstraction can serve as a convenient replacement for one or more synchronous operators that are responsible for a single action.

- [Library status](#library-status)
- [Install](#install)
- [Usage](#usage)
  - [Change units](#change-units)
  - [Сhange store using reducer func](#сhange-store-using-reducer-func)
  - [Reset store](#reset-store)
  - [Clock](#clock)
  - [Alternative api for external clock usage (Recommended)](#alternative-api-for-external-clock-usage)
  - [Source](#source)
  - [Removing dollar prefix from store names in source](#removing-dollar-prefix-from-store-names-in-source)
- [Limitation](#limitation)
- [Under the hood](#under-the-hood)

## Library status
This library is production ready, and [officially recommended](https://effector.dev/en/guides/best-practices/#create-action) for use by Effector community.

Also this library [will be moved to the Effector core API in the next major release](https://github.com/effector/effector/issues/1275), so start using it now.

## Install

```bash
npm i --save effector-action
```

This requires effector >=23 and patronum >=2.1.0.

## Usage

### Change units

All units in `target` are available for change in `fn`. To change the value of a store or trigger an event simply call it and pass the appropriate value.

```ts
import { createAction } from 'effector-action';

const $store = createStore('');
const event = createEvent<number>();
const effectFx = createEffect<boolean, void>();

const changeValues = createAction({
  target: {
    $store,
    event,
    effectFx,
  },
  fn: (target) => {
    target.$store('foo');
    target.event(123);
    target.effectFx(false);
  },
});

changeValues();
```

Or you can change single unit

```ts
import { createAction } from 'effector-action';

const $store = createStore('');

const changeValue = createAction({
  target: $store,
  fn: (target) => {
    target('foo');
  },
});

changeValue();
```

You can change the specified units by condition

```ts
const changeValues = createAction({
  target: {
    $store,
    event,
    effectFx,
  },
  fn: (target) => {
    const condition = Math.random() > 0.5;

    if (condition) {
      target.$store('foo');
    } else {
      target.event(123);
    }

    target.effectFx(condition);
  },
});

changeValues();
```

### Сhange store using reducer func

You can change store values ​​using the reducer function and based on the current state of the store.

```ts
const inc = createAction({
  target: {
    $counter,
  },
  fn: (target) => {
    target.$counter((counter) => counter + 1); // get current counter state and increment it
  },
});
```

### Reset store

You can just reset store using the reinit method.

```ts
const $store = createStore('');

const changeValues = createAction({
  target: {
    $store,
  },
  fn: (target) => {
    target.$store.reinit();
  },
});
```

### Clock

To run `fn` you need to trigger the clock.
Clock can be specified in the clock field

```ts
createAction({
  clock: $store,
  target,
  fn,
});

createAction({
  clock: [$store, event],
  target,
  fn,
});
```

Сlock value is available in the last parameter of `fn`

```ts
const clock = createEvent<string>();

createAction({
  clock: [$store, event],
  target,
  fn: (target, clock) => {
    // clock is string
    target.$someStore(clock.toLowerCase());
  },
});
```

If clock is not specified then `createAction` will return event as clock

```ts
const clock = createAction({
  target,
  fn,
});
```

To specify the type for the returned clock you need to manually add it

```ts
const clock = createAction({
  target,
  fn: (target, clock: string) => {}, // specify clock type
});

// clock = Event<string>
```

### Alternative api for external clock usage

You can specify external clock in the first argument.

```ts
const inputChanged = createEvent<string>();
const $lowerCaseInput = createStore('');

createAction(inputChanged, {
  target: { $lowerCaseInput },
  fn: (target, clock) => {
    target.$lowerCaseInput(clock.toLowerCase());
  },
});
```

I recommend using this method because you can see the clock name even if the code blocks are folded in your ide.

<img src="./docs/img/clock-as-first-arg.png" alt="clock as first arg" width="400"/>

VS When clock is in the config you don't see its name

<img src="./docs/img/clock-in-cfg.png" alt="clock as first arg" width="400"/>

### Source

Analog of source from `sample`. Source values ​​are available in the second parameter of `fn`

```ts
const clock = createAction({
    source: {
        foo: $store1,
        bar: $store2
    }
    target,
    fn: (target, { foo, bar }, clock: string) => {};
})
```

### Removing dollar prefix from store names in source

To avoid duplication of store names in the source, dollar prefixes are removed automatically

```ts
const clock = createAction({
    source: {
        $longStoreName1 // short naming
        longStoreName2: $longStoreName2 // default naming
    }
    target,
    fn: (
      target, { longStoreName1, longStoreName2 }, clock: string) => {
        target.doSomething(longStoreName1) // dollar prefix removed!
      };
})
```

## Limitation

### Functions that change units should be called no more than once.

If it was called multiple times, only the last call will be counted.

```ts
const changeValues = createAction({
  target: {
    $store,
  },
  fn: (target) => {
    target.$store('foo');
    target.$store('bar'); // only last call will be counted
  },
});

changeValue();

$store; // state = bar
```

### Only sync function allowed in fn

```ts
const changeValues = createAction({
  target: {
    $users,
  },
  fn: async (target) => {
    const data = await loadUsers();

    target.$users(data); // will not work!
  },
});
```

## Under the hood

Under the hood it's an abstraction over sample and **_[patronum/spread](https://patronum.effector.dev/methods/spread/)_**.

```ts
const clock = createEvent();

createAction({
  clock,
  source: { foo: $foo, bar: $bar },
  target: {
    event,
    $store,
    effectFx,
  },
  fn: (target, { foo, bar }, clock) => {
    const condition = Math.random() > 0.5;

    if (condition) {
      target.event(foo);
    } else {
      target.$store(bar);
    }

    target.effectFx(clock);
  },
});

// is equivalent to

sample({
  clock,
  source: { foo: $foo, bar: $bar },
  fn: ({ foo, bar }, clock) => {
    const result = {};

    const condition = Math.random() > 0.5;

    if (condition) {
      result['event'] = foo;
    } else {
      result['$store'] = bar;
    }

    result['effectFx'] = clock;

    return result;
  },
  target: spread({
    event,
    $store,
    effectFx,
  }),
});
```
