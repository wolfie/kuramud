import React from "react";
import styled from "styled-components";

const Root = styled.div`
  height: 100%;
  display: flex;
  justify-content: space-between;

  background-color: black;
  color: gray;
`;

const RoomSlot = styled.div``;

const ControlsSlot = styled.div`
  background-color: #333;
  min-width: 300px;
`;

type MainProps = {
  room: JSX.Element;
  controls: JSX.Element;
};
const Main: React.FC<MainProps> = ({ room, controls }) => (
  <Root>
    <RoomSlot>{room}</RoomSlot>
    <ControlsSlot>{controls}</ControlsSlot>
  </Root>
);

export default Main;
