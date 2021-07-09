import * as React from "react";
import { useEffect } from "react";
import type {
  ClientToServerPayloadType,
  ServerToClientPayloadType,
  Topic,
} from "kuramud-common";

const BACKEND_URL = "ws://localhost:8000";

export type SendTopicData = <T extends Topic>(
  topic: T,
  payload: ClientToServerPayloadType<T>
) => void;

export const gatherForCleanup = (fns: Array<() => void>) => () =>
  fns.forEach((fn) => fn());

type Handler<T extends Topic> = (payload: ServerToClientPayloadType<T>) => void;

type HandlerEntry<T extends Topic> = {
  topic: T;
  handler: Handler<T>;
};

type WebsocketHook = {
  on: <T extends Topic>(topic: T, handler: Handler<T>) => () => void;
} & ({ connected: false } | { connected: true; send: SendTopicData });

const useWebsocket = (): WebsocketHook => {
  const [websocket, setWebsocket] = React.useState<WebSocket>();
  const [connected, setConnected] = React.useState(false);
  const [handlers, setHandlers] = React.useState<Array<HandlerEntry<any>>>([]);

  useEffect(() => {
    console.log("make websocket");
    const websocket = new WebSocket(BACKEND_URL);
    setWebsocket(websocket);

    websocket.onopen = () => {
      console.log("connected");
      setConnected(true);
    };
    websocket.onclose = () => {
      console.log("closed");
      setConnected(false);
      setWebsocket(undefined);
    };
    websocket.onerror = (e) => {
      console.error(e);
      setConnected(false);
      setWebsocket(undefined);
      websocket.close();
    };
    return () => websocket.close();
  }, []);

  useEffect(() => {
    if (!websocket) return;

    websocket.onmessage = (e) => {
      if (typeof e.data !== "string") {
        console.info(`unexpected websocket data type: ${typeof e.data}`);
        return;
      }

      const [topic, payload] = e.data.split(" ", 2);
      console.log(`[receive ${topic}] ${payload}`);

      handlers
        .filter((entry) => entry.topic === topic)
        .forEach((entry) => entry.handler(JSON.parse(payload)));
    };
  }, [handlers, websocket]);

  const send: SendTopicData = (topic, payload: any) => {
    const message = `${topic} ${JSON.stringify(payload)}`;
    console.log(`[send ${message}]`);
    if (!websocket) console.error("unexpected no websocket set");
    else if (!connected) console.error("unexpected websocket is not connected");
    else websocket.send(message);
  };

  return {
    ...(connected ? { connected: true, send } : { connected: false }),
    on: (topic, handler) => {
      const newEntry: HandlerEntry<typeof topic> = { topic, handler };
      setHandlers((handlers) => [...handlers, newEntry]);
      return () => setHandlers(filterNotEqual(newEntry));
    },
  };
};

const filter =
  <T>(predicate: (entry: T) => boolean) =>
  (arr: T[]) =>
    arr.filter(predicate);

const filterNotEqual = <T>(comparison: T) => filter<T>(($) => $ !== comparison);

export default useWebsocket;
