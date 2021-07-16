export const splitBySpace = (str: string): [string, string] => {
  const match = /(?<first>[^ ]*) ?(?<second>.*)/gm.exec(str);
  return match?.groups
    ? [match.groups["first"] ?? "", match.groups["second"] ?? ""]
    : ["", ""];
};
