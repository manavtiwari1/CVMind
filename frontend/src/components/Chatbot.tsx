import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, Send, Sparkles, X } from 'lucide-react';
import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import './Chatbot.css';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface ChatbotProps {
  customApiKey: string;
}

const starterPrompts = [
  'How do I analyze my resume?',
  'How can I improve my ATS score?',
  'Is my data private and secure?',
  'What will my report include?'
];

export default function Chatbot({ customApiKey }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am the CV Mind assistant. Ask me anything about resume analysis, ATS scores, keyword optimization, formatting, or your report.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: cleanText }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: cleanText,
          history: nextMessages.slice(-8)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Assistant unavailable.');
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.data.reply }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error instanceof Error
            ? error.message
            : 'The assistant is currently unavailable. Please try again in a moment.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={`chatbot ${isOpen ? 'is-open' : ''}`}>
      {isOpen && (
        <section className="chatbot-panel" aria-label="CV Mind chat assistant">
          <header className="chatbot-header">
            <div className="chatbot-title">
              <div className="chatbot-avatar">
                <img src={cvmindLogo} alt="" className="chatbot-logo-img" />
              </div>
              <div>
                <span>CV Mind</span>
                <small>Online resume assistant</small>
              </div>
            </div>
            <button className="chatbot-icon-btn" onClick={() => setIsOpen(false)} title="Close chat">
              <ChevronDown size={18} />
            </button>
          </header>

          <div className="chatbot-messages" ref={messagesRef}>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                {message.role === 'assistant' && <Bot size={15} />}
                <p>{message.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <Bot size={15} />
                <p className="typing-text"><Loader2 size={14} /> Thinking...</p>
              </div>
            )}
          </div>

          <div className="chatbot-prompts">
            {starterPrompts.map((prompt) => (
              <button key={prompt} onClick={() => sendMessage(prompt)} disabled={isLoading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about resume analysis..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} title="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button className="chatbot-launcher" onClick={() => setIsOpen((value) => !value)}>
        {!isOpen && <span className="chatbot-pulse-dot"></span>}
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
        <span>{isOpen ? 'Close' : 'Ask CV Mind'}</span>
      </button>
    </div>
  );
}
