import express from "express";
import ws from "ws";
import { ClientToServer, decode } from "kuramud-common";
import Engine from "./engine/engine";
import { UUID } from "io-ts-types";
import WebSocket from "ws";

const PORT = 8000;

const app = express();

let playerSockets: { playerUuid: UUID; socket: ws }[] = [];

const addPlayerSocketSpecial = (playerUuid: UUID, socket: ws) => {
  const alreadyHasASocket = playerSockets.some(
    (entry) => entry.playerUuid === playerUuid
  );
  if (alreadyHasASocket) {
    console.error(`Player ${playerUuid} already has a socket`);
  } else {
    playerSockets.push({ playerUuid, socket });
    console.log(`added socket for ${playerUuid} (now ${playerSockets.length})`);
  }
};

const removePlayerSocketSpecial = (playerUuid: string) => {
  const playerSocketExists = playerSockets.some(
    (entry) => entry.playerUuid === playerUuid
  );
  if (!playerSocketExists) {
    console.error(`Player ${playerUuid} does not have an existing socket`);
  } else {
    playerSockets = playerSockets.filter(
      (entry) => entry.playerUuid !== playerUuid
    );
    console.log(`removed socket for ${playerUuid}`);
  }
};

const engine = new Engine({
  eventSender: (topic, playerUuids, payload: any) =>
    playerSockets
      .filter(({ playerUuid }) => playerUuids.includes(playerUuid))
      .forEach(({ socket, playerUuid }) => {
        console.log(`[send ${topic} to ${playerUuid}]`);
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn("socket is not open");
          return;
        }
        socket.send(
          `${topic} ${JSON.stringify(payload)}`,
          (e) => e && console.error(e)
        );
      }),
});

const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", (socket) => {
  console.log("CONNECTION");
  socket.on("close", () => {
    const found = playerSockets.find((entry) => entry.socket === socket);
    if (found) {
      console.log(`closing socket for player ${found.playerUuid}`);
      playerSockets = playerSockets.filter(
        (entry) => entry.playerUuid !== found.playerUuid
      );

      engine.logoutPlayer(found.playerUuid);
    } else {
      console.info(
        `closing socket for unknown player (${playerSockets.length} left)`
      );
    }
  });
  socket.on("open", () => {
    console.log("socket opened");
  });
  socket.on("message", (message) => {
    if (typeof message !== "string") {
      console.error(`Unsupported message datatype ${typeof message}`);
      return;
    }
    console.log(`Readystate: ${socket.readyState}`);

    const sourcePlayerUuid = playerSockets.find(
      (entry) => entry.socket === socket
    )?.playerUuid;

    const [rawTopic, rawPayload] = message.split(" ", 2);
    console.log({ rawTopic, rawPayload });
    const result = decode(ClientToServer, {
      topic: rawTopic,
      payload: rawPayload ? JSON.parse(rawPayload) : undefined,
    });

    switch (result.topic) {
      case "LOGIN":
        const playerUuid = result.payload.playerUuid;
        addPlayerSocketSpecial(playerUuid, socket);
        engine.loginPlayer(playerUuid);
        break;
      case "LOGOUT":
        if (!sourcePlayerUuid)
          console.error("Unexpected LOGOUT from a player not found");
        else {
          removePlayerSocketSpecial(sourcePlayerUuid);
          engine.logoutPlayer(sourcePlayerUuid);
        }
        break;
      case "DEV_CLEANUP":
        // this seems to be needed because of react HMR doing weird things with websockets
        playerSockets.forEach((e) => {
          console.log("closing " + e.socket);
          e.socket.close(1012); // 1012 = Service Restart
        });

        console.log("DEV CLEANUP");
        console.log(playerSockets.length);
        break;
      default:
        sourcePlayerUuid
          ? engine.onMessage(result.topic, result.payload, sourcePlayerUuid)
          : console.error("Got message from a socket of a unregistered player");
        break;
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`server started on port ${PORT}!`);
});
server.on("upgrade", (request, socket, head) =>
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  })
);
