import { ClientToServerPayloadType, Topic } from "kuramud-common";

export type TopicHandler<T extends Topic> = (
  payload: ClientToServerPayloadType<T>,
  sourcePlayerUuid: string
) => void;

export type TopicHandlerEntry<T extends Topic> = {
  topic: T;
  handler: TopicHandler<T>;
};

export class ServerEventDistributor {
  private topicHandlers: TopicHandlerEntry<any>[] = [];

  public register = <T extends Topic>(topic: T, handler: TopicHandler<T>) => {
    const handlerEntry = { topic, handler };
    this.topicHandlers.push(handlerEntry as any);
    return () => {
      this.topicHandlers.splice(
        this.topicHandlers.indexOf(handlerEntry as any),
        1
      );
    };
  };

  public dispatch = <T extends Topic>(
    topic: T,
    payload: ClientToServerPayloadType<T>,
    sourcePlayerUuid: string
  ): void =>
    this.topicHandlers
      .filter((entry): entry is TopicHandlerEntry<T> => entry.topic === topic)
      .forEach((entry) => entry.handler(payload, sourcePlayerUuid));
}
