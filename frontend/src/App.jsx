import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import MessageBubble from "./components/MessageBubble";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/chat";
const HEALTH_URL = API_URL.replace("/chat", "/health");

// Static — never re-created on re-render
const QUICK_CHIPS = [
  "Paracetamol को dose के हो?",
  "Amoxicillin र milk सँगै लिन हुन्छ?",
  "मेरो बच्चाको weight 20kg छ, Ibuprofen कति दिने?",
  "Metformin कहिले लिने?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Warm up backend on load
  useEffect(() => {
    fetch(HEALTH_URL).catch(() => {});
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const sendMessage = useCallback(
    async (e) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || loading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg = { role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages([...newMessages, { role: "assistant", content: "" }]);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
          signal: controller.signal,
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
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const { content } = JSON.parse(data);
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + content,
                };
                return updated;
              });
            } catch {
              /* ignore parse errors */
            }
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
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
    },
    [input, loading, messages],
  );

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    inputRef.current?.focus();
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
    inputRef.current?.focus();
  }, []);

  // Enter sends, Shift+Enter adds newline
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e);
      }
    },
    [sendMessage],
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <img
            src="/Modern Vector Logo with Minimalist Capsule.svg"
            alt="MedSathy Logo"
            className="header-logo"
          />
          <div>
            <h1 className="header-title">MedSathy</h1>
            <p className="header-subtitle">औषधि साक्षरता सहायक</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={clearChat} title="New chat">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        )}
      </header>

      {/* Chat window */}
      <main className="chat-window">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-glow">
              <img
                src="/Modern Vector Logo with Minimalist Capsule.svg"
                alt="MedSathy"
                className="welcome-logo"
              />
            </div>
            <h2 className="welcome-title">नमस्ते! म MedSathy हुँ।</h2>
            <p className="welcome-sub">
              तपाईंको औषधि सम्बन्धी जुनसुकै प्रश्न सोध्नुहोस्।
            </p>
            <div className="chips">
              {QUICK_CHIPS.map((q) => (
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

      {/* Input area */}
      <div className="input-area">
        {loading && (
          <div className="stop-wrap">
            <button className="stop-btn" onClick={stopGenerating}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
              Stop generating
            </button>
          </div>
        )}
        <form className="input-box" onSubmit={sendMessage}>
          <textarea
            ref={inputRef}
            className="input-textarea"
            placeholder="औषधिबारे प्रश्न सोध्नुहोस् …"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            autoFocus
          />
          <button
            className="send-btn"
            type="submit"
            disabled={loading || !input.trim()}
            title="Send (Enter)"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
        <p className="input-hint">
          MedSathy can make mistakes. Always confirm medicines with a pharmacist
          or doctor.
        </p>
      </div>
    </div>
  );
}
