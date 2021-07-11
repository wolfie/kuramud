import React from "react";
import axios from "axios";

const BACKEND_REST_URI = "http://localhost:8000";

type LoginProps = {
  onLogin: (uuid: string, oneTimeCode: string) => void;
};
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = React.useState(false);
  const [unauthorized, setUnauthorized] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();

    setUnauthorized(false);
    setLoading(true);
    axios
      .post(`${BACKEND_REST_URI}/login`, { username, password })
      .then((response) => {
        const { playerUuid, oneUseToken } = response.data;
        if (typeof playerUuid === "string" && typeof oneUseToken === "string")
          onLogin(playerUuid, oneUseToken);
        else
          console.error(
            "Unexpected payload received from server",
            response.data
          );
      })
      .catch((e) => {
        if (axios.isAxiosError(e)) {
          if (e.response?.status === 401) setUnauthorized(true);
          else console.error({ e });
        } else {
          console.error("Unhandled error");
          console.error({ e });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        <input
          disabled={loading}
          onChange={(e) => setUsername(e.target.value)}
          value={username}
        />
        <input
          disabled={loading}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
        <button type="submit">Login</button>
      </form>
      {loading && <div>Loading!</div>}
      {unauthorized && <div>Unauthorized!</div>}
    </>
  );
};

export default Login;
