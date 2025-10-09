import { describe, it, expectTypeOf } from 'vitest';
import { createAction } from './action';
import { createEffect, createEvent, createStore, EventCallable, UnitTargetable } from 'effector';

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
    createAction(createEvent<any>(), {
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeAny();
      },
    });
    createAction(createEvent<any>(), {
      source: createStore(1),
      target: {},
      fn: (_, _src, clock) => {
        expectTypeOf(clock).toBeAny();
      },
    });
    createAction({
      clock: createEvent<any>(),
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeAny();
      },
    });
    createAction({
      clock: createEvent<any>(),
      source: createStore(1),
      target: {},
      fn: (_, _src, clock) => {
        expectTypeOf(clock).toBeAny();
      },
    });

    createAction(createEvent<string>(), {
      // @ts-expect-error
      clock: createEvent<string>(),
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });
    createAction(createEvent<string>(), {
      // @ts-expect-error
      clock: createEvent<string>(),
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });

    createAction({
      clock: createEvent<string>(),
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });
    createAction(createEvent<string>(), {
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });
    createAction({
      clock: createEvent<string>(),
      source: createStore(1),
      target: {},
      fn: (_, src, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });
    createAction(createEvent<string>(), {
      source: createStore(1),
      target: {},
      fn: (_, src, clock) => {
        expectTypeOf(clock).toBeString();
      },
    });

    createAction({
      clock: [createEvent<string>(), createStore(123), createEffect<boolean, void>()],
      target: {},
      fn: (_, clock) => {
        expectTypeOf(clock).toEqualTypeOf<string | number | boolean>();
      },
    });
    createAction([createEvent<string>(), createStore(123), createEffect<boolean, void>()], {
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
    createAction([createEvent<string>(), createStore(123), createEffect<boolean, void>()], {
      source: createStore(''),
      target: {},
      fn: (_, __, clock) => {
        expectTypeOf(clock).toEqualTypeOf<string | number | boolean>();
      },
    });

    expectTypeOf(
      createAction({
        clock: createEvent(),
        target: {},
        fn: (target) => {},
      }),
    ).toBeVoid();
    expectTypeOf(
      createAction(createEvent(), {
        target: {},
        fn: (target) => {},
      }),
    ).toBeVoid();
    expectTypeOf(
      createAction({
        clock: createEvent(),
        source: createStore(''),
        target: {},
        fn: (target) => {},
      }),
    ).toBeVoid();
    expectTypeOf(
      createAction(createEvent(), {
        source: createStore(''),
        target: {},
        fn: (target) => {},
      }),
    ).toBeVoid();
  });

  it('returned clock', () => {
    const clock1 = createAction({
      target: {},
      fn: (_, clock: string) => {},
    });
    expectTypeOf(clock1).toEqualTypeOf<EventCallable<string>>();
    const clock11 = createAction({
      source: createStore(1),
      target: {},
      fn: (_, src, clock: string) => {},
    });
    expectTypeOf(clock1).toEqualTypeOf<EventCallable<string>>();
    expectTypeOf(clock11).toEqualTypeOf<EventCallable<string>>();

    const clock2 = createAction({
      target: {},
      fn: (_, clock: string | number | boolean) => {},
    });
    const clock22 = createAction({
      source: createStore(1),
      target: {},
      fn: (_, src, clock: string | number | boolean) => {},
    });
    expectTypeOf(clock2).toEqualTypeOf<EventCallable<string | number | boolean>>();
    expectTypeOf(clock22).toEqualTypeOf<EventCallable<string | number | boolean>>();

    const clock3 = createAction({
      target: {},
      fn: (_, clock) => {
        // @ts-expect-error todo
        expectTypeOf(clock).toBeNever();
      },
    });
    const clock33 = createAction({
      source: createStore(1),
      target: {},
      fn: (_, clock) => {
        // @ts-expect-error todo
        expectTypeOf(clock).toBeNever();
      },
    });
    expectTypeOf(clock3).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(clock33).toEqualTypeOf<EventCallable<void>>();

    const clock4 = createAction({
      target: {},
      fn: (_) => {},
    });
    const clock44 = createAction({
      source: createStore(1),
      target: {},
      fn: (_) => {},
    });
    expectTypeOf(clock4).toEqualTypeOf<EventCallable<void>>();
    expectTypeOf(clock44).toEqualTypeOf<EventCallable<void>>();

    const clock5 = createAction({
      source: createStore(''),
      target: {},
      fn: (_, __, clock: string | number | null) => {},
    });
    const clock55 = createAction({
      target: {},
      fn: (_, clock: string | number | null) => {},
    });
    expectTypeOf(clock5).toEqualTypeOf<EventCallable<string | number | null>>();
    expectTypeOf(clock55).toEqualTypeOf<EventCallable<string | number | null>>();
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

  it('can be passed as callback without manual clock type declaration', () => {
    const factory = ({}: { onSubmit: UnitTargetable<string | number> }) => null;

    factory({
      onSubmit: createAction({
        source: createStore(1),
        target: {},
        fn: (target, source, clock) => {
          expectTypeOf(clock).toEqualTypeOf<string | number>();
        },
      }),
    });

    factory({
      onSubmit: createAction({
        target: {},
        fn: (target, clock) => {
          expectTypeOf(clock).toEqualTypeOf<string | number>();
        },
      }),
    });
  });
});
