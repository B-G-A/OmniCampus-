import React, { useEffect, useRef, useState } from "react";
import api from "../utils/api";

const QUICK_PROMPTS = [
  "What is an algorithm?",
  "Explain data structures",
  "Tell me about linear algebra",
  "How do I prepare for exams?",
];

function Typewriter({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayed(prev => prev + text.charAt(index));
        setIndex(prev => prev + 1);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [index, text]);

  // Small autoscroll while typing
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [displayed]);

  return <span ref={endRef}>{displayed}</span>;
}

function ChatbotPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionId, setSessionId] = useState("");
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const endRef = useRef(null);

  const scrollToBottom = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch student subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get("/student/subjects");
        if (res && res.success) {
          setSubjects(res.data);
          if (res.data.length > 0) {
            setSelectedSubject(res.data[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    };
    fetchSubjects();
  }, []);

  // Load session or create a new one when subject changes
  useEffect(() => {
    if (!selectedSubject) return;
    
    const loadOrCreateSession = async () => {
      try {
        const historyRes = await api.get(`/chat/history?subjectId=${selectedSubject}`);
        if (historyRes && historyRes.success && historyRes.data.length > 0) {
          const latestSessionId = historyRes.data[0].sessionId;
          setSessionId(latestSessionId);
          
          const sessionRes = await api.get(`/chat/session/${latestSessionId}`);
          if (sessionRes && sessionRes.success && sessionRes.data.messages) {
            const loadedMessages = [];
            sessionRes.data.messages.forEach(m => {
              if (m.message) {
                loadedMessages.push({ sender: 'user', text: m.message, isNew: false });
              }
              if (m.response) {
                loadedMessages.push({ sender: 'bot', text: m.response, sources: m.sources, isNew: false });
              }
            });
            
            if (loadedMessages.length === 0) {
               setMessages([{ sender: "bot", text: `Hello! I'm your AI assistant for the selected subject. Ask me questions about the uploaded course materials.`, isNew: false }]);
            } else {
               setMessages(loadedMessages);
            }
            return;
          }
        }
        
        const res = await api.post("/chat/session", { subjectId: selectedSubject });
        if (res && res.success) {
          setSessionId(res.data.sessionId);
          setMessages([
            {
              sender: "bot",
              text: `Hello! I'm your AI assistant for the selected subject. Ask me questions about the uploaded course materials.`,
              isNew: false
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load or create session:", err);
      }
    };
    loadOrCreateSession();
  }, [selectedSubject]);

  const sendMessage = async (text) => {
    if (!text.trim() || !sessionId || !selectedSubject) return;

    const userMessage = { sender: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/chat/query", {
        message: text,
        subjectId: selectedSubject,
        sessionId: sessionId,
        allowExternal: true
      });
      
      if (res && res.success) {
        setMessages((prev) => [
          ...prev, 
          { 
            sender: "bot", 
            text: res.data.answer || res.data.response,
            sources: res.data.sources,
            confidence: res.data.confidence_score,
            pageNumber: res.data.page_number,
            relatedTopics: res.data.related_topics,
            isNew: true // trigger typewriter effect
          }
        ]);
      } else {
        setMessages((prev) => [...prev, { sender: "bot", text: "Sorry, I could not generate an answer right now.", isNew: true }]);
      }
    } catch (err) {
      console.error("Query failed:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "Error: AI service is currently unavailable.", isNew: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-title" style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="chat-title-avatar">🤖</span>
            <div>
              <h1>OmniCampus AI Chat</h1>
            </div>
          </div>
          <div>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="" disabled>Select a Subject</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="chat-main">
        <section className="chat-topbar">
          <div className="chat-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="prompt-pill"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="chat-window" aria-live="polite">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <article
                key={`${msg.sender}-${index}`}
                className={`chat-message ${msg.sender}`}
                aria-label={`${msg.sender} message`}
              >
                <div className="message-avatar">{msg.sender === "bot" ? "🤖" : "🧑"}</div>
                <div className="message-bubble" style={{ width: "100%", maxWidth: "800px" }}>
                  <p style={{ margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>
                    {msg.sender === "bot" && msg.isNew ? <Typewriter text={msg.text} /> : msg.text}
                  </p>
                  
                  {msg.sender === "bot" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "12px", fontSize: "12px", color: "#475569" }}>
                      {msg.sources && msg.sources.length > 0 && (
                        <div>
                          <strong>Sources:</strong> {msg.sources.join(", ")}
                          {msg.pageNumber && <span> (Page {msg.pageNumber})</span>}
                        </div>
                      )}
                      
                      {msg.confidence !== undefined && msg.confidence !== null && (
                        <div>
                          <strong>Confidence:</strong> <span style={{ color: msg.confidence >= 70 ? "#16a34a" : msg.confidence >= 40 ? "#d97706" : "#dc2626" }}>{msg.confidence}%</span>
                        </div>
                      )}
                      
                      {msg.relatedTopics && msg.relatedTopics.length > 0 && (
                        <div style={{ marginTop: "4px" }}>
                          <strong style={{ display: "block", marginBottom: "4px" }}>Related Topics:</strong>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {msg.relatedTopics.map(topic => (
                              <button 
                                key={topic} 
                                onClick={() => sendMessage(topic)}
                                style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "12px", cursor: "pointer", fontSize: "11px", color: "#0369a1", transition: "all 0.2s" }}
                                onMouseOver={(e) => { e.target.style.background = "#e0f2fe"; e.target.style.borderColor = "#bae6fd"; }}
                                onMouseOut={(e) => { e.target.style.background = "#f1f5f9"; e.target.style.borderColor = "#cbd5e1"; }}
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
            {loading && (
              <article className="chat-message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble">
                  <p>Thinking...</p>
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>
        </section>
      </main>

      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your course materials..."
          rows={1}
          aria-label="Type your message"
          disabled={loading || !sessionId}
        />
        <button type="submit" className="send-btn" disabled={loading || !sessionId}>
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

export default ChatbotPage;