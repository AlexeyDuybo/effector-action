import { describe, it, expect, vitest } from 'vitest';
import {
  Scope,
  Unit,
  allSettled,
  createEffect,
  createEvent,
  createStore,
  createWatch,
  fork,
} from 'effector';
import { createAsyncAction } from './async-action';
import { multiplyUnitCallErrorMessage } from './shared';

const createSpy = ({ scope, unit }: { scope: Scope; unit: Unit<any> }) => {
  const fn = vitest.fn();
  createWatch({ scope, unit, fn });
  return fn;
};

const wait = () => Promise.resolve();

const someTarget = { foo: createStore('') };

describe('createAsyncAction', () => {
  describe('createAction compat', () => {
    it('change units in object shape', async () => {
      const scope = fork();
      const $store = createStore('');
      const event = createEvent<string>();
      const effectFx = createEffect<string, null>(() => null);
      const changedValue = 'foo';
      const action = createAsyncAction({
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
      const action = createAsyncAction({
        target: { $store },
        fn: (target) => {
          target.$store(changedValue);
        },
      });

      await allSettled(action, { scope });

      expect(scope.getState($store)).toEqual(changedValue);
    });
    it('calls single event', async () => {
      const scope = fork();
      const event = createEvent<string>();
      const changedValue = 'foo';
      const action = createAsyncAction({
        target: { event },
        fn: (target) => {
          target.event(changedValue);
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
      const action = createAsyncAction({
        target: { effectFx },
        fn: (target) => {
          target.effectFx(changedValue);
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
      const action = createAsyncAction({
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
      const action = createAsyncAction({
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
    it('shows warning and apply last change if store reset event called more than 1 time', async () => {
      const storeName = '$store';
      const consoleErrorSpy = vitest.spyOn(console, 'error');
      const scope = fork();
      const $store = createStore('');
      const fn = vitest.fn((target: any) => {
        target.$store.reinit();
        target.$store.reinit();
      });
      const action = createAsyncAction({
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
        const action = createAsyncAction({
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
    it('if clock is not passed to the config, return clock and pass its payload to fn', async () => {
      const scope = fork();
      const fn = vitest.fn((_: any, clock: string) => {});
      const clockPayload = 'foo';
      const clock = createAsyncAction({
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
  });
  describe('async behaviour', () => {
    it('async change units and returns value', async () => {
      const scope = fork();
      const $store = createStore(0);
      const $store2 = createStore(0);
      const fxResult = 100;
      const action = createAsyncAction({
        target: { $store, $store2 },
        fn: async (target) => {
          target.$store(1);

          await wait();

          target.$store(2);
          target.$store2(1);

          await wait();

          target.$store.reinit();

          return fxResult;
        },
      });

      const pendingScope = allSettled(action, { scope });

      await wait();
      // async changes 1
      expect(scope.getState($store)).toEqual(1);

      expect(scope.getState($store2)).toEqual(0);
      await wait();
      // async changes 2
      expect(scope.getState($store)).toEqual(2);
      expect(scope.getState($store2)).toEqual(1);

      await wait();
      // async changes 3
      expect(scope.getState($store)).toEqual(0);

      expect(await pendingScope).toEqual({ status: 'done', value: fxResult });
    });
    it('dynamic single source value', async () => {
      const scope = fork();
      const $store = createStore(0);
      const sourceSpy = vitest.fn();
      const action = createAsyncAction({
        source: $store,
        target: { $store },
        fn: async (target, getSourceFx) => {
          sourceSpy(await getSourceFx());

          await wait();

          target.$store(1);

          sourceSpy(await getSourceFx());

          target.$store(2);

          sourceSpy(await getSourceFx());

          allSettled($store, { scope, params: 3 });

          sourceSpy(await getSourceFx());
        },
      });

      await allSettled(action, { scope });

      expect(sourceSpy).toHaveBeenCalledTimes(4);
      expect(sourceSpy).nthCalledWith(1, 0);
      expect(sourceSpy).nthCalledWith(2, 1);
      expect(sourceSpy).nthCalledWith(3, 2);
      expect(sourceSpy).nthCalledWith(4, 3);
    });
    it('dynamic object source shape value', async () => {
      const scope = fork();
      const $store = createStore(0);
      const sourceSpy = vitest.fn();
      const action = createAsyncAction({
        source: { $store },
        target: { $store },
        fn: async (target, getSourceFx) => {
          sourceSpy((await getSourceFx()).store);

          await wait();

          target.$store(1);

          sourceSpy((await getSourceFx()).store);

          target.$store(2);

          sourceSpy((await getSourceFx()).store);

          allSettled($store, { scope, params: 3 });

          sourceSpy((await getSourceFx()).store);
        },
      });

      await allSettled(action, { scope });

      expect(sourceSpy).toHaveBeenCalledTimes(4);
      expect(sourceSpy).nthCalledWith(1, 0);
      expect(sourceSpy).nthCalledWith(2, 1);
      expect(sourceSpy).nthCalledWith(3, 2);
      expect(sourceSpy).nthCalledWith(4, 3);
    });
    it.each([createStore(''), createEvent<string>(), createEffect<string, null>(() => null)])(
      'shows warning and apply last change if unit called more than 1 time',
      async (unit) => {
        const unitName = 'unit';
        const consoleErrorSpy = vitest.spyOn(console, 'error');
        const scope = fork();
        const lastUnitChange = 'bar';
        const fn = vitest.fn(async (target: any) => {
          target.unit('foo');
          target.unit(lastUnitChange + 1);

          await wait();

          target.unit('foo');
          target.unit(lastUnitChange + 2);
        });
        const action = createAsyncAction({
          target: {
            [unitName]: unit,
          },
          fn,
        });
        const unitSpy = createSpy({ scope, unit });

        await allSettled(action, { scope });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledWith(multiplyUnitCallErrorMessage(`${unitName}`));
        expect(unitSpy).toHaveBeenCalledTimes(2);
        expect(unitSpy).nthCalledWith(1, lastUnitChange + 1);
        expect(unitSpy).nthCalledWith(2, lastUnitChange + 2);
      },
    );
    it('handle errors', async () => {
      const scope = fork();
      const $store = createStore(0);
      const $store2 = createStore(0);
      const consoleErrorSpy = vitest.spyOn(console, 'error');

      const action = createAsyncAction({
        target: { $store, $store2 },
        fn: async (target) => {
          throw new Error('error');
        },
      });

      expect(await allSettled(action, { scope })).toEqual({ status: 'fail', value: new Error('error') });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error in Async Action]:', new Error('error'));
    });
  });
});
