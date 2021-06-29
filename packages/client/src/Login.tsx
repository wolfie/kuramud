import React from "react";

type LoginProps = {
  onLogin: (uuid: string) => void;
};
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [uuid, setUuid] = React.useState(Math.random().toString());

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    onLogin(uuid);
  };
  return (
    <form onSubmit={onSubmit}>
      <input onChange={(e) => setUuid(e.target.value)} value={uuid} />
    </form>
  );
};

export default Login;
