import {
  ClientToServerPayloadType,
  ClientToServerTopic,
  createLogger,
  ServerToClientPayloadType,
  ServerToClientTopic,
} from "kuramud-common";

const logger = createLogger("WebsocketApi.ts");

const BACKEND_URL = "ws://localhost:8000";

export type SendTopicData = <T extends ClientToServerTopic>(
  topic: T,
  payload: ClientToServerPayloadType<T>
) => void;

type Handler<T extends ServerToClientTopic> = (
  payload: ServerToClientPayloadType<T>,
  send: SendTopicData
) => void;

type HandlerEntry<T extends ServerToClientTopic> = {
  topic: T;
  handler: Handler<T>;
};

class WebsocketApi {
  private readonly ws: WebSocket;
  private readonly handlers: HandlerEntry<any>[] = [];
  private readonly connectionStatusHandlers: ((open: boolean) => void)[] = [];

  constructor() {
    this.ws = new WebSocket(BACKEND_URL);
    this.ws.onopen = () => {
      logger.log("connected");
      this.connectionStatusHandlers.forEach((fn) => fn(true));
    };
    this.ws.onclose = () => {
      logger.log("closed");
      this.ws.close();
      this.connectionStatusHandlers.forEach((fn) => fn(false));
    };
    this.ws.onerror = (e) => {
      logger.error(e);
      this.ws.close();
    };

    this.ws.onmessage = (e) => {
      if (typeof e.data !== "string") {
        logger.info(`unexpected websocket data type: ${typeof e.data}`);
        return;
      }

      const REGEX_MATCHER = /^(?<topic>[^ ]+)(?: (?<payload>.+)?)?$/gm; // regex instances are stateful, so we need to recreate it always
      const match = REGEX_MATCHER.exec(e.data);
      if (!match) {
        logger.error(
          `regex ${REGEX_MATCHER} didn't match anything for ${e.data}`
        );
        return;
      }

      const topic = match.groups?.topic;
      const payload = match.groups?.payload;
      logger.log(`[receive ${topic}] ${payload}`);

      if (typeof topic === "undefined") {
        logger.error("unparseable message " + e.data);
        return;
      }

      const objPayload = payload ? JSON.parse(payload) : undefined;
      this.handlers
        .filter((entry) => entry.topic === topic)
        .forEach((entry) => entry.handler(objPayload, this.send));
    };
  }

  close = () => {
    logger.log("close");
    this.ws.close();
  };

  onConnectionStatusChange = (handler: (open: boolean) => void) => {
    this.connectionStatusHandlers.push(handler);
    return () => {
      this.connectionStatusHandlers.splice(
        this.connectionStatusHandlers.indexOf(handler),
        1
      );
    };
  };

  on = <T extends ServerToClientTopic>(topic: T, handler: Handler<T>) => {
    const newEntry: HandlerEntry<typeof topic> = { topic, handler };
    this.handlers.push(newEntry);
    return () => {
      this.handlers.splice(this.handlers.indexOf(newEntry), 1);
    };
  };

  get connected() {
    return this.ws.readyState === WebSocket.OPEN;
  }

  send: SendTopicData = (topic, payload: any) => {
    if (!this.connected) {
      logger.warn(
        `Websocket is not open anymore (readystate: ${this.ws.readyState})`
      );
      return;
    }

    this.ws.send(
      typeof payload !== "undefined"
        ? `${topic} ${JSON.stringify(payload)}`
        : topic
    );
  };
}

export default WebsocketApi;
