import * as React from "react";
import { useContext } from "react";
import styled from "styled-components";
import { SharedWebsocketContext } from "./Game";

const Container = styled.div`
  background-color: red;
  color: white;
`;

const DevControls: React.FC = () => {
  const api = useContext(SharedWebsocketContext);

  return (
    <Container>
      <button
        disabled={!api.connected}
        onClick={() => api.send("DEV_CLEANUP", undefined)}
      >
        Clear
      </button>
    </Container>
  );
};

export default DevControls;
