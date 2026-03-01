import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./MessageBubble.css";

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`bubble-row ${isUser ? "user-row" : "bot-row"}`}>
      <div className={`avatar ${isUser ? "user-avatar" : "bot-avatar"}`}>
        {isUser ? "🧑" : "🌿"}
      </div>
      <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
        {isUser ? (
          <p className="user-text">{content}</p>
        ) : content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="md-p">{children}</p>,
              strong: ({ children }) => (
                <strong className="md-strong">{children}</strong>
              ),
              ul: ({ children }) => <ul className="md-ul">{children}</ul>,
              ol: ({ children }) => <ol className="md-ol">{children}</ol>,
              li: ({ children }) => <li className="md-li">{children}</li>,
              code: ({ inline, children }) =>
                inline ? (
                  <code className="md-code-inline">{children}</code>
                ) : (
                  <pre className="md-pre">
                    <code>{children}</code>
                  </pre>
                ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md-link"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
    </div>
  );
}
