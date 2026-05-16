import type { InjectionToken } from '@nestjs/common';

export const InjectionTokenMap = new Map<InjectionToken, InjectionToken[]>();

export const addInjectionTokenMapping = (
  from: InjectionToken,
  to: InjectionToken | InjectionToken[],
) => {
  if (!from || !to) {
    return;
  }

  if (!InjectionTokenMap.has(from)) {
    InjectionTokenMap.set(from, []);
  }
  const toArray = Array.isArray(to) ? to : [to];
  InjectionTokenMap.get(from)?.push(...toArray);
};
