import React from "react";
import { Direction } from "kuramud-common";
import joinWithCommaAndAnd from "../lib/joinWithCommaAndAnd";

type RoomProps = {
  description: string;
  exits: Direction[];
};
const Room: React.FC<RoomProps> = ({ description, exits }) => (
  <>
    <h1>Room</h1>
    <section>{description}</section>
    <section>
      Exits: {exits.length > 0 ? joinWithCommaAndAnd(exits) : "None"}
    </section>
  </>
);

export default Room;
