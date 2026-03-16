import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Chat Proxy (Supports Gemini and Groq)
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, provider = "gemini" } = req.body;
      const defaultSystemInstruction = "You are Void AI 1.1, a high-performance AI assistant. Your interface is metallic grey and professional. If a user asks your name, respond that your name is Void AI 1.1. You are part of the Void AI platform.";
      const finalSystemInstruction = systemInstruction || defaultSystemInstruction;

      if (provider === "groq") {
        if (!process.env.GROQ_API_KEY) {
          return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: finalSystemInstruction },
            ...messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          model: "llama-3.3-70b-versatile", // Using a high-performance Llama model as "Scout"
        });

        return res.json({ content: chatCompletion.choices[0]?.message?.content || "" });
      }

      // Default to Gemini
      if (!process.env.GEMINI_API_KEY1) {
        return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY1 });
      
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: finalSystemInstruction
        },
        history: history
      });

      const lastMessage = messages[messages.length - 1].content;
      const response = await chat.sendMessage({ message: lastMessage });
      
      res.json({ content: response.text });
    } catch (error: any) {
      console.error("AI API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
