import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  aiInstruction: string;
  setAiInstruction: (instruction: string) => Promise<void>;
  aiProvider: 'gemini' | 'groq';
  setAiProvider: (provider: 'gemini' | 'groq') => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [aiInstruction, setAiInstructionState] = useState('');
  const [aiProvider, setAiProviderState] = useState<'gemini' | 'groq'>('gemini');
  const [loading, setLoading] = useState(true);

  // Load theme from localStorage immediately to prevent flicker
  useEffect(() => {
    const savedTheme = localStorage.getItem('void-theme') as 'dark' | 'light';
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.aiInstruction !== undefined) {
          setAiInstructionState(data.aiInstruction);
        }
        if (data.aiProvider !== undefined) {
          setAiProviderState(data.aiProvider);
        }
        if (data.theme && !localStorage.getItem('void-theme')) {
          setThemeState(data.theme);
          document.documentElement.classList.toggle('light', data.theme === 'light');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('void-theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    
    if (user) {
      setDoc(doc(db, 'users', user.uid), { theme: newTheme }, { merge: true });
    }
  };

  const setAiInstruction = async (instruction: string) => {
    setAiInstructionState(instruction);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { aiInstruction: instruction }, { merge: true });
    }
  };

  const setAiProvider = async (provider: 'gemini' | 'groq') => {
    setAiProviderState(provider);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { aiProvider: provider }, { merge: true });
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      theme, 
      setTheme, 
      aiInstruction, 
      setAiInstruction, 
      aiProvider, 
      setAiProvider, 
      loading 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
