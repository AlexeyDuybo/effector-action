import { SoureShape } from './types';

export const getResetKey = (storeName: string) => `__${storeName}.reinit__`;
export const getUnitSourceKey = () => `__unitSourceKey__`;

export const removeDollarPrefix = (sourceShape: SoureShape): SoureShape => {
  return Object.fromEntries(
    Object.entries(sourceShape).map(([key, store]) => [key.startsWith('$') ? key.substring(1) : key, store]),
  );
};

export const multiplyUnitCallErrorMessage = (unitName: string) =>
  `effector-action Warning. Unit: "${unitName}". Multiple calls of same target in "fn" is not allowed. Only last change will be applied`;
