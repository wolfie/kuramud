import React from "react";
import { v4 as uuid } from "uuid";

type LoginProps = {
  onLogin: (uuid: string) => void;
};
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [playerUuid, setPlayerUuid] = React.useState(uuid());

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    onLogin(playerUuid);
  };
  return (
    <form onSubmit={onSubmit}>
      <input
        onChange={(e) => setPlayerUuid(e.target.value)}
        value={playerUuid}
      />
    </form>
  );
};

export default Login;
