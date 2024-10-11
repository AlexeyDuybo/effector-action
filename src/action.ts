import {
  Store,
  UnitTargetable,
  EventCallable,
  Unit,
  UnitValue,
  GetTupleWithoutAny,
  createEvent,
  StoreWritable,
  sample,
  is,
} from 'effector';
import { spread } from 'patronum/spread';

type RemoveDollarPrefix<Key extends string> = Key extends `$${infer K}` ? K : Key;

type IsNever<T, Then, Else> = [T] extends [never] ? Then : Else;

type TargetShape = Record<string, UnitTargetable<any>>;
type SoureShape = Record<string, Store<any>>;
type ClockShape<T> = Unit<T> | Unit<T>[];

type GetClockValue<Clc extends ClockShape<any>> = [Clc] extends [Unit<any>] ? UnitValue<Clc> : GetTupleWithoutAny<Clc>;
type GetSourceValue<Src extends Store<any> | SoureShape> =
  Src extends Store<infer Value>
    ? Value
    : { [K in RemoveDollarPrefix<keyof Src & string>]: UnitValue<Src[keyof Src & IsNever<K & keyof Src, `$${K}`, K>]> };

type CreateCallableTargets<Target extends TargetShape | UnitTargetable<any>> =
  Target extends Record<string, UnitTargetable<any>>
    ? { [K in keyof Target]: CreateCallableTargets<Target[K]> }
    : Target extends UnitTargetable<any>
      ? Target extends StoreWritable<any>
        ? ((valueOrFn: UnitValue<Target> | ((value: UnitValue<Target>) => UnitValue<Target>)) => UnitValue<Target>) & {
            reinit: () => void;
          }
        : (value: UnitValue<Target>) => UnitValue<Target>
      : never;

type ShowClockParameter<Clc extends ClockShape<any>, Then, Else> = IsNever<
  Clc,
  Then,
  Clc extends ClockShape<void> ? Else : Then
>;

type ActionResult<Clc, Src, Fn extends (...args: any[]) => any> = IsNever<
Clc,
  EventCallable<
    IsNever<
      Src,
      Parameters<Fn> extends [any, infer Clock] ? Clock : void,
      Parameters<Fn> extends [any, any, infer Clock] ? Clock : void
    >
  >,
  void
  >;

type ActionFn<
    Target extends TargetShape | UnitTargetable<any>,
    Clc extends ClockShape<any> = never,
    Src extends SoureShape | Store<any> = never,
    FnTarget = CreateCallableTargets<Target>,
    FnClock = IsNever<Clc, any, GetClockValue<Clc>>,
> = IsNever<
Src,
(target: FnTarget, ...clockOrNothing: ShowClockParameter<Clc, [clock: FnClock], []>) => void,
(
  target: FnTarget,
  source: GetSourceValue<Src>,
  ...clockOrNothing: ShowClockParameter<Clc, [clock: FnClock], []>
) => void
>

const getResetKey = (storeName: string) => `__${storeName}.reinit__`;
const getStoreForPrevValueKey = (storeName: string) => `__${storeName}_prevValue__`;
const getUnitSourceKey = () => `__unitSourceKey__`;
const getUnitTargetKey = () => `__unitTargetKey__`;

export const multiplyUnitCallErrorMessage = (unitName: string) =>
  `effector-action Warning. Unit: "${unitName}". Multiple calls of same target in "fn" is not allowed. Only last change will be applied`;
export const asyncUnitChangeErrorMessage = (unitName: string) =>
  `effector-action Warning. Unit: "${unitName}". Async unit changes are not allowed. All async changes will not be applied`;

export function createAction <
  Target extends TargetShape | UnitTargetable<any>,
  Fn extends ActionFn<Target, Clc, Src>,
  Clc extends ClockShape<any> = never,
  Src extends SoureShape | Store<any> = never,
>(config: {
  clock?: Clc;
  source?: Src;
  target: Target;
  fn: Fn;
}): ActionResult<Clc, Src, Fn>;
export function createAction <
  Target extends TargetShape | UnitTargetable<any>,
  Fn extends ActionFn<Target, Clc, Src>,
  Clc extends ClockShape<any> = never,
  Src extends SoureShape | Store<any> = never,
>(
  clock: Clc, 
  config: {
    source?: Src;
    target: Target;
    fn: Fn;
  }
): ActionResult<Clc, Src, Fn>
export function createAction <
  Target extends TargetShape | UnitTargetable<any>,
  Fn extends ActionFn<Target, Clc, Src>,
  Clc extends ClockShape<any> = never,
  Src extends SoureShape | Store<any> = never,
>(
  configOrClock: Clc | {
    clock?: Clc;
    source?: Src;
    target: Target;
    fn: Fn;
  },
  maybeConfig?: {
    source?: Src;
    target: Target;
    fn: Fn;
  }
): ActionResult<Clc, Src, Fn> {

  let passedClock: Clc | undefined;
  let passedSource: Src | undefined;
  let passedTarget: Target;
  let passedFn: Fn;

  if (isClock(configOrClock)) {
    if (!maybeConfig) {
      throw new Error('Action config is not passed')
    }
    passedClock = configOrClock;
    passedSource = maybeConfig.source;
    passedTarget = maybeConfig.target;
    passedFn = maybeConfig.fn;
  } else {
    passedClock = configOrClock.clock;
    passedSource = configOrClock.source;
    passedTarget = configOrClock.target;
    passedFn = configOrClock.fn;
  }

  const isSourceUnit = is.unit(passedSource);

  const clock = passedClock ?? createEvent<any>();
  const target: TargetShape = is.unit(passedTarget) ? { [getUnitTargetKey()]: passedTarget } : { ...passedTarget };
  const source: SoureShape = is.unit(passedSource)
    ? { [getUnitSourceKey()]: passedSource }
    : removeDollarPrefix({ ...passedSource });

  Object.entries(target).forEach(([targetName, targetUnit]) => {
    if (is.store(targetUnit)) {
      target[getResetKey(targetName)] = targetUnit.reinit;
      source[getStoreForPrevValueKey(targetName)] = targetUnit;
    }
  });

  sample({
    clock: clock as Unit<any>,
    source: source,
    fn: (source, clock) => {
      const targetsToChange: Record<string, any> = {};
      let isFnEnded = false;

      const createSetter = (unitName: string, unit: Unit<any>) => {
        const setter = (valueOrFunc: unknown) => {
          if (isFnEnded) {
            console.error(asyncUnitChangeErrorMessage(unitName));
          }
          if (unitName in targetsToChange) {
            console.error(multiplyUnitCallErrorMessage(unitName));
          }

          const value =
            typeof valueOrFunc === 'function' ? valueOrFunc(source[getStoreForPrevValueKey(unitName)]) : valueOrFunc;

          targetsToChange[unitName] = value;

          return value;
        };

        if (is.store(unit)) {
          setter.reinit = () => {
            if (isFnEnded) {
              console.error(asyncUnitChangeErrorMessage(unitName + '.reinit'));
            }
            const resetKey = getResetKey(unitName);
            if (resetKey in targetsToChange) {
              console.error(multiplyUnitCallErrorMessage(unitName + '.reinit'));
            }
            targetsToChange[resetKey] = undefined;
          };
        }

        return setter;
      };

      const fnTarget = is.unit(passedTarget)
        ? createSetter(getUnitTargetKey(), passedTarget)
        : Object.fromEntries(
            Object.entries(passedTarget).map(([unitName, unit]) => [unitName, createSetter(unitName, unit)]),
          );

      if (passedSource) {
        const fnSource = isSourceUnit ? source[getUnitSourceKey()] : source;
        passedFn(fnTarget as any, fnSource, clock);
      } else {
        passedFn(fnTarget as any, clock);
      }

      isFnEnded = true;

      return targetsToChange;
    },
    target: spread(target),
  });

  if (passedClock) {
    // @ts-expect-error
    return;
  }
  // @ts-expect-error
  return clock;
};

const removeDollarPrefix = (sourceShape: SoureShape): SoureShape => {
  return Object.fromEntries(
    Object.entries(sourceShape).map(([key, store]) => [key.startsWith('$') ? key.substring(1) : key, store]),
  );
};

const isClock = (maybeClock: unknown): maybeClock is ClockShape<any> => (
  is.unit(maybeClock) ||
  Array.isArray(maybeClock) && maybeClock.every(is.unit)
);