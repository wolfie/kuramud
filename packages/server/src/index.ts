import express from "express";
import ws from "ws";
import { TopicDecoderMap } from "kuramud-common";
import Engine, { EventSender } from "./engine/engine";

const app = express();

let playerSockets: { playerUuid: string; socket: ws }[] = [];

const addPlayerSocketSpecial = (payload: string, socket: ws) => {
  const { playerUuid } = TopicDecoderMap["LOGIN"](payload);
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

const removePlayerSocketSpecial = (payload: string) => {
  const { playerUuid } = TopicDecoderMap["LOGOUT"](payload);
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

const eventSender: EventSender = (topic, playerUuids, data) => {
  playerSockets
    .filter(({ playerUuid }) => playerUuids.includes(playerUuid))
    .forEach(({ socket }) => {
      console.log(`[send ${topic}]`);
      socket.send(
        `${topic} ${JSON.stringify(data)}`,
        (e) => e && console.error(e)
      );
    });
};

const engine = new Engine({ eventSender });

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

    if (message.startsWith("LOGIN ")) {
      addPlayerSocketSpecial(message.substr("LOGIN ".length), socket);
    } else if (message.startsWith("LOGOUT ")) {
      removePlayerSocketSpecial(message.substr("LOGOUT ".length));
    }

    engine.onMessage(message);
  });
});

const server = app.listen(8000, () => {
  console.log("server started!");
});
server.on("upgrade", (request, socket, head) =>
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  })
);
