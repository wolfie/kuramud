import React from "react";
import logo from "./logo.svg";
import "./App.css";
import useWebsocket, { TopicHandler } from "./useWebsocket";
import { useEffect } from "react";

function App() {
  const ws = useWebsocket("ws://localhost:8000");

  useEffect(() => {
    const helloHandler: TopicHandler = (msg) => console.log(`HELLO: ${msg}`);
    ws.addTopicHandler("HELLO", helloHandler);

    return () => ws.removeTopicHandler("HELLO", helloHandler);
  }, [ws]);

  return (
    <div className="App">
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
          disabled={!ws.connectedFunctions.connected}
          onClick={() => ws.sendIfPossible("hello", "derps")}
        >
          Button
        </button>
      </header>
    </div>
  );
}

export default App;
