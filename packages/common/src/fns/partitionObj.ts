export const partitionObj = <K extends string, V>(
  obj: Record<K, V>,
  predicate: (entry: [K, V]) => boolean
): [Record<K, V>, Record<K, V>] => {
  const match: Array<[K, V]> = [];
  const notMatch: Array<[K, V]> = [];

  const entries = Object.entries(obj) as Array<[K, V]>;
  entries.forEach((entry: [K, V]) => {
    predicate(entry) ? match.push(entry) : notMatch.push(entry);
  });

  return [
    Object.fromEntries(match) as Record<K, V>,
    Object.fromEntries(notMatch) as Record<K, V>,
  ];
};
