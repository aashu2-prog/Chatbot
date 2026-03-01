import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./MessageBubble.css";

// memo prevents re-rendering past bubbles while streaming new ones
const MessageBubble = memo(function MessageBubble({ role, content }) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`bubble-row ${isUser ? "user-row" : "bot-row"}`}>
      <div className={`avatar ${isUser ? "user-avatar" : "bot-avatar"}`}>
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        ) : (
          <img
            src="/Modern Vector Logo with Minimalist Capsule.svg"
            alt="MedSathy"
            className="bot-avatar-img"
          />
        )}
      </div>

      <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
        {isUser ? (
          <p className="user-text">{content}</p>
        ) : content ? (
          <>
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
                code: ({ className, children }) =>
                  className?.startsWith("language-") ? (
                    <pre className="md-pre">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="md-code-inline">{children}</code>
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
            <div className="bubble-actions">
              <button
                className={`copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopy}
                title="Copy response"
              >
                {copied ? (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </>
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
});

export default MessageBubble;
