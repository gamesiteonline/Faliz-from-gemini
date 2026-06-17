import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure your API Key in the Settings panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // Recursively fetch file hierarchy
  function getFiles(dir: string, baseDir: string = dir): { path: string; content: string }[] {
    let results: { path: string; content: string }[] = [];

    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(baseDir, fullPath);

      // Exclude large metadata, binary artifacts or compilation folders
      const isExclude =
        relativePath.includes("node_modules") ||
        relativePath.includes(".git") ||
        relativePath.includes("dist") ||
        relativePath.startsWith("dist/") ||
        relativePath.startsWith(".git/") ||
        relativePath.startsWith("node_modules/") ||
        relativePath === "package-lock.json" ||
        relativePath === "yarn.lock" ||
        relativePath === "pnpm-lock.yaml" ||
        file === ".DS_Store";

      if (isExclude) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath, baseDir));
      } else {
        try {
          const ext = path.extname(file).toLowerCase();
          const textExtensions = [
            ".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css",
            ".example", ".md", ".gitignore", ".config", ".yml", ".yaml",
            ".json"
          ];
          
          if (textExtensions.includes(ext) || file.startsWith(".") || ext === "") {
            const content = fs.readFileSync(fullPath, "utf-8");
            results.push({
              path: relativePath,
              content: content
            });
          }
        } catch (err) {
          console.error("Error reading file during workspace crawl:", fullPath, err);
        }
      }
    }
    return results;
  }

  // API to fetch details of all project source code files dynamically
  app.get("/api/files", (req, res) => {
    try {
      const files = getFiles(process.cwd());
      res.json({ files });
    } catch (error: any) {
      console.error("Failed to list files:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for multi-turn Gemini-powered Chatbot with Search Grounding & Hierarchical Failover fallback levels
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, selectedFilePath } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // Lazily obtain the GoogleGenAI instance
      const ai = getGeminiClient();

      // Retrieve full codebase context for complete search & explain queries
      const allFiles = getFiles(process.cwd());
      
      let systemInstruction = `You are a premium workspace AI core intelligence companion.
The user's structural name is Fahad. You must always address him as "Fahad" or "Sir" with elite, smart, supportive, and highly technical demeanor.
You help Fahad analyze, explain, draft, customize, and optimize his codebase.
The project is container-bound (Node.js/Express backend + React/Vite/TS frontend).

Below is the directory catalogue of files with their accurate active contents.
Use this information to answer any code-specific queries precisely. Avoid outdated or dummy code references.

`;

      allFiles.forEach((file) => {
        // limit size of appended single file context to ensure overall token sanity
        if (file.content.length < 50000) {
          systemInstruction += `\n--- START OF FILE: ${file.path} ---\n`;
          systemInstruction += file.content;
          systemInstruction += `\n--- END OF FILE: ${file.path} ---\n`;
        } else {
          systemInstruction += `\n--- FILE: ${file.path} (Large File - Summary) ---\n`;
          systemInstruction += `[File size: ${file.content.length} characters. Lines: ${file.content.split('\n').length}]\n`;
        }
      });

      if (selectedFilePath) {
        systemInstruction += `\n\nActive UI Alert: Fahad is currently focusing on and viewing file "${selectedFilePath}". Focus your technical responses around this module if applicable.\n`;
      }

      systemInstruction += `\nInstructions:
1. Support Fahad with proactive, elite intelligence like a custom desktop computer counselor. Use respectful, smart, clean, objective developer tone. Address Fahad or use "Sir" naturally. Do not use corporate brand names or marketing hype.
2. Provide direct, beautifully engineered ready-to-run markdown code snippets when writing code edits.
3. If search result citations are useful to answer Fahad's queries, utilize search grounding.
`;

      // Map conversation history safely for @google/genai SDK format:
      // contents: [{ role: "user" | "model", parts: [{ text: "..." }] }]
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      // Define hierarchical levels of AI models & setups to dynamically try in sequence on failure
      const fallbackChain = [
        {
          name: "gemini-3.5-flash with Google Search",
          model: "gemini-3.5-flash",
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }]
          }
        },
        {
          name: "gemini-3.5-flash (No Search fallback)",
          model: "gemini-3.5-flash",
          config: {
            systemInstruction
          }
        },
        {
          name: "gemini-3.1-pro-preview premium failover",
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction
          }
        },
        {
          name: "gemini-3.1-flash-lite light-speed failover",
          model: "gemini-3.1-flash-lite",
          config: {
            systemInstruction
          }
        }
      ];

      let lastError: any = null;
      let finalResponse: any = null;
      let activeEngineName = "";

      for (const attempt of fallbackChain) {
        try {
          console.log(`[AI-CHAT] Attempting to generate text with model configuration: ${attempt.name}...`);
          const response = await ai.models.generateContent({
            model: attempt.model,
            contents: contents,
            config: attempt.config
          });
          
          if (response && (response.text || response.candidates?.[0]?.content)) {
            finalResponse = response;
            activeEngineName = attempt.name;
            console.log(`[AI-CHAT] Success! Request fulfilled by ${attempt.name}`);
            break; // Stop on first successful generation
          }
        } catch (err: any) {
          console.warn(`[AI-CHAT] Model execution failed for "${attempt.name}":`, err.message || err);
          lastError = err;
        }
      }

      if (!finalResponse) {
        throw new Error(`All fallback AI systems in the chain failed. Last active error: ${lastError?.message || lastError}`);
      }

      const text = finalResponse.text || "I apologize, but I could not compute a solution.";
      
      // Send back response along with grounding metadata if Google Search was triggered
      res.json({
        text,
        modelUsed: activeEngineName,
        groundingMetadata: finalResponse.candidates?.[0]?.groundingMetadata || null
      });

    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ 
        error: error.message || "An error occurred while contacting the Gemini brain." 
      });
    }
  });

  // Vite development middleware vs Static Production routing
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
    console.log(`FALIZ AI Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer().catch((err) => {
  console.error("Bootstrap Error:", err);
});
