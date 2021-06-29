import * as t from "io-ts";
import { Topic, TopicTypeMap } from "./Topic";

export type PayloadOfTopic<T extends Topic> = t.TypeOf<typeof TopicTypeMap[T]>;

export type TopicHandler<T extends Topic> = (
  payload: PayloadOfTopic<T>
) => void;

type TopicHandlerEntry<T extends Topic> = {
  topic: T;
  handler: TopicHandler<T>;
};

export class EventDistributor {
  private topicHandlers: TopicHandlerEntry<any>[] = [];

  public register = <T extends Topic>(topic: T, handler: TopicHandler<T>) => {
    const handlerEntry = { topic, handler };
    this.topicHandlers.push(handlerEntry);
    return () => {
      this.topicHandlers.splice(this.topicHandlers.indexOf(handlerEntry), 1);
    };
  };

  public dispatch = <T extends Topic>(topic: T, payload: PayloadOfTopic<T>) =>
    this.topicHandlers
      .filter((entry): entry is TopicHandlerEntry<T> => entry.topic === topic)
      .forEach((entry) => entry.handler(payload));
}
