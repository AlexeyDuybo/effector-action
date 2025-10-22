import { describe, it, expectTypeOf } from 'vitest';
import { createAsyncAction } from './async-action';
import { createEffect, createEvent, createStore, Effect, UnitTargetable } from 'effector';

describe('createAsyncAction/types', () => {
  it('target', () => {
    createAsyncAction({
      target: {
        $store: createStore(''),
        event: createEvent<number>(),
        fx: createEffect<null, boolean>(),
      },
      fn: (target) => {
        expectTypeOf(target).toEqualTypeOf<{
          $store: ((valueOfFunc: string) => string) & { reinit: () => void };
          event: (payload: number) => number;
          fx: (payload: null) => Promise<boolean>;
        }>();
      },
    });

    it('effect params', () => {
      const clock1 = createAsyncAction({
        target: {},
        fn: (_, clock: string) => {},
      });
      expectTypeOf(clock1).toEqualTypeOf<Effect<string, void, unknown>>();
      const clock11 = createAsyncAction({
        source: createStore(1),
        target: {},
        fn: (_, src, clock: string) => {
          return 10;
        },
      });
      expectTypeOf(clock11).toEqualTypeOf<Effect<string, number, unknown>>();

      const clock2 = createAsyncAction({
        target: {},
        fn: (_, clock: string | number | boolean) => {},
      });
      expectTypeOf(clock2).toEqualTypeOf<Effect<string | number | boolean, void, unknown>>();
      const clock22 = createAsyncAction({
        source: createStore(1),
        target: {},
        fn: async (_, src, clock: string | number | boolean) => {
          return 10;
        },
      });
      expectTypeOf(clock22).toEqualTypeOf<Effect<string | number | boolean, number, unknown>>();

      const clock3 = createAsyncAction({
        target: {},
        fn: (_, clock) => {
          // @ts-expect-error todo
          expectTypeOf(clock).toBeNever();
        },
      });
      const clock33 = createAsyncAction({
        source: createStore(1),
        target: {},
        fn: (_, __, clock) => {
          // @ts-expect-error todo
          expectTypeOf(clock).toBeNever();
        },
      });
      expectTypeOf(clock3).toEqualTypeOf<Effect<void, void, unknown>>();
      expectTypeOf(clock33).toEqualTypeOf<Effect<void, void, unknown>>();

      const clock4 = createAsyncAction({
        target: {},
        fn: (_) => {},
      });
      const clock44 = createAsyncAction({
        source: createStore(1),
        target: {},
        fn: (_) => {},
      });
      expectTypeOf(clock4).toEqualTypeOf<Effect<void, void, unknown>>();
      expectTypeOf(clock44).toEqualTypeOf<Effect<void, void, unknown>>();

      const clock5 = createAsyncAction({
        source: createStore(''),
        target: {},
        fn: (_, __, clock: string | number | null) => {},
      });
      const clock55 = createAsyncAction({
        target: {},
        fn: (_, clock: string | number | null) => {},
      });
      expectTypeOf(clock5).toEqualTypeOf<Effect<string | number | null, void, unknown>>();
      expectTypeOf(clock55).toEqualTypeOf<Effect<string | number | null, void, unknown>>();
    });

    it('config fn', () => {
      const fx1 = createAsyncAction(() => ({
        source: createStore(''),
        target: { target: createStore('') },
        fn: (target, getSource, clock: string) => {
          expectTypeOf(target).toEqualTypeOf<{
            target: ((valueOrFn: string) => string) & {
                reinit: () => void;
            };
          }>()
          expectTypeOf(getSource).toEqualTypeOf<() => Promise<string>>()
          return 10;
        }
      }));
      expectTypeOf(fx1).toEqualTypeOf<Effect<string, number, unknown>>()
      const fx2 = createAsyncAction(() => ({
        source: createStore(''),
        target: { target: createStore('') },
        fn: (target, getSource) => {
          expectTypeOf(target).toEqualTypeOf<{
            target: ((valueOrFn: string) => string) & {
                reinit: () => void;
            };
          }>()
          expectTypeOf(getSource).toEqualTypeOf<() => Promise<string>>()
          return 10;
        }
      }));
      expectTypeOf(fx2).toEqualTypeOf<Effect<void, number, unknown>>()
      const fx3 = createAsyncAction(() => ({
        target: { target: createStore('') },
        fn: (target) => {
          expectTypeOf(target).toEqualTypeOf<{
            target: ((valueOrFn: string) => string) & {
                reinit: () => void;
            };
          }>()
          return 10;
        }
      }));
      expectTypeOf(fx3).toEqualTypeOf<Effect<void, number, unknown>>()
    })

    it('source', () => {
      createAsyncAction({
        source: createStore(''),
        target: {},
        fn: (_, source) => {
          expectTypeOf(source).toEqualTypeOf<() => Promise<string>>();
        },
      });
      createAsyncAction({
        source: {
          foo: createStore(''),
          bar: createStore(1),
        },
        target: {},
        fn: (_, source) => {
          expectTypeOf(source).toEqualTypeOf<() => Promise<{ foo: string; bar: number }>>();
        },
      });
      createAsyncAction({
        source: {
          $foo: createStore(''),
          $bar: createStore(1),
        },
        target: {},
        fn: (_, source) => {
          expectTypeOf(source).toEqualTypeOf<() => Promise<{ foo: string; bar: number }>>();
        },
      });
      createAsyncAction({
        source: {
          $foo: createStore(''),
          bar: createStore(1),
        },
        target: {},
        fn: (_, source) => {
          expectTypeOf(source).toEqualTypeOf<() => Promise<{ foo: string; bar: number }>>();
        },
      });
    });

    it('can be passed as callback without manual clock type declaration', () => {
      const factory = ({}: { onSubmit: UnitTargetable<string | number> }) => null;

      factory({
        onSubmit: createAsyncAction({
          source: createStore(1),
          target: {},
          fn: (target, source, clock) => {
            expectTypeOf(clock).toEqualTypeOf<string | number>();
          },
        }),
      });

      factory({
        onSubmit: createAsyncAction({
          target: {},
          fn: (target, clock) => {
            expectTypeOf(clock).toEqualTypeOf<string | number>();
          },
        }),
      });
    });
  });
});
