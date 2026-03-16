import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleNewChat = async () => {
    if (!user) return;
    
    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        userId: user.uid,
        title: 'New Conversation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActiveConversationId(docRef.id);
      // On mobile, close sidebar after creating new chat
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.div
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 288 : 0,
          x: isSidebarOpen ? 0 : -288
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed md:relative z-50 h-full"
      >
        <Sidebar 
          activeId={activeConversationId} 
          onSelect={(id) => {
            setActiveConversationId(id);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }} 
          onNewChat={handleNewChat}
          onClose={() => setIsSidebarOpen(false)}
        />
      </motion.div>

      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header with Toggle */}
        <header className="h-14 border-b border-[var(--border-color)] flex items-center px-4 gap-4 bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className="text-xs font-bold tracking-[0.2em] text-[var(--text-tertiary)] uppercase">
              Void AI <span className="text-[var(--text-secondary)]">v1.0</span>
            </h1>
          </div>
        </header>

        <ChatArea conversationId={activeConversationId} />
      </main>
    </div>
  );
};
