import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';
import {
  PARAMTYPES_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { InjectionTokenMap } from './injection-token-map';

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// eslint-disable-next-line @typescript-eslint/ban-types
function getCtorDepsFromClass(cls: Function): InjectionToken[] {
  const paramTypes: any[] = Reflect.getMetadata(PARAMTYPES_METADATA, cls) ?? [];

  // Nest 在有 @Inject(token) 时，会写 SELF_DECLARED_DEPS_METADATA 覆盖某些 index
  const selfDeclared: Array<{ index: number; param: any }> =
    Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, cls) ?? [];

  const overrides = new Map<number, any>(
    selfDeclared.map((d) => [d.index, d.param]),
  );

  // 注意：interface/any 会变成 Object，通常没意义，过滤掉
  return paramTypes
    .map((t, i) => overrides.get(i) ?? t)
    .filter((t) => t != null && t !== Object);
}

/**
 * 从某个入口 token 出发：
 * - 收集 map.get(token) 的值（T 或 T[]）
 * - 递归遍历 InjectionTokenMap.get(token)
 * - 若 token 是 class，再补充遍历其 ctor deps
 */
export const collectInfoFromInjectionToken = <T>(
  map: Map<InjectionToken, T | T[]>,
  token: InjectionToken,
): T[] => {
  const visited = new Set<InjectionToken>();
  const out = new Set<T>();

  const dfs = (t: InjectionToken) => {
    if (t == null) return;
    if (visited.has(t)) return;
    visited.add(t);

    // 1) 收集当前 token 对应的信息
    for (const v of asArray(map.get(t))) {
      out.add(v);
    }

    // 2) 先走显式依赖图（如果有）
    const deps = InjectionTokenMap.get(t);
    if (deps?.length) {
      for (const d of deps) dfs(d);
    }

    // 3) 如果 token 本身是 class（或你拿到的就是 class token），用反射补一层 ctor deps
    //    注意：这只在你没有把 "string/symbol token -> metatype" 映射存起来时才是 best-effort
    if (typeof t === 'function') {
      const ctorDeps = getCtorDepsFromClass(t);
      for (const d of ctorDeps) dfs(d);
    }
  };

  dfs(token);
  return Array.from(out);
};

export const createCollectorFromInjectionToken =
  <T>(map: Map<InjectionToken, T | T[]>) =>
  (token: InjectionToken): T[] =>
    collectInfoFromInjectionToken<T>(map, token);
