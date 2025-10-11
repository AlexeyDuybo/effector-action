import {
  attach,
  createEffect,
  createEvent,
  Effect,
  is,
  sample,
  scopeBind,
  Store,
  StoreWritable,
  Unit,
  UnitTargetable,
  UnitValue,
} from 'effector';
import type { SoureShape, GetSourceValue, TargetShape } from './types';
import { getResetKey, getUnitSourceKey, removeDollarPrefix } from './shared';
import { spread } from 'patronum';

export const multiplyUnitCallErrorMessage = (unitName: string) =>
  `[Async Action Error]. Target: "${unitName}". Multiple calls of same target in single tick are not allowed.`;

const promiseWithResolver = () => {
  let resolve: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
};

type CreateCallableTargets<Target extends TargetShape | UnitTargetable<any>> =
  Target extends Record<string, UnitTargetable<any>>
    ? { [K in keyof Target]: CreateCallableTargets<Target[K]> }
    : Target extends UnitTargetable<any>
      ? Target extends StoreWritable<any>
        ? ((valueOrFn: UnitValue<Target>) => UnitValue<Target>) & {
            reinit: () => void;
          }
        : Target extends Effect<infer EffectPayload, infer EffectResult>
          ? (payload: EffectPayload) => Promise<EffectResult>
          : (value: UnitValue<Target>) => UnitValue<Target>
      : never;

export function createAsyncAction<
  Target extends TargetShape,
  Src extends SoureShape | Store<any>,
  ClockValue = void,
  ActionResult = void,
>(config: {
  source: Src;
  target: Target;
  fn: (
    target: CreateCallableTargets<Target>,
    getSource: () => Promise<GetSourceValue<Src>>,
    clock: ClockValue,
  ) => ActionResult;
}): Effect<ClockValue, Awaited<ActionResult>, unknown>;

export function createAsyncAction<Target extends TargetShape, ClockValue = void, ActionResult = void>(config: {
  target: Target;
  fn: (target: CreateCallableTargets<Target>, clock: ClockValue) => ActionResult;
}): Effect<ClockValue, Awaited<ActionResult>, unknown>;

export function createAsyncAction<
  Target extends TargetShape,
  Src extends SoureShape | Store<any>,
  ClockValue = void,
  ActionResult = void,
>(config: {
  source?: Src;
  target: Target;
  fn: (
    target: CreateCallableTargets<Target>,
    sourceOrClock: (() => Promise<GetSourceValue<Src>>) | ClockValue,
    clock?: ClockValue,
  ) => ActionResult;
}): Effect<ClockValue, Awaited<ActionResult>, unknown> {
  const target: TargetShape = { ...config.target };
  const source: SoureShape = is.unit(config.source)
    ? { [getUnitSourceKey()]: config.source }
    : removeDollarPrefix({ ...config.source });

  Object.entries(target).forEach(([targetName, targetUnit]) => {
    if (is.store(targetUnit)) {
      target[getResetKey(targetName)] = targetUnit.reinit;
    }
  });

  const setState = createEvent<Record<string, any>>();

  let getSourceFx: Effect<false | Promise<void>, any>;
  if (config.source) {
    const getSourceValueFx = attach({
      source,
      effect: async (sourceValue) => {
        return is.unit(config.source) ? sourceValue[getUnitSourceKey()] : sourceValue;
      },
    });
    getSourceFx = createEffect(async (batchingStatus: false | Promise<void>) => {
      if (batchingStatus) await batchingStatus;
      return getSourceValueFx();
    });
  }

  const fx = createEffect((clock: ClockValue) => {
    let targetsToChangePerTick: Record<string, any> = {};
    const unitsToChangePerTick = new Set();
    let batchingStatus: false | Promise<void> = false;

    const boundSetState = scopeBind(setState, { safe: true });

    const update = () => {
      if (batchingStatus) return;
      const batchingPromise = promiseWithResolver();
      batchingStatus = batchingPromise.promise;
      Promise.resolve().then(() => {
        boundSetState(targetsToChangePerTick);
        targetsToChangePerTick = {};
        unitsToChangePerTick.clear();
        batchingPromise.resolve();
        batchingStatus = false;
      });
    };

    const createSetter = (unitName: string, unit: Unit<any>) => {
      const setter = (value: unknown) => {
        if (unitsToChangePerTick.has(unitName)) {
          throw new Error(multiplyUnitCallErrorMessage(unitName))
        }
        unitsToChangePerTick.add(unitName);
        update();


        // TDOO call effects via sample
        if (is.effect(unit)) {
          return unit(value);
        }

        targetsToChangePerTick[unitName] = value;

        return value;
      };

      if (is.store(unit)) {
        setter.reinit = () => {
          const resetKey = getResetKey(unitName);
          if (unitsToChangePerTick.has(resetKey)) {
            throw new Error(multiplyUnitCallErrorMessage(unitName + '.reinit'))
          }
          unitsToChangePerTick.add(resetKey);
          update();
          targetsToChangePerTick[resetKey] = undefined;
        };
      }

      return setter;
    };

    const fnTarget = Object.fromEntries(
      Object.entries(config.target).map(([unitName, unit]) => [unitName, createSetter(unitName, unit)]),
    );

    async function asyncActionWrapper () {
      try {
        if (config.source && getSourceFx) {
          return await (config.fn(fnTarget as any, () => getSourceFx(batchingStatus), clock));
        } else {
          return await (config.fn(fnTarget as any, clock));
        }
      } catch (e) {
        console.error(e);
        throw e;
      }
    };

    return asyncActionWrapper();
  });

  sample({
    clock: setState,
    target: spread(target),
  });

  // @ts-expect-error
  return fx;
}
