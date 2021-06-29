import * as t from "io-ts";
import {
  PayloadOfTopic,
  Topic,
  TopicHandlerEntry,
  TopicHandlerRegistrationWithUnregistration,
} from "./Topic";

export class EventDistributor {
  private topicHandlers: TopicHandlerEntry<any>[] = [];

  public register: TopicHandlerRegistrationWithUnregistration = (
    topic,
    handler
  ) => {
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
