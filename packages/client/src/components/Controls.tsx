import React from "react";
import { useEffect } from "react";
import { Direction } from "kuramud-common";
import { useContext } from "react";
import { SharedWebsocketContext } from "../Game";
import { useCallback } from "react";

const onEnterPress =
  (fn: () => void): React.KeyboardEventHandler =>
  (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fn();
  };

type ControlsProps = {
  enabledDirections: Direction[];
  walkIsDisabled: boolean;
};
const Controls: React.FC<ControlsProps> = ({
  enabledDirections,
  walkIsDisabled,
}) => {
  const [lookAt, setLookAt] = React.useState("");
  const [pushOn, setPushOn] = React.useState("");
  const [ignoreGlobalKeys, setIgnoreGlobalKeys] = React.useState(false);

  const lookAtRef = React.useRef<HTMLInputElement>(null);
  const pushOnRef = React.useRef<HTMLInputElement>(null);

  const api = useContext(SharedWebsocketContext);

  const walk = useCallback(
    (direction: Direction) => api.send("WALK", { direction }),
    [api]
  );

  useEffect(() => {
    if (ignoreGlobalKeys) return;

    const globalKeyListener = (e: KeyboardEvent) => {
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
        case "l":
          return lookAtRef.current?.focus();
        case "p":
          return pushOnRef.current?.focus();
      }
    };

    document.addEventListener("keypress", globalKeyListener);
    return () => {
      document.removeEventListener("keypress", globalKeyListener);
    };
  }, [ignoreGlobalKeys, walk]);

  return (
    <>
      <div>
        <button
          onClick={() => walk("N")}
          disabled={walkIsDisabled || !enabledDirections.includes("N")}
        >
          N
        </button>
        <button
          onClick={() => walk("S")}
          disabled={walkIsDisabled || !enabledDirections.includes("S")}
        >
          S
        </button>
        <button
          onClick={() => walk("W")}
          disabled={walkIsDisabled || !enabledDirections.includes("W")}
        >
          W
        </button>
        <button
          onClick={() => walk("E")}
          disabled={walkIsDisabled || !enabledDirections.includes("E")}
        >
          E
        </button>
      </div>
      <div>
        Look at{" "}
        <input
          ref={lookAtRef}
          onFocus={() => setIgnoreGlobalKeys(true)}
          onBlur={() => setIgnoreGlobalKeys(false)}
          value={lookAt}
          onChange={(e) => setLookAt(e.target.value)}
          onKeyPress={onEnterPress(() => {
            setLookAt("");
            api.send("LOOK_ITEM", { lookKeyword: lookAt });
          })}
        />
      </div>
      <div>
        Push on{" "}
        <input
          ref={pushOnRef}
          onFocus={() => setIgnoreGlobalKeys(true)}
          onBlur={() => setIgnoreGlobalKeys(false)}
          value={pushOn}
          onChange={(e) => setPushOn(e.target.value)}
          onKeyPress={onEnterPress(() => {
            setPushOn("");
            api.send("PUSH_ITEM", { pushKeyword: pushOn });
          })}
        />
      </div>
    </>
  );
};

export default Controls;
