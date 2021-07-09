import * as React from "react";
import styled from "styled-components";
import useWebsocket from "./useWebsocket";

const Container = styled.div`
  background-color: red;
  color: white;
`;

const DevControls: React.FC = () => {
  const ws = useWebsocket();

  return (
    <Container>
      <button
        onClick={() =>
          ws.connected
            ? ws.send("DEV_CLEANUP", undefined)
            : console.error("Not connected")
        }
      >
        Clear
      </button>
    </Container>
  );
};

export default DevControls;
