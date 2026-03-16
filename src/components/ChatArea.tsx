import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Send, Bot, User as UserIcon, Loader2, Copy, Check, RotateCcw, Edit3, Download, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any;
}

interface ChatAreaProps {
  conversationId: string | null;
}

const CodeBlock = ({ children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-tertiary)] opacity-0 group-hover/code:opacity-100 transition-all hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] shadow-sm"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <code {...props}>{children}</code>
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({ conversationId }) => {
  const { user } = useAuth();
  const { aiInstruction } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || !user || !conversationId) return;

    if (!overrideInput) setInput('');
    setIsTyping(true);

    try {
      // 1. Save user message
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        role: 'user',
        content: messageToSend,
        timestamp: serverTimestamp()
      });

      // 2. Update conversation timestamp
      await updateDoc(doc(db, 'conversations', conversationId), {
        updatedAt: serverTimestamp()
      });

      // 3. Call Gemini API via proxy
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageToSend }],
          systemInstruction: aiInstruction
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // 4. Save assistant message
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        role: 'assistant',
        content: data.content,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Chat Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 1 || isTyping) return;
    
    // Find last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // Delete last assistant message if it exists
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant') {
      await deleteDoc(doc(db, 'conversations', conversationId!, 'messages', lastMsg.id));
    }

    setIsTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter(m => m.id !== lastMsg.id),
          systemInstruction: aiInstruction
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await addDoc(collection(db, 'conversations', conversationId!, 'messages'), {
        role: 'assistant',
        content: data.content,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Regenerate Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    if (!newContent.trim() || !conversationId) return;
    
    // Update message
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', id), {
      content: newContent,
      timestamp: serverTimestamp()
    });

    // Delete all subsequent messages
    const msgIndex = messages.findIndex(m => m.id === id);
    const subsequentMsgs = messages.slice(msgIndex + 1);
    for (const msg of subsequentMsgs) {
      await deleteDoc(doc(db, 'conversations', conversationId, 'messages', msg.id));
    }

    setEditingMessageId(null);
    handleSend(undefined, newContent);
  };

  const handleDownload = () => {
    if (messages.length === 0) return;
    const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md space-y-4"
        >
          <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--border-color)] shadow-xl">
            <Bot className="w-8 h-8 text-[var(--text-primary)]" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">Void AI 1</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Welcome to the future of intelligence. Start a new conversation or select one from the sidebar to begin.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={handleDownload}
          title="Download Conversation"
          className="p-2 bg-[var(--bg-tertiary)] backdrop-blur-md border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all shadow-lg"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group relative flex gap-4 p-4 rounded-2xl border transition-all duration-200 shadow-xl",
                  msg.role === 'user' 
                    ? "bg-[var(--bg-secondary)] border-[var(--border-color)] ml-12 hover:border-[var(--text-tertiary)]/50" 
                    : "bg-[var(--bg-secondary)] border-[var(--border-color)] mr-12 opacity-90 hover:opacity-100 shadow-inner"
                )}
              >
                <div className="absolute inset-0 bg-[var(--metallic-shine)] opacity-0 group-hover:opacity-50 pointer-events-none transition-opacity rounded-2xl" />
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border-color)] shadow-inner",
                  msg.role === 'user' ? "bg-[var(--bg-tertiary)]" : "bg-[var(--bg-primary)]"
                )}>
                  {msg.role === 'user' ? <UserIcon className="w-5 h-5 text-[var(--text-secondary)]" /> : <Bot className="w-5 h-5 text-[var(--text-primary)]" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        defaultValue={msg.content}
                        onBlur={(e) => handleEditMessage(msg.id, e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-all shadow-inner"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingMessageId(null)} 
                          className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--bg-primary)] prose-pre:border prose-pre:border-[var(--border-color)] prose-pre:rounded-xl prose-pre:shadow-inner",
                      msg.role === 'user' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    )}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code: CodeBlock
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              {msg.role === 'user' && !editingMessageId && (
                <button 
                  onClick={() => setEditingMessageId(msg.id)}
                  className="absolute right-2 top-2 p-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mr-12 shadow-md"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 border border-[var(--border-color)] shadow-inner">
                <Loader2 className="w-5 h-5 text-[var(--text-primary)] animate-spin" />
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce"></div>
              </div>
            </motion.div>
          )}
          
          {!isTyping && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className="flex justify-center">
              <button 
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate Response
              </button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-32 right-8 p-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-full shadow-xl hover:bg-[var(--border-color)] transition-all z-20"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4 md:p-8 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent">
        <form 
          onSubmit={handleSend}
          className="max-w-3xl mx-auto relative group"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Void AI anything..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 pr-14 focus:outline-none focus:border-[var(--text-secondary)] focus:bg-[var(--bg-tertiary)] transition-all resize-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] min-h-[60px] max-h-[200px] shadow-inner group-hover:border-[var(--text-tertiary)]/50"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3 bottom-3 p-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--border-color)] disabled:opacity-50 transition-all shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-[9px] text-[var(--text-tertiary)] mt-4 uppercase tracking-[0.3em] font-bold opacity-50">
          Void AI 1.0 • Intelligence Redefined
        </p>
      </div>
    </div>
  );
};

