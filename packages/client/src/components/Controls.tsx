import React from "react";
import { useEffect } from "react";
import { Direction } from "kuramud-common";

type ControlsProps = {
  enabledDirections: Direction[];
};
const Controls: React.FC<ControlsProps> = ({ enabledDirections }) => {
  const walk = (str: string) => {
    console.log(`TODO WALK ${str}`);
  };

  useEffect(() => {
    const walkKeyListener = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.shiftKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "w":
          return walk("N");
        case "s":
          return walk("S");
        case "a":
          return walk("W");
        case "d":
          return walk("E");
      }
    };

    document.addEventListener("keypress", walkKeyListener);
    return () => {
      document.removeEventListener("keypress", walkKeyListener);
    };
  });

  return (
    <div>
      <button
        onClick={() => walk("N")}
        disabled={!enabledDirections.includes("N")}
      >
        N
      </button>
      <button
        onClick={() => walk("S")}
        disabled={!enabledDirections.includes("S")}
      >
        S
      </button>
      <button
        onClick={() => walk("W")}
        disabled={!enabledDirections.includes("W")}
      >
        W
      </button>
      <button
        onClick={() => walk("E")}
        disabled={!enabledDirections.includes("E")}
      >
        E
      </button>
    </div>
  );
};

export default Controls;
