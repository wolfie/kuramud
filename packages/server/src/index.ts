import express from "express";
import ws from "ws";
import { ClientToServer, createLogger, decode } from "kuramud-common";
import Engine from "./engine/engine";
import { UUID } from "io-ts-types";
import WebSocket from "ws";
import login from "./routes/login";
import LoginSecretBridge from "./LoginSecretBridge";
import cors from "cors";
import { json } from "body-parser";

const PORT = 8000;

const loginSecretBridge = new LoginSecretBridge();

const logger = createLogger("server-index");

const app = express();
app.use(cors());
app.use(json());

let playerSockets: { playerUuid: UUID; socket: ws }[] = [];

const addPlayerSocketSpecial = (playerUuid: UUID, socket: ws) => {
  const alreadyHasASocket = playerSockets.some(
    (entry) => entry.playerUuid === playerUuid
  );
  if (alreadyHasASocket) {
    logger.error(`Player ${playerUuid} already has a socket`);
  } else {
    playerSockets.push({ playerUuid, socket });
    logger.log(`added socket for ${playerUuid} (now ${playerSockets.length})`);
  }
};

const removePlayerSocketSpecial = (playerUuid: string) => {
  const playerSocketExists = playerSockets.some(
    (entry) => entry.playerUuid === playerUuid
  );
  if (!playerSocketExists) {
    logger.error(`Player ${playerUuid} does not have an existing socket`);
  } else {
    playerSockets = playerSockets.filter(
      (entry) => entry.playerUuid !== playerUuid
    );
    logger.log(`removed socket for ${playerUuid}`);
  }
};

const engine = new Engine({
  eventSender: (topic, playerUuids, payload: any) =>
    playerSockets
      .filter(({ playerUuid }) => playerUuids.includes(playerUuid))
      .forEach(({ socket, playerUuid }) => {
        logger.log(`[send ${topic} to ${playerUuid}]`);
        if (socket.readyState !== WebSocket.OPEN) {
          logger.warn("socket is not open");
          return;
        }
        socket.send(
          `${topic} ${JSON.stringify(payload)}`,
          (e) => e && logger.error(e)
        );
      }),
});

const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", (socket) => {
  logger.log("CONNECTION");
  socket.on("close", () => {
    const found = playerSockets.find((entry) => entry.socket === socket);
    if (found) {
      logger.log(`closing socket for player ${found.playerUuid}`);
      playerSockets = playerSockets.filter(
        (entry) => entry.playerUuid !== found.playerUuid
      );

      engine.logoutPlayer(found.playerUuid);
    } else {
      logger.info(
        `closing socket for unknown player (${playerSockets.length} left)`
      );
    }
  });
  socket.on("open", () => {
    logger.log("socket opened");
  });
  socket.on("message", (message) => {
    if (typeof message !== "string") {
      logger.error(`Unsupported message datatype ${typeof message}`);
      return;
    }
    logger.log(`Readystate: ${socket.readyState}`);

    const sourcePlayerUuid = playerSockets.find(
      (entry) => entry.socket === socket
    )?.playerUuid;

    const [rawTopic, rawPayload] = message.split(" ", 2);
    logger.log({ rawTopic, rawPayload });
    const result = decode(ClientToServer, {
      topic: rawTopic,
      payload: rawPayload ? JSON.parse(rawPayload) : undefined,
    });

    switch (result.topic) {
      case "LOGIN":
        const { playerUuid, oneTimeCode } = result.payload;
        const oneTimeCodePlayerUuid = loginSecretBridge.consume(oneTimeCode);

        if (!oneTimeCodePlayerUuid) {
          logger.error(
            `No one-time code matches for ${oneTimeCode} (for supposed player ${playerUuid})`
          );
          return;
        } else if (playerUuid !== oneTimeCodePlayerUuid) {
          logger.error(
            `player UUID mismatch (${playerUuid} !== ${oneTimeCodePlayerUuid})`
          );
          return;
        }

        addPlayerSocketSpecial(playerUuid, socket);
        engine.loginPlayer(playerUuid);
        break;
      case "LOGOUT":
        if (!sourcePlayerUuid)
          logger.error("Unexpected LOGOUT from a player not found");
        else {
          removePlayerSocketSpecial(sourcePlayerUuid);
          engine.logoutPlayer(sourcePlayerUuid);
        }
        break;
      case "DEV_CLEANUP":
        // this seems to be needed because of react HMR doing weird things with websockets
        playerSockets.forEach((e) => {
          logger.log("closing " + e.socket);
          e.socket.close(1012); // 1012 = Service Restart
        });

        logger.log("DEV CLEANUP");
        logger.log(playerSockets.length);
        break;
      default:
        sourcePlayerUuid
          ? engine.onMessage(result.topic, result.payload, sourcePlayerUuid)
          : logger.error("Got message from a socket of a unregistered player");
        break;
    }
  });
});

app.use(
  "/",
  login({
    onPlayerLogin: (playerUuid, oneUseToken) =>
      loginSecretBridge.put(playerUuid, oneUseToken),
  })
);

const server = app.listen(PORT, () => {
  logger.log(`server started on port ${PORT}!`);
});
server.on("upgrade", (request, socket, head) =>
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  })
);
