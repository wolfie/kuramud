import React from "react";
import logo from "./logo.svg";
import "./App.css";
import useWebsocket from "./useWebsocket";
import { useEffect } from "react";

const HELLO = Symbol("HELLO");

function App() {
  const [state, setState] = React.useState(0);

  const ws = useWebsocket("ws://localhost:8000");

  const helloHandler = React.useCallback(
    (msg) => console.log(`HELLO: ${msg}`),
    []
  );
  ws.addTopicHandler(HELLO, helloHandler);

  useEffect(() => {
    return () => console.log("aa");
  }, [state]);

  return (
    <div className="App" key={state}>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button
          disabled={!ws.connected}
          onClick={() => {
            setState((a) => a + 1);
            ws.connected && ws.send("hello", "derps");
          }}
        >
          Button
        </button>
      </header>
    </div>
  );
}

export default App;
