import React from "react";
import { useEffect } from "react";
import styled from "styled-components";
import Room from "./components/Room";
import Controls from "./components/Controls";
import SplitLayout from "./components/SplitLayout";
import Messages, { Message } from "./components/Messages";
import ApiConnectionGuard from "./components/ApiConnectionGuard";
import DevControls from "./components/DevControls";
import WebsocketApi from "./WebsocketApi";
import { ServerToClientPayloadType, createLogger } from "kuramud-common";

const logger = createLogger("Game.tsx");

const api = new WebsocketApi();
export const SharedWebsocketContext = React.createContext<WebsocketApi>(api);

const Container = styled.div`
  background-color: black;
  color: white;
  width: 100%;
`;

type GameProps = {
  playerUuid: string;
  oneTimeCode: string;
};
const Game: React.FC<GameProps> = ({ playerUuid, oneTimeCode }) => {
  const [apiIsConnected, setApiIsConnected] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [roomDescription, setRoomDescription] = React.useState<
    ServerToClientPayloadType<"DESCRIBE_ROOM">
  >({ description: "", exits: [], items: [] });
  const [walkIsOnCooldown, setWalkIsOnCooldown] = React.useState(false);

  const appendMessage = (text: string) => {
    logger.log("append");
    setMessages((messages) =>
      [{ text, timestamp: Date.now() }, ...messages].slice(0, 10)
    );
  };

  useEffect(() => {
    setApiIsConnected(api.connected);
    const off = api.onConnectionStatusChange(setApiIsConnected);
    return off;
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    api.send("LOGIN", { playerUuid: playerUuid as any, oneTimeCode });
  }, [isLoggedIn, oneTimeCode, playerUuid]);

  useEffect(() => {
    logger.log("plaueruuid or ws changed");
    const unregisterFunctions = [
      api.on("LOGIN", (payload, send) => {
        if (payload.playerUuid === playerUuid) {
          setIsLoggedIn(true);
          send("LOOK_ROOM", undefined);
        } else {
          appendMessage(`LOGIN: ${payload.playerName}`);
        }
      }),

      api.on("LOGOUT", (payload) => {
        if (payload.playerUuid === playerUuid) {
          setIsLoggedIn(false);
          appendMessage(`LOGOUT: you`);
        } else {
          appendMessage(`LOGOUT: ${payload.playerName}`);
        }
      }),

      api.on("DESCRIBE_ROOM", (roomDesc) => setRoomDescription(roomDesc)),

      api.on("DESCRIBE_ITEM", (item) =>
        appendMessage(
          item.found
            ? item.description
            : `You can't find anything looking like ${item.keyword}`
        )
      ),

      api.on(
        "WALK",
        ({
          direction,
          goingOrComing,
          playerUuid: walkingPlayerUuid,
          playerName,
        }) => {
          const action =
            walkingPlayerUuid === playerUuid
              ? `you ${goingOrComing === "comingFrom" ? "come" : "leave"}`
              : `${playerName} ${
                  goingOrComing === "comingFrom" ? "comes" : "leaves"
                }`;

          const fromOrTo = goingOrComing === "comingFrom" ? "from" : "to";

          appendMessage(`${action} ${fromOrTo} ${direction}`);
        }
      ),

      api.on("ECHO_MESSAGE", ({ message }) => appendMessage(message)),

      api.on("WALK_STATE", ({ onCooldown }) => setWalkIsOnCooldown(onCooldown)),
    ];

    return () => {
      logger.log("cleanup!");
      unregisterFunctions.forEach((fn) => fn());
    };
  }, [playerUuid]);

  return (
    <SharedWebsocketContext.Provider value={api}>
      <ApiConnectionGuard isConnected={apiIsConnected}>
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
                    items={roomDescription.items.map((item) => item.name)}
                  />
                )}
                second={() => <Messages messages={messages} />}
              />
            )}
            second={() => (
              <Controls
                enabledDirections={roomDescription.exits}
                walkIsDisabled={walkIsOnCooldown}
              />
            )}
          />
        </Container>
      </ApiConnectionGuard>
    </SharedWebsocketContext.Provider>
  );
};

export default Game;
