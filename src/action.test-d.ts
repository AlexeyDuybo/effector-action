import { describe, it, expectTypeOf } from "vitest";
import {createAction} from './action';
import { createEffect, createEvent, createStore, EventCallable } from "effector";

describe('createAction/types', () => {
  it('target', () => {
    createAction({
        target: {
            $store: createStore(''),
            event: createEvent<number>(),
            fx: createEffect<null, boolean>()
        },
        fn: (target) => {
            expectTypeOf(target).toEqualTypeOf<{ 
                $store: ((valueOfFunc: string | ((state: string) => string)) => string) & { reinit: () => void },
                event: (payload: number) => number,
                fx: (payload: null) => null,
            }>()
        }
    });
  })

  it('external clock', () => {
    createAction({
        clock: createEvent<string>(),
        target: {},
        fn: (_, clock) => {
            expectTypeOf(clock).toBeString();
        }
    });
    createAction({
        clock: createEvent(),
        target: {},
        fn: (...params) => {
            // @ts-expect-error todo
            expectTypeOf(params).not.toHaveProperty('1')
        }
    });
    createAction({
        clock: [createEvent<string>(), createStore(123), createEffect<boolean, void>()],
        target: {},
        fn: (_, clock) => {
            expectTypeOf(clock).toEqualTypeOf<string | number | boolean>()
        }
    });
    createAction({
        clock: [createEvent<string>(), createStore(123), createEffect<boolean, void>()],
        source: createStore(''),
        target: {},
        fn: (_, __, clock) => {
            expectTypeOf(clock).toEqualTypeOf<string | number | boolean>()
        }
    });
  })

  it('returned clock', () => {
    const clock1 = createAction({
        target: {},
        fn: (_, clock: string) => {}
    });
    expectTypeOf(clock1).toEqualTypeOf<EventCallable<string>>()

    const clock2 = createAction({
        target: {},
        fn: (_, clock: string | number | boolean) => {}
    });
    expectTypeOf(clock2).toEqualTypeOf<EventCallable<string | number | boolean>>()

    const clock3 = createAction({
        target: {},
        fn: (_, clock) => {
            // @ts-expect-error todo
            expectTypeOf(clock).toBeNever()
        }
    });
    // @ts-expect-error todo
    expectTypeOf(clock3).toEqualTypeOf<EventCallable<void>>()

    const clock4 = createAction({
        target: {},
        fn: (_) => {}
    });
    expectTypeOf(clock4).toEqualTypeOf<EventCallable<void>>()

    const clock5 = createAction({
        source: createStore(''),
        target: {},
        fn: (_, __, clock: string | number | null) => {}
    });
    expectTypeOf(clock5).toEqualTypeOf<EventCallable<string | number | null>>()
  })

  it('source', () => {
    createAction({
        source: createStore(''),
        target: {},
        fn: (_, source) => {
            expectTypeOf(source).toBeString();
        }
    });
    createAction({
        source: {
            foo: createStore(''),
            bar: createStore(1)
        },
        target: {},
        fn: (_, source) => {
            expectTypeOf(source).toEqualTypeOf<{ foo: string, bar: number }>();
        }
    });
  })  
})