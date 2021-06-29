import React from "react";
import useWebsocket, { gatherForCleanup } from "./useWebsocket";
import { useEffect } from "react";
import Room from "./components/Room";
import Controls from "./components/Controls";
import SplitLayout from "./components/SplitLayout";
import Messages from "./components/Messages";
import styled from "styled-components";

const Container = styled.div`
  height: 100%;
  width: 100%;
  background-color: black;
  color: white;
`;

type GameProps = {
  playerUuid: string;
};
const Game: React.FC<GameProps> = ({ playerUuid }) => {
  const [hasRegisteredWithServer, setHasRegisteredWithServer] =
    React.useState(false);

  const [messages, setMessages] = React.useState<string[]>([]);

  const appendMessage = (msg: string) => {
    console.log("append");
    setMessages((messages) => [msg, ...messages].slice(0, 10));
  };

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
    () =>
      gatherForCleanup([
        ws.on("LOGIN", (payload) => {
          if (payload.playerUuid === playerUuid) {
            setHasRegisteredWithServer(true);
            appendMessage(`LOGIN: you`);
          } else {
            appendMessage(`LOGIN: ${payload.playerUuid}`);
          }
        }),

        ws.on("LOGOUT", (payload) => {
          if (payload.playerUuid === playerUuid) {
            setHasRegisteredWithServer(false);
            appendMessage(`LOGOUT: you`);
          } else {
            appendMessage(`LOGOUT: ${payload.playerUuid}`);
          }
        }),
      ]),

    [playerUuid]
  );

  return (
    <Container>
      <SplitLayout
        size={{ second: 300 }}
        layout={"columns"}
        first={() => (
          <SplitLayout
            size={{ second: 300 }}
            layout={"rows"}
            first={() => <Room />}
            second={() => <Messages messages={messages} />}
          />
        )}
        second={() => <Controls />}
      />
    </Container>
  );
};

export default Game;
