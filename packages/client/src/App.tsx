import React from "react";
import Login from "./Login";
import Game from "./Game";

const App: React.FC = () => {
  const [playerUuid, setPlayerUuid] = React.useState<string>();
  const [oneTimeCode, setOneTimeCode] = React.useState<string>();

  const onLogin = (playerUuid: string, oneTimeCode: string) => {
    setPlayerUuid(playerUuid);
    setOneTimeCode(oneTimeCode);
  };

  return !playerUuid || !oneTimeCode ? (
    <Login onLogin={onLogin} />
  ) : (
    <Game playerUuid={playerUuid} oneTimeCode={oneTimeCode} />
  );
};

export default App;
