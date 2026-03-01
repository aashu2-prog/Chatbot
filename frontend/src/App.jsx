import { useEffect, useRef, useState } from "react";
import "./App.css";
import MessageBubble from "./components/MessageBubble";

const API_URL = "http://localhost:8000/chat";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add a placeholder for the assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const { content } = JSON.parse(data);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + content,
              };
              return updated;
            });
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `⚠️ Error: ${err.message}. Please make sure the backend server is running.`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([]);
    inputRef.current?.focus();
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-icon">🌿</span>
          <div>
            <h1 className="header-title">MedSathy</h1>
            <p className="header-subtitle">औषधि साक्षरता सहायक</p>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat} title="Clear chat">
          🗑 Clear
        </button>
      </header>

      {/* Chat window */}
      <main className="chat-window">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-icon">💊</div>
            <h2>नमस्ते! म MedSathy हुँ।</h2>
            <p>तपाईंको औषधि सम्बन्धी जुनसुकै प्रश्न सोध्नुहोस्।</p>
            <div className="chips">
              {[
                "Paracetamol को dose के हो?",
                "Amoxicillin र milk सँगै लिन हुन्छ?",
                "मेरो बच्चाको weight 20kg छ, Ibuprofen कति दिने?",
                "Metformin कहिले लिने?",
              ].map((q) => (
                <button
                  key={q}
                  className="chip"
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input bar */}
      <form className="input-bar" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="input"
          type="text"
          placeholder="औषधिबारे प्रश्न सोध्नुहोस् …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          className="send-btn"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
