import {
  Store,
  UnitTargetable,
  GetShapeValue,
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

type IsNever<T, Then, Else> = [T] extends [never] ? Then : Else;

type TargetShape = Record<string, UnitTargetable<any>>;
type SoureShape = Record<string, Store<any>>;
type ClockShape<T> = Unit<T> | Unit<T>[];

type GetClockValue<Clc extends ClockShape<any>> = [Clc] extends [Unit<any>] ? UnitValue<Clc> : GetTupleWithoutAny<Clc>;

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

const getResetKey = (storeName: string) => `__${storeName}.reinit__`;
const getStoreForPrevValueKey = (storeName: string) => `__${storeName}_prevValue__`;
const getUnitSourceKey = () => `__unitSourceKey__`;
const getUnitTargetKey = () => `__unitTargetKey__`;

export const multiplyUnitCallErrorMessage = (unitName: string) =>
  `effector-action Warning. Unit: "${unitName}". Multiple calls of same target in "fn" is not allowed. Only last change will be applied`;
export const asyncUnitChangeErrorMessage = (unitName: string) =>
  `effector-action Warning. Unit: "${unitName}". Async unit changes are not allowed. All async changes will not be applied`;

export const createAction = <
  Target extends TargetShape | UnitTargetable<any>,
  Fn extends IsNever<
    Src,
    (target: FnTarget, ...clockOrNothing: ShowClockParameter<Clc, [clock: FnClock], []>) => void,
    (
      target: FnTarget,
      source: GetShapeValue<Src>,
      ...clockOrNothing: ShowClockParameter<Clc, [clock: FnClock], []>
    ) => void
  >,
  Clc extends ClockShape<any> = never,
  Src extends SoureShape | Store<any> = never,
  FnTarget = CreateCallableTargets<Target>,
  FnClock = IsNever<Clc, any, GetClockValue<Clc>>,
>(config: {
  clock?: Clc;
  source?: Src;
  target: Target;
  fn: Fn;
}): IsNever<
  Clc,
  EventCallable<
    IsNever<
      Src,
      Parameters<Fn> extends [any, infer Clock] ? Clock : void,
      Parameters<Fn> extends [any, any, infer Clock] ? Clock : void
    >
  >,
  void
> => {
  const clock = config.clock ?? createEvent<any>();
  const target: TargetShape = is.unit(config.target) ? { [getUnitTargetKey()]: config.target } : { ...config.target };
  const source: SoureShape = is.unit(config.source) ? { [getUnitSourceKey()]: config.source } : { ...config.source };

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

      const fnTarget = is.unit(config.target)
        ? createSetter(getUnitTargetKey(), config.target)
        : Object.fromEntries(
            Object.entries(config.target).map(([unitName, unit]) => [unitName, createSetter(unitName, unit)]),
          );

      if (config.source) {
        const fnSource = is.unit(config.source) ? source[getUnitSourceKey()] : source;
        config.fn(fnTarget as FnTarget, fnSource, clock);
      } else {
        config.fn(fnTarget as FnTarget, clock);
      }

      isFnEnded = true;

      return targetsToChange;
    },
    target: spread(target),
  });

  if (config.clock) {
    // @ts-expect-error
    return;
  }
  // @ts-expect-error
  return clock;
};
