import * as React from "react";
import { useEffect } from "react";
import type {
  ClientToServerPayloadType,
  ClientToServerTopic,
  ServerToClientPayloadType,
  ServerToClientTopic,
} from "kuramud-common";

const BACKEND_URL = "ws://localhost:8000";

export type SendTopicData = <T extends ClientToServerTopic>(
  topic: T,
  payload: ClientToServerPayloadType<T>
) => void;

export const gatherForCleanup = (fns: Array<() => void>) => () =>
  fns.forEach((fn) => {
    console.log("CLEANUP!");
    fn();
  });

type Handler<T extends ServerToClientTopic> = (
  payload: ServerToClientPayloadType<T>,
  send: SendTopicData
) => void;

type HandlerEntry<T extends ServerToClientTopic> = {
  topic: T;
  handler: Handler<T>;
};

export type WebsocketHook = {
  on: <T extends ServerToClientTopic>(
    topic: T,
    handler: Handler<T>
  ) => () => void;
} & ({ connected: false } | { connected: true; send: SendTopicData });

const createSend =
  (websocket: WebSocket, connected: boolean): SendTopicData =>
  (topic, payload: any) => {
    const message =
      typeof payload !== "undefined"
        ? `${topic} ${JSON.stringify(payload)}`
        : topic;
    console.log(`[send ${message}]`);
    if (!connected) console.error("unexpected websocket is not connected");
    else websocket.send(message);
  };

const useWebsocket = (): WebsocketHook => {
  const [websocket] = React.useState(() => new WebSocket(BACKEND_URL));
  const [connected, setConnected] = React.useState(false);
  const [handlers, setHandlers] = React.useState<Array<HandlerEntry<any>>>([]);

  useEffect(() => {
    console.log("init websocket");

    websocket.onopen = () => {
      console.log("connected");
      setConnected(true);
    };
    websocket.onclose = () => {
      console.log("closed");
      setConnected(false);
    };
    websocket.onerror = (e) => {
      console.error(e);
      setConnected(false);
      websocket.close();
    };
    return () => websocket.close();
  }, [websocket]);

  useEffect(() => {
    const send = createSend(websocket, connected);

    websocket.onmessage = (e) => {
      if (typeof e.data !== "string") {
        console.info(`unexpected websocket data type: ${typeof e.data}`);
        return;
      }

      const [topic, payload] = e.data.split(" ", 2);
      console.log(`[receive ${topic}] ${payload}`);

      handlers
        .filter((entry) => entry.topic === topic)
        .forEach((entry) => entry.handler(JSON.parse(payload), send));
    };
  }, [handlers, websocket, connected]);

  return React.useMemo(
    () => ({
      ...(connected
        ? { connected: true, send: createSend(websocket, connected) }
        : { connected: false }),
      on: (topic, handler) => {
        const newEntry: HandlerEntry<typeof topic> = { topic, handler };
        setHandlers((handlers) => [...handlers, newEntry]);
        return () => setHandlers(filterNotEqual(newEntry));
      },
    }),
    [websocket, connected]
  );
};

const filter =
  <T>(predicate: (entry: T) => boolean) =>
  (arr: T[]) =>
    arr.filter(predicate);

const filterNotEqual = <T>(comparison: T) => filter<T>(($) => $ !== comparison);

export default useWebsocket;
