import React from "react";

type MessagesProps = { messages: string[] };
const Messages: React.FC<MessagesProps> = ({ messages }) => (
  <ul>
    {messages.map((msg) => (
      <li key={msg}>{msg}</li>
    ))}
  </ul>
);

export default Messages;
