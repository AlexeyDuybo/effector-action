import { describe, it, expect, vitest } from 'vitest';
import { Scope, Unit, allSettled, createEffect, createEvent, createStore, createWatch, fork, sample } from 'effector';
import { createAsyncAction, multiplyUnitCallErrorMessage } from './async-action';

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
    const waitFx = createEffect(() => wait());
    it('async change units and returns value', async () => {
      const scope = fork();
      const $store = createStore(0);
      const $store2 = createStore(0);
      const fxResult = 100;
      const action = createAsyncAction({
        target: { waitFx, $store, $store2 },
        fn: async (target) => {
          target.$store(1);

          await target.waitFx();

          target.$store(2);
          target.$store2(1);

          await target.waitFx();

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
      await wait();
      // async changes 2
      expect(scope.getState($store)).toEqual(2);
      expect(scope.getState($store2)).toEqual(1);

      await wait();
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
        target: { $store, waitFx },
        fn: async (target, getSourceFx) => {
          sourceSpy(await getSourceFx());

          await target.waitFx();

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
        target: { $store, waitFx },
        fn: async (target, getSourceFx) => {
          sourceSpy((await getSourceFx()).store);

          await target.waitFx();

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
    it('throws error if .reset applied more than 1 time in tick', async () => {
      const storeName = '$store';
      const consoleErrorSpy = vitest.spyOn(console, 'error');
      const scope = fork();
      const $store = createStore('');
      const track = vitest.fn();

      const action = createAsyncAction({
        target: {
          [storeName]: $store,
        },
        fn: (target) => {
          target[storeName].reinit();
          try {
            target[storeName].reinit();
          } catch (e) {
            track(e);
            throw e;
          }
        },
      });
      const reinitSpy = createSpy({
        scope,
        unit: $store.reinit,
      });

      await allSettled(action, { scope });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error(multiplyUnitCallErrorMessage(`${storeName}.reinit`)));
      expect(reinitSpy).toHaveBeenCalledOnce();
      expect(track).toHaveBeenCalledOnce();
      expect(track).toHaveBeenCalledWith(new Error(multiplyUnitCallErrorMessage(`${storeName}.reinit`)));
    });
    it.each([createStore(''), createEvent<string>(), createEffect<string, null>(() => null)])(
      'throws error if unit changed more than 1 time in tick',
      async (unit) => {
        const unitName = 'unit';
        const consoleErrorSpy = vitest.spyOn(console, 'error');
        const scope = fork();
        const track = vitest.fn();

        const action = createAsyncAction({
          target: {
            [unitName]: unit,
          },
          fn: (target) => {
            target.unit('foo');
            try {
              target.unit('bar');
            } catch (e) {
              track(e);
              throw e;
            }
          },
        });
        const unitSpy = createSpy({ scope, unit });

        await allSettled(action, { scope });

        expect(consoleErrorSpy).toHaveBeenCalledOnce();
        expect(consoleErrorSpy).toHaveBeenCalledWith(new Error(multiplyUnitCallErrorMessage(`${unitName}`)));
        expect(unitSpy).toHaveBeenCalledOnce();
        expect(unitSpy).toHaveBeenCalledWith('foo');
        expect(track).toHaveBeenCalledOnce();
        expect(track).toHaveBeenCalledWith(new Error(multiplyUnitCallErrorMessage(`${unitName}`)));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('error'));
    });
    it('async change units and returns value', async () => {
      const scope = fork();
      const $store = createStore(1);
      const fx = createEffect((param: number) => new Promise<number>((res) => setTimeout(() => res(param * 2))));
      const action = createAsyncAction({
        target: { fx, $store },
        fn: async (target) => {
          const result = await target.fx(100);

          target.$store(result);

          return result;
        },
      });

      expect(await allSettled(action, { scope })).toEqual({ status: 'done', value: 200 });
      expect(scope.getState($store)).toEqual(200);
    });
    it('get actual value after effect change it', async () => {
      const scope = fork();
      const $store = createStore(1);
      const fx1 = createEffect((param: number) => new Promise<number>((res) => setTimeout(() => res(param * 2))));
      const fx2 = createEffect((param: number) => Promise.resolve(param * 2));

      sample({
        clock: fx1.doneData,
        fn: (value) => value * 2,
        target: $store,
      });
      sample({
        clock: fx2.doneData,
        fn: (value) => value * 2,
        target: $store,
      });
      const action = createAsyncAction({
        source: $store,
        target: { fx1, fx2, $store },
        fn: async (target, getSource) => {
          const store1 = await getSource();
          await target.fx1(store1);
          const store2 = await getSource();

          await target.fx2(store2);
          const store3 = await getSource();

          return store3;
        },
      });

      expect(await allSettled(action, { scope })).toEqual({ status: 'done', value: 16 });
      expect(scope.getState($store)).toEqual(16);
    });
  });
});
