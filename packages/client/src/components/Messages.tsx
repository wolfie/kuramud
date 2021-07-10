import React from "react";

type MessagesProps = { messages: string[] };
const Messages: React.FC<MessagesProps> = ({ messages }) => (
  <ul>
    {messages.map((msg) => (
      <li key={Math.random()}>{msg}</li>
    ))}
  </ul>
);

export default Messages;
