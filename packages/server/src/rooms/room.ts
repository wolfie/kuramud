import { UUID } from "io-ts-types";
import { ValidRoomId } from "./StartWorld";

export type Direction = "N" | "S" | "W" | "E";

export type Exit = {
  direction: Direction;
  roomUuid: ValidRoomId;
};

export type GetPlayersInRoom = (roomId: ValidRoomId) => string[];

export type OnPushResult = {
  eventMessage: string;
  affectedPlayers: string[];
};

export type Item = {
  name: string;
  description: string;
  tags: string[];
  hidden?: boolean;
  onPush?: (props: {
    playerUuid: UUID;
    currentRoom: ValidRoomId;
    getPlayersInRoom: GetPlayersInRoom;
  }) => OnPushResult | OnPushResult[];
};

export type Room = {
  description: string;
  exits: readonly Exit[];
  items?: Readonly<Record<string, Item>>;
};

interface SetState<T> {
  (state: T): void;
  (callback: (oldState: T) => T): void;
}
export interface UseState {
  <T = undefined>(stateId?: symbol): [T | undefined, SetState<T | undefined>];
  <T>(initialValue: T, stateId?: symbol): [T, SetState<T>];
}

export type RoomFn = (utils: { useState: UseState }) => Room;
