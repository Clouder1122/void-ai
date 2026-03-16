import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Shield, Check, LogOut, Info, Palette, Monitor, Sun, Moon, Sparkles } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'personalization' | 'ai' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme, setTheme, aiInstruction, setAiInstruction } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [localAiInstruction, setLocalAiInstruction] = useState(aiInstruction);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLocalAiInstruction(aiInstruction);
  }, [aiInstruction]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdating(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAiInstruction = async () => {
    setIsUpdating(true);
    try {
      await setAiInstruction(localAiInstruction);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving AI instruction:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px]"
          >
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] border-r border-[var(--border-color)] p-6 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-[var(--metallic-shine)] opacity-50 pointer-events-none" />
              <div className="relative z-10 mb-8">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--text-secondary)]" />
                  Settings
                </h2>
              </div>

              <nav className="flex-1 space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'profile' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('personalization')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'personalization' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  Personalization
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'ai' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI Config
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'about' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  About Us
                </button>
              </nav>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all mt-auto"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-8 relative">
              <button 
                onClick={onClose}
                className="hidden md:flex absolute top-6 right-6 p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm z-30"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-end md:hidden mb-4">
                <button onClick={onClose} className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center shadow-inner">
                        <User className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">My Profile</h3>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">Manage your personal information and how others see you.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">
                          Display Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-secondary)] focus:bg-[var(--bg-tertiary)] transition-all shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">
                          Email Address
                        </label>
                        <div className="relative opacity-50">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-primary)] cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold py-4 rounded-2xl hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20"
                    >
                      {isUpdating ? (
                        <div className="w-5 h-5 border-2 border-[var(--accent-contrast)] border-t-transparent rounded-full animate-spin" />
                      ) : showSuccess ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-emerald-500">Profile Updated</span>
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'personalization' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center shadow-inner">
                        <Palette className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">Personalization</h3>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">Customize your experience and interface.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[24px] flex items-center justify-between group hover:border-[var(--text-tertiary)]/50 hover:bg-[var(--bg-tertiary)]/30 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center">
                          {theme === 'dark' ? <Sparkles className="w-6 h-6 text-[var(--text-secondary)]" /> : <Sun className="w-6 h-6 text-[var(--text-secondary)]" />}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{theme === 'dark' ? 'Metallic Gray' : 'Day Mode'}</p>
                          <p className="text-xs text-[var(--text-secondary)]">Switch between light and metallic themes</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'light' ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                      >
                        <motion.div
                          animate={{ x: theme === 'light' ? 24 : 4 }}
                          className={`absolute top-1 w-4 h-4 rounded-full ${theme === 'light' ? 'bg-white' : 'bg-black'}`}
                        />
                      </button>
                    </div>

                    <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[24px] opacity-50">
                      <p className="text-sm text-[var(--text-secondary)] text-center italic">More customization options coming soon...</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center shadow-inner">
                        <Sparkles className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">AI Configuration</h3>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">Define how the AI should behave and respond to you.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">
                        System Instruction
                      </label>
                      <textarea
                        value={localAiInstruction}
                        onChange={(e) => setLocalAiInstruction(e.target.value)}
                        placeholder="e.g. You are a professional code reviewer. Be concise and focus on security."
                        className="w-full h-40 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-secondary)] focus:bg-[var(--bg-tertiary)] transition-all resize-none text-sm shadow-inner"
                      />
                      <p className="text-[10px] text-[var(--text-tertiary)] ml-1 italic">
                        This instruction will be sent with every message to guide the AI's personality.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveAiInstruction}
                      disabled={isUpdating}
                      className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold py-4 rounded-2xl hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20"
                    >
                      {isUpdating ? (
                        <div className="w-5 h-5 border-2 border-[var(--accent-contrast)] border-t-transparent rounded-full animate-spin" />
                      ) : showSuccess ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-emerald-500">Instruction Saved</span>
                        </>
                      ) : (
                        'Save AI Instruction'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center shadow-inner">
                        <Info className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">About Void AI</h3>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">Version 1.0.4 - Enterprise Edition</p>
                  </div>

                  <div className="prose prose-invert prose-sm">
                    <p>
                      Void AI is a next-generation intelligence platform designed for speed, privacy, and precision. 
                      Built on the latest neural architectures, it provides a seamless interface for complex reasoning and creative tasks.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-inner">
                        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-1">Engine</p>
                        <p className="text-[var(--text-primary)] font-medium">Void AI 1</p>
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-inner">
                        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-1">Region</p>
                        <p className="text-[var(--text-primary)] font-medium">Global Edge</p>
                      </div>
                    </div>
                    <div className="mt-8 space-y-1 text-center">
                      <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest">
                        © 2026 Void Intelligence Systems
                      </p>
                      <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-[0.2em] font-bold">
                        Created by brokede4
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
