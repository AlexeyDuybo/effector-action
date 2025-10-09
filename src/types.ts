import { Store, Unit, UnitTargetable, UnitValue } from 'effector';

type RemoveDollarPrefix<Key extends string> = Key extends `$${infer K}` ? K : Key;

type IsNever<T, Then, Else> = [T] extends [never] ? Then : Else;

export type TargetShape = Record<string, UnitTargetable<any>>;
export type SoureShape = Record<string, Store<any>>;
export type ClockShape<T> = Unit<T> | Unit<T>[];

export type GetSourceValue<Src extends Store<any> | SoureShape> =
  Src extends Store<infer Value>
    ? Value
    : { [K in RemoveDollarPrefix<keyof Src & string>]: UnitValue<Src[keyof Src & IsNever<K & keyof Src, `$${K}`, K>]> };

export type GetClockValue<Clc extends ClockShape<any>> = Clc extends ClockShape<infer Val> ? Val : never;
