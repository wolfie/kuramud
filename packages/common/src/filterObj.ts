export const filterObj = <K extends string, V>(
  obj: Record<K, V>,
  predicate: (entry: [K, V]) => boolean
): Record<K, V> =>
  Object.fromEntries(
    Object.entries(obj).filter(([key, value]) =>
      predicate([key as K, value as V])
    )
  ) as Record<K, V>;
