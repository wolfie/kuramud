import React from "react";

type ApiConnectionGuardProps = { isConnected: boolean };
const ApiConnectionGuard: React.FC<ApiConnectionGuardProps> = ({
  isConnected,
  children,
}) => (isConnected ? <>{children}</> : <h1>API got disconnected</h1>);

export default ApiConnectionGuard;
