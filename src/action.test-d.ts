import { describe, it, expectTypeOf } from 'vitest';
import { createAction } from './action';
import { createEffect, createEvent, createStore, EventCallable } from 'effector';

describe('createAction/types', () => {
  it('target', () => {
    createAction({
      target: {
        $store: createStore(''),
        event: createEvent<number>(),
        fx: createEffect<null, boolean>(),
      },
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<{
          $store: ((valueOfFunc: string | ((state: string) => string)) => string) & { reinit: () => void };
          event: (payload: number) => number;
          fx: (payload: null) => null;
        }>();
      },
    });

    createAction({
      target: createStore(''),
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<
          ((valueOfFunc: string | ((state: string) => string)) => string) & { reinit: () => void }
        >();
      },
    });

    const target = createEvent();
    createAction({
      target,
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<(valueOfFunc: void) => void>();
      },
    });

    createAction({
      target: createEvent<string>(),
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<(valueOfFunc: string) => string>();
      },
    });

    createAction({
      target: createEffect<void, string>(),
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<(valueOfFunc: void) => void>();
      },
    });

    createAction({
      target: createEffect<string, string>(),
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<(valueOfFunc: string) => string>();
      },
    });
  });

  it('external clock', () => {
    createAction({
      clock: createEvent<string>(),
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });
    createAction({
      clock: createEvent(),
      target: {},
      // @ts-expect-error
      fn: (target, clock) => {},
    });
    createAction({
      clock: [createEvent<string>(), createStore(123), createEffect<boolean, void>()],
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toEqualTypeOf<string | number | boolean>();
      },
    });
    createAction({
      clock: [createEvent<string>(), createStore(123), createEffect<boolean, void>()],
      source: createStore(''),
      target: {},
      fn: (_, __, clock) => {
        expectTypeOf(clock).toEqualTypeOf<string | number | boolean>();
      },
    });
    const nothing = createAction({
      clock: createEvent(),
      target: {},
      fn: (target) => {},
    });
    expectTypeOf(nothing).toBeVoid();
  });

  it('returned clock', () => {
    const clock1 = createAction({
      target: {},
      fn: (_, clock: string) => {},
    });
    expectTypeOf(clock1).toEqualTypeOf<EventCallable<string>>();

    const clock2 = createAction({
      target: {},
      fn: (_, clock: string | number | boolean) => {},
    });
    expectTypeOf(clock2).toEqualTypeOf<EventCallable<string | number | boolean>>();

    const clock3 = createAction({
      target: {},
      fn: (_, clock) => {
        // @ts-expect-error todo
        expectTypeOf(clock).toBeNever();
      },
    });
    // @ts-expect-error todo
    expectTypeOf(clock3).toEqualTypeOf<EventCallable<void>>();

    const clock4 = createAction({
      target: {},
      fn: (_) => {},
    });
    expectTypeOf(clock4).toEqualTypeOf<EventCallable<void>>();

    const clock5 = createAction({
      source: createStore(''),
      target: {},
      fn: (_, __, clock: string | number | null) => {},
    });
    expectTypeOf(clock5).toEqualTypeOf<EventCallable<string | number | null>>();
  });

  it('source', () => {
    createAction({
      source: createStore(''),
      target: {},
      fn: (_, source) => {
        expectTypeOf(source).toBeString();
      },
    });
    createAction({
      source: {
        foo: createStore(''),
        bar: createStore(1),
      },
      target: {},
      fn: (_, source) => {
        expectTypeOf(source).toEqualTypeOf<{ foo: string; bar: number }>();
      },
    });
    createAction({
      source: {
        $foo: createStore(''),
        $bar: createStore(1),
      },
      target: {},
      fn: (_, source) => {
        expectTypeOf(source).toEqualTypeOf<{ foo: string; bar: number }>();
      },
    });
    createAction({
      source: {
        $foo: createStore(''),
        bar: createStore(1),
      },
      target: {},
      fn: (_, source) => {
        expectTypeOf(source).toEqualTypeOf<{ foo: string; bar: number }>();
      },
    });
  });
});
