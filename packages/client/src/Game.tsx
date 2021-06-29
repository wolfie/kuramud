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
      if (hasRegisteredWithServer || !ws.connected) return;
      ws.send("LOGIN", { playerUuid });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasRegisteredWithServer, playerUuid, ws.connected]
  );

  useEffect(
    () => {
      const loginHandler: TopicHandler = (payload) => {
        if (payload.playerUuid === playerUuid) {
          setHasRegisteredWithServer(true);
          console.log(`LOGIN: you`);
        } else {
          console.log(`LOGIN: ${payload}`);
        }
      };

      const logoutHandler: TopicHandler = (payload) => {
        if (payload.playerUuid === playerUuid) {
          setHasRegisteredWithServer(false);
          console.log(`LOGOUT: you`);
        } else {
          console.log(`LOGOUT: ${payload}`);
        }
      };

      ws.addTopicHandler("LOGIN", loginHandler);
      ws.addTopicHandler("LOGOUT", logoutHandler);

      return () => {
        ws.removeTopicHandler("LOGIN", loginHandler);
        ws.removeTopicHandler("LOGOUT", logoutHandler);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerUuid]
  );

  return <Main room={<Room />} controls={<Controls />} />;
};

export default Game;
