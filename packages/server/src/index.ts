import express from "express";
import ws from "ws";

const app = express();

const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", (socket) => {
  socket.on("message", (message) => {
    console.log(message);
    socket.send(message);
  });
});

app.get("/", (req, res) => {
  console.log("DERP /");
  res.send("ok");
});

const server = app.listen(8000, () => {
  console.log("server started!");
});
server.on("upgrade", (request, socket, head) =>
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  })
);
