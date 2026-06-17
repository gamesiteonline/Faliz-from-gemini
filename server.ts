import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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
