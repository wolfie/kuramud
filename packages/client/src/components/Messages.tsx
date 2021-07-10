import React from "react";

export type Message = { text: string; timestamp: number };

type MessagesProps = { messages: Message[] };
const Messages: React.FC<MessagesProps> = ({ messages }) => (
  <ul>
    {messages.map(({ text, timestamp }) => (
      <li key={timestamp}>{text}</li>
    ))}
  </ul>
);

export default Messages;
