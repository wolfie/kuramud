import React from "react";
import useWebsocket, { TopicHandler } from "./useWebsocket";
import { useEffect } from "react";
import Room from "./components/Room";
import Main from "./components/Main";
import Controls from "./components/Controls";

type GameProps = {
  playerUuid: string;
};
const Game: React.FC<GameProps> = ({ playerUuid }) => {
  const [hasRegisteredWithServer, setHasRegisteredWithServer] =
    React.useState(false);

  const ws = useWebsocket("ws://localhost:8000");

  useEffect(
    () => {
      console.log({
        hasRegisteredWithServer,
        connected: ws.connected,
      });
      if (hasRegisteredWithServer || !ws.connected) return;
      ws.send("LOGIN", { playerUuid });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasRegisteredWithServer, playerUuid, ws.connected]
  );

  useEffect(
    () => {
      const loginHandler: TopicHandler = (msgPlayerUuid) => {
        if (msgPlayerUuid === playerUuid) setHasRegisteredWithServer(true);
        console.log(`LOGIN: ${msgPlayerUuid}`);
      };
      ws.addTopicHandler("LOGIN", loginHandler);

      return () => ws.removeTopicHandler("LOGIN", loginHandler);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerUuid]
  );

  return <Main room={<Room />} controls={<Controls />} />;
};

export default Game;
