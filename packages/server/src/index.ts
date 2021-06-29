import express from "express";
import ws from "ws";
import Engine, { EventSender, isTopic } from "./engine/engine";

const app = express();

let playerSockets: { playerUuid: string; socket: ws }[] = [];

const eventSender: EventSender = (topic, playerUuids, data) =>
  playerSockets
    .filter(({ playerUuid }) => playerUuids.includes(playerUuid))
    .forEach(({ socket }) => {
      console.log(`[send ${topic}]`);
      socket.send(
        `${topic} ${JSON.stringify(data)}`,
        (e) => e && console.error(e)
      );
    });

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

    const [topic, dataString] = message.split(" ", 2);
    if (!isTopic(topic)) {
      console.error(`Unsupported topic: ${topic}`);
      return;
    }

    console.log(`[receive ${topic}]`);
    if (topic === "LOGIN" || topic === "LOGOUT") {
      const data = JSON.parse(dataString);
      const playerUuid = data.playerUuid;
      playerSockets =
        topic === "LOGIN"
          ? [...playerSockets, { playerUuid, socket }]
          : playerSockets.filter((entry) => entry.playerUuid !== playerUuid);
    }
    engine.handleMessage(topic, dataString);
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
