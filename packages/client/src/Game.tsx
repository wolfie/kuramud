import React from "react";
import { useEffect } from "react";
import styled from "styled-components";
import Room from "./components/Room";
import Controls from "./components/Controls";
import SplitLayout from "./components/SplitLayout";
import Messages from "./components/Messages";
import DevControls from "./DevControls";
import WebsocketApi from "./WebsocketApi";
import { ServerToClientPayloadType } from "kuramud-common";

const api = new WebsocketApi();
export const SharedWebsocketContext = React.createContext<WebsocketApi>(api);

const Container = styled.div`
  background-color: black;
  color: white;
  width: 100%;
`;

type GameProps = {
  playerUuid: string;
};
const Game: React.FC<GameProps> = ({ playerUuid }) => {
  const [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _apiIsConnected,
    setApiIsConnected,
  ] = React.useState(false);
  const [hasRegisteredWithServer, setHasRegisteredWithServer] =
    React.useState(false);
  const [messages, setMessages] = React.useState<string[]>([]);
  const [roomDescription, setRoomDescription] = React.useState<
    ServerToClientPayloadType<"DESCRIBE_ROOM">
  >({ description: "", exits: [] });

  const appendMessage = (msg: string) => {
    console.log("append");
    setMessages((messages) => [msg, ...messages].slice(0, 10));
  };

  useEffect(() => {
    setApiIsConnected(api.connected);
    const off = api.onConnectionStatusChange(setApiIsConnected);
    return off;
  }, []);

  useEffect(
    () => {
      if (hasRegisteredWithServer) return;
      api.send("LOGIN", { playerUuid: playerUuid as any });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasRegisteredWithServer, playerUuid]
  );

  useEffect(() => {
    console.log("plaueruuid or ws changed");
    const unregisterFunctions = [
      api.on("LOGIN", (payload, send) => {
        if (payload.playerUuid === playerUuid) {
          setHasRegisteredWithServer(true);
          send("LOOK_ROOM", undefined);
        } else {
          appendMessage(`LOGIN: ${payload.playerUuid}`);
        }
      }),

      api.on("LOGOUT", (payload) => {
        if (payload.playerUuid === playerUuid) {
          setHasRegisteredWithServer(false);
          appendMessage(`LOGOUT: you`);
        } else {
          appendMessage(`LOGOUT: ${payload.playerUuid}`);
        }
      }),

      api.on("DESCRIBE_ROOM", (roomDesc) => setRoomDescription(roomDesc)),
    ];

    return () => {
      console.log("cleanup!");
      unregisterFunctions.forEach((fn) => fn());
    };
  }, [playerUuid]);

  return (
    <SharedWebsocketContext.Provider value={api}>
      <Container>
        <DevControls />
        <SplitLayout
          size={{ second: 300 }}
          layout={"columns"}
          first={() => (
            <SplitLayout
              size={{ second: 300 }}
              layout={"rows"}
              first={() => (
                <Room
                  description={roomDescription.description}
                  exits={roomDescription.exits}
                />
              )}
              second={() => <Messages messages={messages} />}
            />
          )}
          second={() => <Controls enabledDirections={roomDescription.exits} />}
        />
      </Container>
    </SharedWebsocketContext.Provider>
  );
};

export default Game;
