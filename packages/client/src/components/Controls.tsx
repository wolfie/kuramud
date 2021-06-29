import React from "react";
import { useEffect } from "react";

const Controls: React.FC = () => {
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
      <button onClick={() => walk("N")}>N</button>
      <button onClick={() => walk("S")}>S</button>
      <button onClick={() => walk("W")}>W</button>
      <button onClick={() => walk("E")}>E</button>
    </div>
  );
};

export default Controls;
