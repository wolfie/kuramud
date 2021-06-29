import { decodeFromStr } from "./decodeFromStr";
import { PayloadOfTopic, Topic, TopicTypeMap } from "./Topic";

export const parseInput = <T extends Topic>(
  str: string
): { topic: T; payload: PayloadOfTopic<T> } | undefined => {
  const [topic, payloadStr] = str.split(" ", 2);
  if (!Topic.is(topic)) {
    console.error("unexpected topic " + topic);
    return undefined;
  } else {
    const type = TopicTypeMap[topic];
    const payload = decodeFromStr(type, payloadStr);
    return {
      topic: topic as T,
      payload,
    };
  }
};
