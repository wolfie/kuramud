import * as React from "react";
import { useEffect } from "react";

type Topic = "LOGIN" | "LOGOUT"; // TODO: use shared library between server/client

export type TopicHandler = (payload: Record<string, unknown>) => void;
export type TopicHandlerRegistration = (
  topic: Topic,
  handler: TopicHandler
) => void;

export type SendTopicData = (
  topic: Topic,
  data: Record<string, unknown>
) => void;

const w =
  <URL extends string>(url: URL) =>
  <T extends { url: string }>(entry: T): entry is T & { url: URL } =>
    entry.url === url;

type WebsocketHook = {
  addTopicHandler: TopicHandlerRegistration;
  removeTopicHandler: TopicHandlerRegistration;
} & ({ connected: false } | { connected: true; send: SendTopicData });

const useWebsocket = (url: string): WebsocketHook => {
  const [websockets, setWebsockets] = React.useState<
    Array<{ url: string; websocket: WebSocket }>
  >([]);
  const [connecteds, setConnecteds] = React.useState<
    Array<{ url: string; connected: boolean }>
  >([]);
  const [handlers, setHandlers] = React.useState<
    Array<{ url: string; topic: Topic; handler: TopicHandler }>
  >([]);

  useEffect(() => {
    const foundEntry = websockets.find(w(url));
    if (!foundEntry) {
      return setWebsockets((websockets) => [
        ...websockets,
        { url, websocket: new WebSocket(url) },
      ]);
    }

    const setConnected = (connected: boolean) =>
      setConnecteds((connecteds) =>
        connecteds.some(w(url))
          ? connecteds.map((entry) =>
              entry.url !== url ? entry : { ...entry, connected }
            )
          : [...connecteds, { url, connected }]
      );

    const removeWebsocket = () =>
      setWebsockets((websockets) => websockets.filter(w(url)));

    const websocket = foundEntry.websocket;
    websocket.onopen = () => {
      console.log("connected");
      setConnected(true);
    };
    websocket.onclose = () => {
      console.log("closed");
      setConnected(false);
      removeWebsocket();
    };
    websocket.onerror = (e) => {
      console.error(e);
      setConnected(false);
      removeWebsocket();
    };

    websocket.onmessage = (e) => {
      if (typeof e.data !== "string") {
        console.info(`unexpected websocket data type: ${typeof e.data}`);
        return;
      }

      const [topic, payload] = e.data.split(" ", 2);
      console.log(`[receive ${topic}] ${payload}`);

      const topicHandlers = handlers.filter(w(url));
      topicHandlers.forEach((entry) => entry.handler(JSON.parse(payload)));
    };
  }, [handlers, url, websockets]);

  const send: SendTopicData = (topic, data) => {
    console.log(`[send ${topic}]`);
    const foundEntry = websockets.find(w(url));
    foundEntry
      ? foundEntry.websocket.send(`${topic} ${JSON.stringify(data)}`)
      : console.error(`can't find websocket for ${url}`);
  };

  return {
    ...(connecteds.find(w(url))?.connected
      ? { connected: true, send }
      : { connected: false }),
    addTopicHandler: (topic, handler) =>
      setHandlers((handlers) => [...handlers, { url, topic, handler }]),
    removeTopicHandler: (topic, handler) =>
      setHandlers((handlers) =>
        handlers.filter(
          (entry) =>
            entry.handler !== handler ||
            entry.topic !== topic ||
            entry.url !== url
        )
      ),
  };
};

export default useWebsocket;
