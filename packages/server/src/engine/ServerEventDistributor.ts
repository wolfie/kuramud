import {
  ClientToServerPayloadType,
  ClientToServerTopic,
  ServerToClientTopic,
} from "kuramud-common";

type AnyTopic = ServerToClientTopic | ClientToServerTopic;

export type TopicHandler<T extends AnyTopic> = (
  payload: ClientToServerPayloadType<T>,
  sourcePlayerUuid: string
) => void;

export type TopicHandlerEntry<T extends AnyTopic> = {
  topic: T;
  handler: TopicHandler<T>;
};

export class ServerEventDistributor {
  private topicHandlers: TopicHandlerEntry<any>[] = [];

  public register = <T extends AnyTopic>(
    topic: T,
    handler: TopicHandler<T>
  ) => {
    const handlerEntry = { topic, handler };
    this.topicHandlers.push(handlerEntry as any);
    return () => {
      this.topicHandlers.splice(
        this.topicHandlers.indexOf(handlerEntry as any),
        1
      );
    };
  };

  public dispatch = <T extends AnyTopic>(
    topic: T,
    payload: ClientToServerPayloadType<T>,
    sourcePlayerUuid: string
  ): void =>
    this.topicHandlers
      .filter((entry): entry is TopicHandlerEntry<T> => entry.topic === topic)
      .forEach((entry) => entry.handler(payload, sourcePlayerUuid));
}
