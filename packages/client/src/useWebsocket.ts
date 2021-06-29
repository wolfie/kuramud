import * as React from "react";
import { useEffect } from "react";
import type {
  Topic,
  TopicHandler,
  TopicHandlerRegistrationWithUnregistration,
} from "kuramud-common";

export type SendTopicData = (
  topic: Topic,
  data: Record<string, unknown>
) => void;

const w =
  <URL extends string>(url: URL) =>
  <T extends { url: string }>(entry: T): entry is T & { url: URL } =>
    entry.url === url;

export const gatherForCleanup = (fns: Array<() => void>) => () =>
  fns.forEach((fn) => fn());

type HandlerEntry<T extends Topic = Topic> = {
  url: string;
  topic: T;
  handler: TopicHandler<T>;
};

type WebsocketHook = {
  on: TopicHandlerRegistrationWithUnregistration;
} & ({ connected: false } | { connected: true; send: SendTopicData });

const useWebsocket = (url: string): WebsocketHook => {
  const [websockets, setWebsockets] = React.useState<
    Array<{ url: string; websocket: WebSocket }>
  >([]);
  const [connecteds, setConnecteds] = React.useState<
    Array<{ url: string; connected: boolean }>
  >([]);
  const [handlers, setHandlers] = React.useState<
    Array<HandlerEntry /*{ url: string; topic: Topic; handler: TopicHandler<Topic> }*/>
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

      handlers
        .filter(w(url))
        .filter((entry) => entry.topic === topic)
        .forEach((entry) => entry.handler(JSON.parse(payload)));
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
    on: (topic, handler) => {
      const newEntry: HandlerEntry<typeof topic> = { url, topic, handler };
      setHandlers((handlers) => [...handlers, newEntry as any]);

      return () =>
        setHandlers((handlers) =>
          handlers.filter((entry) => (entry as any) !== newEntry)
        );
    },
  };
};

export default useWebsocket;
