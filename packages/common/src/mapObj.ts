export const mapObj = <K extends string, V, R>(
  obj: Record<K, V>,
  mapper: (value: V) => R
): Record<K, R> =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, mapper(v as V)])
  ) as Record<K, R>;
