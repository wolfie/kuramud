import useWebsocket from "./useWebsocket";

//type Direction = "N" | "S" | "W" | "E";

const useWebsocketApi = () => {
  const ws = useWebsocket("ws://localhost:8000");

  return {
    login: (playerUuid: string) =>
      ws.connected && ws.send("LOGIN", { playerUuid }),
    logout: (playerUuid: string) =>
      ws.connected && ws.send("LOGOUT", { playerUuid }),
  };
};

export default useWebsocketApi;
