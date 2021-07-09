import express from "express";
import ws from "ws";
import { ClientToServer, decode } from "kuramud-common";
import Engine from "./engine/engine";
import { UUID } from "io-ts-types";

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
    playerSockets = [...playerSockets, { playerUuid, socket }];
    console.log(`added socket for ${playerUuid}`);
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
        socket.send(
          `${topic} ${JSON.stringify(payload)}`,
          (e) => e && console.error(e)
        );
      }),
});

const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", (socket) => {
  socket.on("close", () => {
    const found = playerSockets.find((entry) => entry.socket === socket);
    if (found) {
      console.log(`closing socket for player ${found.playerUuid}`);
      playerSockets = playerSockets.filter(
        (entry) => entry.playerUuid !== found.playerUuid
      );

      engine.logoutPlayer(found.playerUuid);
    } else {
      console.info("closing socket for unknown player");
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

    const sourcePlayerUuid = playerSockets.find(
      (entry) => entry.socket === socket
    )?.playerUuid;

    const [rawTopic, rawPayload] = message.split(" ", 2);
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
