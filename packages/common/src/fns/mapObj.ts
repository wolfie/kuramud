interface MapObj {
  <K extends string, V, R>(
    obj: Partial<Record<K, V>>,
    mapper: (value: Required<V>, prop: K) => R
  ): Record<K, R>;
  <K extends string, V, R>(
    obj: Record<K, V>,
    mapper: (value: V, prop: K) => R
  ): Record<K, R>;
}

export const mapObj: MapObj = (obj, mapper) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, mapper(v as any, k as any)])
  ) as any;
