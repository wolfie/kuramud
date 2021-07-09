import useWebsocket from "./useWebsocket";

//type Direction = "N" | "S" | "W" | "E";

const useWebsocketApi = () => {
  const ws = useWebsocket();

  return {
    login: (playerUuid: string) =>
      ws.connected && ws.send("LOGIN", { playerUuid: playerUuid as any }),
    logout: () => ws.connected && ws.send("LOGOUT", undefined),
    look: () => ws.connected && ws.send("LOOK", undefined),
  };
};

export default useWebsocketApi;
