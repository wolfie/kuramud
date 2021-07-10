const joinWithCommaAndAnd = (arr: string[]): string =>
  arr.length === 0
    ? ""
    : arr.length === 1
    ? arr[0]
    : arr.length === 2
    ? `${arr[0]} and ${arr[1]}`
    : `${arr.slice(0, -1).join(", ")} and ${arr.slice(-1)}`;

export default joinWithCommaAndAnd;
