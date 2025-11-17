export type AnyClass = new (...args: any[]) => any;
export type ClassOrArray = AnyClass | [AnyClass];
export type ClassType<T> = new (...args: any[]) => T;
export type TypeFromClass<T> = T extends new (...args: any[]) => infer U
  ? U
  : never;
export type ParamsFromClass<T> = T extends new (...args: infer U) => any
  ? U
  : never;
export type ParseType<IC extends ClassOrArray> = IC extends [infer U]
  ? TypeFromClass<U>[]
  : TypeFromClass<IC>;

export function getClassFromClassOrArray(o: ClassOrArray) {
  return o instanceof Array ? o[0] : o;
}
