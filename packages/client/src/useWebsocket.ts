import * as React from "react";
import { useEffect } from "react";

type WebsocketHookConnected = {
  connected: true;
  send: (topic: string, data: string) => void;
};
type WebsocketHook = {
  addTopicHandler: (symbol: symbol, handler: (payload: string) => void) => void;
} & ({ connected: false } | WebsocketHookConnected);
const useWebsocket = (url: string): WebsocketHook => {
  const [ws, setWs] = React.useState<WebSocket>();
  const [connected, setConnected] = React.useState(false);
  const [handlers, setHandlers] = React.useState<
    Record<string, Array<{ symbol: Symbol; handler: (data: string) => void }>>
  >({});

  const messageHandler = React.useCallback(
    (e) => {
      if (typeof e.data !== "string") {
        console.info(`unexpected websocket data type: ${typeof e.data}`);
        return;
      }

      const [topic, payload] = e.data.split(" ", 2);
      const topicHandlers = handlers[topic.toUpperCase()];
      if (topicHandlers)
        Object.values(topicHandlers).forEach(({ handler }) => handler(payload));
    },
    [handlers]
  );

  useEffect(() => {
    const ws = new WebSocket(url);
    setWs(ws);

    return () => {
      ws.close();
      setWs(undefined);
    };
  }, [url]);

  if (ws) {
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => {
      console.error(e);
      setConnected(false);
    };
    ws.onmessage = messageHandler;
  }

  const addTopicHandler: WebsocketHook["addTopicHandler"] = (
    symbol,
    handler
  ) => {
    const topic = symbol.description;
    if (!topic) {
      console.trace("foo");
      return;
    }

    const normalizedTopic = topic.toUpperCase();
    const topicHandlers = handlers[normalizedTopic];
    if (!topicHandlers) {
      setHandlers({ ...handlers, [normalizedTopic]: [{ symbol, handler }] });
    } else {
      const existingEntry = topicHandlers.find(
        (existingEntry) => existingEntry.symbol === symbol
      );
      if (!existingEntry) {
        setHandlers({
          ...handlers,
          [normalizedTopic]: [...topicHandlers, { handler, symbol }],
        });
      } else if (existingEntry.handler !== handler) {
        setHandlers({
          ...handlers,
          [normalizedTopic]: topicHandlers.map(($) =>
            $ !== existingEntry ? $ : { symbol, handler }
          ),
        });
      }
    }
  };

  const send: WebsocketHookConnected["send"] = (topic, data) => {
    if (!connected || !ws) {
      console.warn("trying to send messages before websocket has connected");
      return;
    }

    ws.send(`${topic.toUpperCase()} ${data}`);
  };

  return connected
    ? { connected, addTopicHandler, send }
    : { connected, addTopicHandler };
};

export default useWebsocket;
