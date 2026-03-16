import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  LogOut, 
  Settings, 
  MoreVertical,
  Check,
  X,
  Edit2,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SettingsModal } from './SettingsModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: any;
}

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeId, onSelect, onNewChat, onClose }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      await deleteDoc(doc(db, 'conversations', id));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const handleClearAll = async () => {
    if (isClearingAll) {
      const promises = conversations.map(c => deleteDoc(doc(db, 'conversations', c.id)));
      await Promise.all(promises);
      setIsClearingAll(false);
    } else {
      setIsClearingAll(true);
    }
  };

  const startRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateDoc(doc(db, 'conversations', id), {
      title: editTitle
    });
    setEditingId(null);
  };

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-72 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col h-full shadow-[10px_0_30px_rgba(0,0,0,0.3)] relative z-50">
      {/* Header */}
      <div className="p-4 space-y-4 bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between md:hidden">
          <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Menu</span>
          <button onClick={onClose} className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-lg text-[var(--text-secondary)] transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[var(--border-color)] transition-all shadow-lg shadow-black/20 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          New Chat
        </button>

        {/* Search Bar */}
        <div className="relative group">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-secondary)] focus:bg-[var(--bg-tertiary)] transition-all shadow-inner group-hover:border-[var(--text-tertiary)]/50"
          />
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[var(--text-primary)] transition-colors" />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
            {searchQuery ? 'Search Results' : 'Recent History'}
          </div>
          {conversations.length > 0 && !searchQuery && (
            <button 
              onClick={handleClearAll}
              onMouseLeave={() => setIsClearingAll(false)}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-all px-2 py-1 rounded border border-transparent",
                isClearingAll 
                  ? "bg-red-500/10 text-red-400 border-red-400/20" 
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-color)]"
              )}
            >
              {isClearingAll ? 'Confirm Clear All?' : 'Clear All'}
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {filteredConversations.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border",
                activeId === conv.id 
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-color)] shadow-md" 
                  : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-tertiary)]/50 hover:border-[var(--border-color)]/50 hover:text-[var(--text-primary)]"
              )}
            >
              <div className="absolute inset-0 bg-[var(--metallic-shine)] opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity rounded-xl" />
              <MessageSquare className={cn(
                "w-4 h-4 shrink-0",
                activeId === conv.id ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
              )} />
              
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRename(conv.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(conv.id)}
                  className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm text-[var(--text-primary)]"
                />
              ) : (
                <span className={cn(
                  "flex-1 truncate text-sm transition-colors",
                  activeId === conv.id ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                )}>
                  {conv.title}
                </span>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {deleteConfirmId === conv.id ? (
                  <>
                    <button 
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                      title="Confirm Delete"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(null);
                      }}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-all"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={(e) => startRename(e, conv.id, conv.title)}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(conv.id);
                      }}
                      className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-color)] transition-all group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[var(--metallic-shine)] opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity" />
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center group-hover:border-[var(--text-secondary)] transition-colors shadow-inner relative z-10">
            <span className="text-[var(--text-primary)] font-bold">
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] truncate">
              {user?.email}
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              auth.signOut();
            }}
            className="p-2 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all relative z-10"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};
