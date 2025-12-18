export const uniqBy = <T>(arr: T[], fn: (item: T) => any): T[] => {
  const seen = new Set<any>();
  const result: T[] = [];

  for (const item of arr) {
    const key = fn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};
