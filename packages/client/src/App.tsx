import React from "react";
import Login from "./Login";
import Game from "./Game";

const App: React.FC = () => {
  const [playerUuid, setPlayerUuid] = React.useState<string>();

  return !playerUuid ? (
    <Login onLogin={setPlayerUuid} />
  ) : (
    <Game playerUuid={playerUuid} />
  );
};

export default App;
