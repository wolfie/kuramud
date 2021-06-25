import * as React from "react";
import { useEffect } from "react";

export type TopicHandler = (payload: string) => void;
export type TopicHandlerRegistration = (
  topic: string,
  handler: TopicHandler
) => void;
export type SendTopicData = (topic: string, data: string) => void;

type WebsocketHook = {
  addTopicHandler: TopicHandlerRegistration;
  removeTopicHandler: TopicHandlerRegistration;
  sendIfPossible: SendTopicData;
  connectedFunctions:
    | { connected: false }
    | { connected: true; send: SendTopicData };
};
const useWebsocket = (url: string): WebsocketHook => {
  const [ws, setWs] = React.useState<WebSocket>();
  const [connected, setConnected] = React.useState(false);
  const handlers = React.useRef<Record<string, TopicHandler[]>>({});

  const messageHandler = (e: MessageEvent) => {
    if (typeof e.data !== "string") {
      console.info(`unexpected websocket data type: ${typeof e.data}`);
      return;
    }

    const [topic, payload] = e.data.split(" ", 2);
    const topicHandlers = handlers.current[topic.toUpperCase()];
    if (topicHandlers)
      Object.values(topicHandlers).forEach((handler) => handler(payload));
  };

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
    topic,
    handler
  ) => {
    const normalizedTopic = topic.toUpperCase();
    const topicHandlers = handlers.current[normalizedTopic];
    if (!topicHandlers) {
      handlers.current = { ...handlers.current, [normalizedTopic]: [handler] };
    } else {
      const handlerExists = topicHandlers.some(
        (existingHandler) => existingHandler === handler
      );
      if (!handlerExists) {
        handlers.current = {
          ...handlers.current,
          [normalizedTopic]: [...topicHandlers, handler],
        };
      }
    }
  };
  const removeTopicHandler: WebsocketHook["removeTopicHandler"] = (
    topic,
    handler
  ) => {
    const normalizedTopic = topic.toUpperCase();
    const topicHandlers = handlers.current[normalizedTopic];
    if (!topicHandlers) return;

    const handlerExists = topicHandlers.some(
      (existingHandler) => existingHandler === handler
    );
    if (!handlerExists) return;

    handlers.current = {
      ...handlers.current,
      [normalizedTopic]: topicHandlers.filter(
        (existingHandler) => existingHandler !== handler
      ),
    };
  };

  const send = React.useCallback<SendTopicData>(
    (topic, data) => {
      if (!connected || !ws) {
        console.warn("trying to send messages before websocket has connected");
        return;
      }

      ws.send(`${topic.toUpperCase()} ${data}`);
    },
    [connected, ws]
  );

  const getReturnValue = (): WebsocketHook => ({
    addTopicHandler,
    removeTopicHandler,
    sendIfPossible: (topic, msg) => connected && send(topic, msg),
    connectedFunctions: connected
      ? { connected: true, send }
      : { connected: false },
  });

  const [returnValue, setReturnValue] = React.useState<WebsocketHook>(
    getReturnValue()
  );

  useEffect(() => {
    setReturnValue(getReturnValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getReturnValue is fine as a non-dep
  }, [connected, ws, send]);

  return returnValue;
};

export default useWebsocket;
