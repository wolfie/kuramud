import React from "react";
import { Direction } from "kuramud-common";
import joinWithCommaAndAnd from "../lib/joinWithCommaAndAnd";
import styled from "styled-components";

const Exits = styled.section`
  margin-top: 1em;
`;

type RoomProps = {
  description: string;
  exits: Direction[];
  items: string[];
};
const Room: React.FC<RoomProps> = ({ description, exits, items }) => (
  <>
    <h1>Room</h1>
    <section>{description}</section>
    {items.length > 0 && (
      <section>There's {joinWithCommaAndAnd(items)} here</section>
    )}
    <Exits>
      Exits: {exits.length > 0 ? joinWithCommaAndAnd(exits) : "None"}
    </Exits>
  </>
);

export default Room;
