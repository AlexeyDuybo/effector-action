import {
  Clock,
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

type GetClockValue<Clc extends Clock<any>> = [Clc] extends [Unit<any>] ? UnitValue<Clc> : GetTupleWithoutAny<Clc>;

type CreateCallableTargets<Target extends TargetShape> = {
  [K in keyof Target]: Target[K] extends StoreWritable<any>
    ? ((
        valueOrFn: UnitValue<Target[K]> | ((value: UnitValue<Target[K]>) => UnitValue<Target[K]>),
      ) => UnitValue<Target[K]>) & {
        reinit: () => void;
      }
    : (value: UnitValue<Target[K]>) => UnitValue<Target[K]>;
};

const getResetKey = (storeName: string) => `__${storeName}.reinit__`;
const getStoreForPrevValueKey = (storeName: string) => `__${storeName}_prevValue__`;
const getUnitSourceKey = () => `__unitSourceKey__`;

export const multiplyUnitCallErrorMessage = (unitName: string) => `effector-action Warning. Unit: "${unitName}". Multiple calls of same target in "fn" is not allowed. Only last change will be applied`;

export const createAction = <
  Target extends TargetShape,
  Fn extends IsNever<
    Src,
    (target: FnTarget, clock: FnClock) => void,
    (target: FnTarget, source: GetShapeValue<Src>, clock: FnClock) => void
  >,
  Clc extends Clock<any> = never,
  Src extends SoureShape | Store<any> = never,
  FnTarget = CreateCallableTargets<Target>,
  FnClock = IsNever<Clc, any, GetClockValue<Clc>>,
>(config: {
  clock?: Clc;
  source?: Src;
  target: Target;
  fn: Fn;
}): IsNever<Clc, EventCallable<Parameters<Fn>[IsNever<Src, 1, 2>]>, void> => {
  const clock = config.clock ?? createEvent<any>();
  const target: TargetShape = {
    ...config.target,
  };
  const source: SoureShape = is.unit(config.source) ? { [getUnitSourceKey()]: config.source } : { ...config.source };

  Object.entries(config.target).forEach(([targetName, targetUnit]) => {
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

      const targetCallers = Object.fromEntries(
        Object.entries(config.target).map(([unitName, unit]) => {
          const setter = (valueOrFunc: unknown) => {
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
              const resetKey = getResetKey(unitName);
              if (resetKey in targetsToChange) {
                console.error(multiplyUnitCallErrorMessage(unitName + '.reinit'));
              }
              targetsToChange[resetKey] = undefined;
            };
          }

          return [unitName, setter];
        }),
      );

      if (config.source) {
        const fnSource = is.unit(config.source) ? source[getUnitSourceKey()] : source;
        config.fn(targetCallers as FnTarget, fnSource, clock);
      } else {
        // @ts-expect-error
        config.fn(targetCallers as FnTarget, clock);
      }

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
