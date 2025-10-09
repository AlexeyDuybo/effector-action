import { describe, it, expect, vitest } from 'vitest';
import { Scope, Unit, allSettled, createEffect, createEvent, createStore, createWatch, fork } from 'effector';
import { createAction } from './action';
import { multiplyUnitCallErrorMessage } from './shared';

const createSpy = ({ scope, unit }: { scope: Scope; unit: Unit<any> }) => {
  const fn = vitest.fn();
  createWatch({ scope, unit, fn });
  return fn;
};

const someTarget = { foo: createStore('') };

describe('createAction', () => {
  it('change units in object shape', async () => {
    const scope = fork();
    const $store = createStore('');
    const event = createEvent<string>();
    const effectFx = createEffect<string, null>(() => null);
    const changedValue = 'foo';
    const action = createAction({
      target: {
        $store,
        event,
        effectFx,
      },
      fn: (target) => {
        target.$store(changedValue);
        target.event(changedValue);
        target.effectFx(changedValue);
      },
    });
    const eventSpy = createSpy({
      scope,
      unit: event,
    });
    const effectSpy = createSpy({
      scope,
      unit: effectFx,
    });

    await allSettled(action, { scope });

    expect(scope.getState($store)).toEqual(changedValue);
    expect(eventSpy).toHaveBeenCalledOnce();
    expect(effectSpy).toHaveBeenCalledOnce();
    expect(eventSpy).toHaveBeenCalledWith(changedValue);
    expect(effectSpy).toHaveBeenCalledWith(changedValue);
  });
  it('changes single store', async () => {
    const scope = fork();
    const $store = createStore('');
    const changedValue = 'foo';
    const action = createAction({
      target: $store,
      fn: (target) => {
        target(changedValue);
      },
    });

    await allSettled(action, { scope });

    expect(scope.getState($store)).toEqual(changedValue);
  });
  it('calls single event', async () => {
    const scope = fork();
    const event = createEvent<string>();
    const changedValue = 'foo';
    const action = createAction({
      target: event,
      fn: (target) => {
        target(changedValue);
      },
    });
    const eventSpy = createSpy({
      scope,
      unit: event,
    });

    await allSettled(action, { scope });

    expect(eventSpy).toHaveBeenCalledOnce();
    expect(eventSpy).toHaveBeenCalledWith(changedValue);
  });
  it('calls single effect', async () => {
    const scope = fork();
    const effectFx = createEffect<string, null>(() => null);
    const changedValue = 'foo';
    const action = createAction({
      target: effectFx,
      fn: (target) => {
        target(changedValue);
      },
    });
    const effectSpy = createSpy({
      scope,
      unit: effectFx,
    });

    await allSettled(action, { scope });

    expect(effectSpy).toHaveBeenCalledOnce();
    expect(effectSpy).toHaveBeenCalledWith(changedValue);
  });
  it('change units by condition', async () => {
    const scope = fork();
    const $store = createStore('');
    const event = createEvent<string>();
    const effectFx = createEffect<string, null>(() => null);
    const changedValue = 'foo';
    const action = createAction({
      target: {
        $store,
        event,
        effectFx,
      },
      fn: (target) => {
        if (true) {
          target.$store(changedValue);
          target.event(changedValue);
        } else {
          target.effectFx(changedValue);
        }
      },
    });
    const eventSpy = createSpy({
      scope,
      unit: event,
    });
    const effectSpy = createSpy({
      scope,
      unit: effectFx,
    });

    await allSettled(action, { scope });

    expect(scope.getState($store)).toEqual(changedValue);
    expect(eventSpy).toHaveBeenCalledOnce();
    expect(effectSpy).not.toHaveBeenCalled();
    expect(eventSpy).toHaveBeenCalledWith(changedValue);
  });
  it('reinit store in object shape', async () => {
    const scope = fork();
    const $store = createStore('');
    const action = createAction({
      target: {
        $store,
      },
      fn: (target) => {
        target.$store.reinit();
      },
    });
    const reinitSpy = createSpy({
      scope,
      unit: $store.reinit,
    });

    await allSettled(action, { scope });

    expect(reinitSpy).toHaveBeenCalledOnce();
  });
  it('reinit single store', async () => {
    const scope = fork();
    const $store = createStore('');
    const action = createAction({
      target: $store,
      fn: (target) => {
        target.reinit();
      },
    });
    const reinitSpy = createSpy({
      scope,
      unit: $store.reinit,
    });

    await allSettled(action, { scope });

    expect(reinitSpy).toHaveBeenCalledOnce();
  });
  it('change store state via reducer', async () => {
    const scope = fork();
    const storeState = 1;
    const expectedState = 2;
    const $store = createStore(storeState);
    const action = createAction({
      target: {
        $store,
      },
      fn: (target) => {
        target.$store((state) => state * 2);
      },
    });

    await allSettled(action, { scope });

    expect(scope.getState($store)).toEqual(expectedState);
  });
  it('reducer fn does not apply for events and effects', async () => {
    const scope = fork();
    const event = createEvent<() => null>();
    const fx = createEffect<() => null, void>();
    const fn = () => null;
    const eventSpy = createSpy({ scope, unit: event });
    const fxSpy = createSpy({ scope, unit: fx });
    const action = createAction({
      target: {
        event,
        fx,
      },
      fn: (target) => {
        target.event(fn);
        target.fx(fn);
      },
    });

    await allSettled(action, { scope });

    expect(eventSpy).toHaveBeenCalledOnce();
    expect(eventSpy).toHaveBeenCalledWith(fn);
    expect(fxSpy).toHaveBeenCalledOnce();
    expect(fxSpy).toHaveBeenCalledWith(fn);
  });
  it('store reducer return new actual value', async () => {
    const scope = fork();
    let reducerResult: number | undefined;
    const expectedState = 2;
    const $store = createStore(0);
    const action = createAction({
      target: {
        $store,
      },
      fn: (target) => {
        reducerResult = target.$store(() => expectedState);
      },
    });

    await allSettled(action, { scope });

    expect(reducerResult).toEqual(expectedState);
  });
  it('shows warning and apply last change if store reset event called more than 1 time', async () => {
    const storeName = '$store';
    const consoleErrorSpy = vitest.spyOn(console, 'error');
    const scope = fork();
    const $store = createStore('');
    const fn = vitest.fn((target: any) => {
      target.$store.reinit();
      target.$store.reinit();
    });
    const action = createAction({
      target: {
        [storeName]: $store,
      },
      fn,
    });
    const reinitSpy = createSpy({
      scope,
      unit: $store.reinit,
    });

    await allSettled(action, { scope });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledWith(multiplyUnitCallErrorMessage(`${storeName}.reinit`));
    expect(reinitSpy).toHaveBeenCalledOnce();
  });
  it.each([createStore(''), createEvent<string>(), createEffect<string, null>(() => null)])(
    'shows warning and apply last change if unit called more than 1 time',
    async (unit) => {
      const unitName = 'unit';
      const consoleErrorSpy = vitest.spyOn(console, 'error');
      const scope = fork();
      const lastUnitChange = 'bar';
      const fn = vitest.fn((target: any) => {
        target.unit('foo');
        target.unit(lastUnitChange);
      });
      const action = createAction({
        target: {
          [unitName]: unit,
        },
        fn,
      });
      const unitSpy = createSpy({ scope, unit });

      await allSettled(action, { scope });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(multiplyUnitCallErrorMessage(`${unitName}`));
      expect(unitSpy).toHaveBeenCalledOnce();
      expect(unitSpy).toHaveBeenCalledWith(lastUnitChange);
    },
  );
  it('source object passed to fn', async () => {
    const scope = fork();
    const fn = vitest.fn();
    const sourceObj = {
      foo: createStore('123'),
      bar: createStore(123),
    };
    const expectedSourceValue = {
      foo: sourceObj.foo.defaultState,
      bar: sourceObj.bar.defaultState,
    };
    const action = createAction({
      source: sourceObj,
      target: { foo: createStore('') },
      fn,
    });

    await allSettled(action, { scope });

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0]?.[1]).toEqual(expect.objectContaining(expectedSourceValue));
  });
  it('removes dollar prefix in source object', async () => {
    const scope = fork();
    const fn = vitest.fn();
    const sourceObj = {
      $foo: createStore('123'),
      bar: createStore(123),
    };
    const expectedSourceValue = {
      foo: sourceObj.$foo.defaultState,
      bar: sourceObj.bar.defaultState,
    };
    const action = createAction({
      source: sourceObj,
      target: { foo: createStore('') },
      fn,
    });

    await allSettled(action, { scope });

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0]?.[1]).toEqual(expect.objectContaining(expectedSourceValue));
  });
  it('source unit passed to fn', async () => {
    const scope = fork();
    const fn = vitest.fn();
    const sourceUnit = createStore(123);
    const expectedSourceValue = sourceUnit.defaultState;
    const action = createAction({
      source: sourceUnit,
      target: someTarget,
      fn,
    });

    await allSettled(action, { scope });

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0]?.[1]).toEqual(expectedSourceValue);
  });
  it('if clock is not passed to the config, return clock and pass its payload to fn', async () => {
    const scope = fork();
    const fn = vitest.fn((_: any, clock: string) => {});
    const clockPayload = 'foo';
    const clock = createAction({
      target: someTarget,
      fn,
    });

    await allSettled(clock, {
      scope,
      params: clockPayload,
    });

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0]?.[1]).toEqual(clockPayload);
  });
  describe('external clock', () => {
    it('if the clock is passed to the config, it calls the fn and pass its payload to fn', async () => {
      const scope = fork();
      const storeClock = createStore('');
      const eventClock = createEvent<string>();
      const fxClock = createEffect<string, void>(() => {});
      const fn = vitest.fn((_: any, clock: string) => {});
      createAction({
        clock: [storeClock, eventClock, fxClock],
        target: someTarget,
        fn,
      });

      await allSettled(storeClock, {
        scope,
        params: 'foo',
      });
      await allSettled(eventClock, {
        scope,
        params: 'bar',
      });
      await allSettled(fxClock, {
        scope,
        params: 'baz',
      });

      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn.mock.calls[0]?.[1]).toEqual('foo');
      expect(fn.mock.calls[1]?.[1]).toEqual('bar');
      expect(fn.mock.calls[2]?.[1]).toEqual('baz');
    });
    it('if the clock is passed as first arg, it calls the fn and pass its payload to fn', async () => {
      const scope = fork();
      const storeClock = createStore('');
      const eventClock = createEvent<string>();
      const fxClock = createEffect<string, void>(() => {});
      const fn = vitest.fn((_: any, clock: string) => {});
      createAction([storeClock, eventClock, fxClock], {
        target: someTarget,
        fn,
      });

      await allSettled(storeClock, {
        scope,
        params: 'foo',
      });
      await allSettled(eventClock, {
        scope,
        params: 'bar',
      });
      await allSettled(fxClock, {
        scope,
        params: 'baz',
      });

      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn.mock.calls[0]?.[1]).toEqual('foo');
      expect(fn.mock.calls[1]?.[1]).toEqual('bar');
      expect(fn.mock.calls[2]?.[1]).toEqual('baz');
    });
  });
  it('pass clock and source to fn', async () => {
    const scope = fork();
    const fn = vitest.fn((_: any, source: string, clock: string) => {});
    const clockPayload = 'foo';
    const sourceValue = 'bar';
    const source = createStore(sourceValue);
    const clock = createAction({
      source,
      target: someTarget,
      fn,
    });

    await allSettled(clock, {
      scope,
      params: clockPayload,
    });

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0]?.[1]).toEqual(sourceValue);
    expect(fn.mock.calls[0]?.[2]).toEqual(clockPayload);
  });
});
