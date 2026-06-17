import React, { useState, useEffect, useMemo } from "react";
import { 
  FolderCode, 
  File, 
  FileCode, 
  FileJson, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Zap, 
  FolderOpen, 
  Code2,
  Terminal,
  Cpu,
  RefreshCw,
  FolderTree,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import ThreeTree from "./components/ThreeTree";

interface FileItem {
  path: string;
  content: string;
}

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab states: "inspect" or "three3d"
  const [activeTab, setActiveTab] = useState<"inspect" | "three3d">("inspect");

  // UI states
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLLMBundle, setCopiedLLMBundle] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all codes dynamically from the Workspace Crawler API
  const fetchWorkspaceFiles = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const response = await fetch("/api/files");
      if (!response.ok) {
        throw new Error(`Failed to load workspace files: ${response.statusText}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.files)) {
        setFiles(data.files);
        // Default to first file if nothing selected or current selected is gone
        if (data.files.length > 0) {
          const currentExists = data.files.some((f: FileItem) => f.path === selectedPath);
          if (!currentExists) {
            // Find a nice entry point file
            const entryFile = data.files.find((f: FileItem) => 
              f.path === "src/App.tsx" || f.path === "App.tsx"
            ) || data.files[0];
            setSelectedPath(entryFile.path);
          }
        }
      } else {
        throw new Error("Invalid structure returned from workspace crawl engine.");
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while walking the filesystem.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceFiles();
  }, []);

  // Filtered files for left-hand navigation
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(f => f.path.toLowerCase().includes(query));
  }, [files, searchQuery]);

  // Selected file reference
  const selectedFile = useMemo(() => {
    return files.find(f => f.path === selectedPath);
  }, [files, selectedPath]);

  // Analyze files for breakdown and statistics
  const stats = useMemo(() => {
    const totalLines = files.reduce((sum, f) => sum + f.content.split("\n").length, 0);
    const totalBytes = files.reduce((sum, f) => sum + new Blob([f.content]).size, 0);
    
    // Group extensions
    const typeCount: { [key: string]: number } = {};
    files.forEach(f => {
      const ext = f.path.split('.').pop()?.toLowerCase() || 'other';
      typeCount[ext] = (typeCount[ext] || 0) + 1;
    });

    return {
      totalFiles: files.length,
      totalLines,
      sizeKB: (totalBytes / 1024).toFixed(1),
      typeCount
    };
  }, [files]);

  // Generate ZIP bundle from raw memory structure
  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      
      // Inject every file into the ZIP structure at relative path
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "faliz-ai-project-bundle.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("ZIP Generation failed:", err);
      alert("ZIP compilation failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setZipping(false);
    }
  };

  // Create an integrated Single Markdown view file bundle for LLM Prompt Injection
  const handleCopyLLMBundle = () => {
    if (files.length === 0) return;
    
    let bundle = `# FALIZ AI - Workspace Codebase Export\n`;
    bundle += `Generated on: ${new Date().toLocaleString()}\n`;
    bundle += `Total files in bundle: ${files.length}\n`;
    bundle += `Files list:\n`;
    files.forEach(f => {
      bundle += `- \`${f.path}\`\n`;
    });
    bundle += `\n---\n\n`;

    files.forEach((file) => {
      const ext = file.path.split('.').pop() || '';
      bundle += `## FILE: ${file.path}\n`;
      bundle += `\`\`\`${ext}\n`;
      bundle += file.content;
      if (!file.content.endsWith('\n')) bundle += `\n`;
      bundle += `\`\`\`\n\n`;
    });

    navigator.clipboard.writeText(bundle).then(() => {
      setCopiedLLMBundle(true);
      setTimeout(() => setCopiedLLMBundle(false), 2500);
    });
  };

  const handleCopyPath = () => {
    if (!selectedPath) return;
    navigator.clipboard.writeText(selectedPath).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    });
  };

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    });
  };

  // Map file extensions to rich developer colors and beautiful Lucide Icons
  const getFileIcon = (pathStr: string) => {
    const ext = pathStr.split('.').pop()?.toLowerCase();
    switch (ext) {
      case "tsx":
      case "jsx":
        return <FileCode className="w-4 h-4 text-cyan-400" id={`icon-jsx-${pathStr}`} />;
      case "ts":
      case "js":
        return <Code2 className="w-4 h-4 text-amber-400" id={`icon-js-${pathStr}`} />;
      case "json":
        return <FileJson className="w-4 h-4 text-yellow-500" id={`icon-json-${pathStr}`} />;
      case "css":
        return <File className="w-4 h-4 text-blue-400" id={`icon-css-${pathStr}`} />;
      case "html":
        return <FolderCode className="w-4 h-4 text-orange-400" id={`icon-html-${pathStr}`} />;
      case "md":
        return <File className="w-4 h-4 text-purple-400" id={`icon-md-${pathStr}`} />;
      default:
        return <File className="w-4 h-4 text-slate-400" id={`icon-def-${pathStr}`} />;
    }
  };

  // Perform lightweight regex-based token highlighting for interactive displaying
  const renderedHighlightLines = useMemo(() => {
    if (!selectedFile) return [];
    
    const lines = selectedFile.content.split("\n");
    const query = codeSearchQuery.toLowerCase();

    return lines.map((line, idx) => {
      const lineNum = idx + 1;
      const isTargetMatch = query ? line.toLowerCase().includes(query) : false;

      // Escape dynamic string to safely render HTML elements
      let lineHtml = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Custom Regex syntax decorators (strings, numbers, comments, keywords)
      if (lineHtml.trim().startsWith("//") || lineHtml.trim().startsWith("/*") || lineHtml.trim().startsWith("*")) {
        // Comment
        lineHtml = `<span class="text-slate-500 italic font-mono">${lineHtml}</span>`;
      } else {
        // Keywords highlight
        const keywords = [
          "import", "export", "from", "default", "const", "let", "var", 
          "function", "return", "class", "interface", "type", "extends", 
          "implements", "async", "await", "if", "else", "for", "while", 
          "do", "switch", "case", "break", "try", "catch", "finally", 
          "throw", "new", "this", "null", "undefined", "true", "false", "void"
        ];
        
        keywords.forEach((keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          lineHtml = lineHtml.replace(regex, `<span class="text-pink-400 font-semibold">${keyword}</span>`);
        });

        // Strings highlight (match single quotes, double quotes, and backticks)
        lineHtml = lineHtml.replace(/(["'`])(.*?)\1/g, `<span class="text-emerald-400 font-mono">"$2"</span>`);

        // Annotations / Types decorator
        lineHtml = lineHtml.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, `<span class="text-teal-300 font-mono">$1</span>`);
      }

      // Inline search keyword highlight decoration
      if (query && isTargetMatch) {
        const regexStr = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // escape regex chars
        try {
          const matchRegex = new RegExp(`(${regexStr})`, 'gi');
          lineHtml = lineHtml.replace(matchRegex, `<mark class="bg-yellow-500/40 text-yellow-100 rounded-sm px-0.5">$1</mark>`);
        } catch(e) {
          // Fallback if regex generation raises error
        }
      }

      return {
        lineNum,
        raw: line,
        formattedHtml: lineHtml,
        isMatched: isTargetMatch
      };
    });
  }, [selectedFile, codeSearchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200" id="faliz-ai-root">
      
      {/* GLOWING ORBS FOR PREMIUM DECORATIVE AMBIENCE */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full filter blur-[100px] pointer-events-none text-neutral-400" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between" id="faliz-ai-header">
        <div className="flex items-center space-x-3">
          <div className="p-2 md:p-2.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/10 flex items-center justify-center">
            <FolderTree className="w-5 md:w-6 h-5 md:h-6 text-slate-100 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                FALIZ AI
              </h1>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 font-bold tracking-wider rounded uppercase border border-cyan-500/20">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Dynamic Workspace Code Viewer &amp; Bundle Downloader</p>
          </div>
        </div>

        {/* WORKSPACE OPERATIONS PANEL */}
        <div className="flex items-center space-x-2">
          {/* Refresh files action */}
          <button
            onClick={() => fetchWorkspaceFiles(true)}
            disabled={loading || refreshing}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all duration-200 cursor-pointer flex items-center space-x-1.5 text-xs disabled:opacity-50"
            title="Reload code files from container disk"
            id="btn-workspace-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">Sync Files</span>
          </button>

          {/* Copy as single text file for LLM models prompts */}
          <button
            onClick={handleCopyLLMBundle}
            disabled={loading || files.length === 0}
            className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
              copiedLLMBundle 
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                : "bg-slate-900 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-100 text-slate-300"
            }`}
            title="Export and copy entire project codebase as a structured Markdown prompt layout"
            id="btn-workspace-llm"
          >
            {copiedLLMBundle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedLLMBundle ? "Copied Prompt LLM Bundle!" : "Copy LLM Context Bundle"}</span>
          </button>

          {/* Download all codes as ZIP bundle on client */}
          <button
            onClick={handleDownloadZip}
            disabled={loading || files.length === 0 || zipping}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-500/10 flex items-center space-x-2 transition-all duration-200 cursor-pointer disabled:opacity-55 active:scale-[0.98]"
            title="Compile all files in standard .zip folder"
            id="btn-workspace-zip"
          >
            {zipping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{zipping ? "Creating ZIP..." : "Download Project ZIP"}</span>
          </button>
        </div>
      </header>

      {/* METRICS & RUNTIME STATUS PANEL */}
      <section className="bg-slate-950 border-b border-indigo-950/20 px-6 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3" id="faliz-ai-stats">
        <div className="flex items-center space-x-6 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5 bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-900">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-mono">Workspace Engine:</span>
            <span className="text-cyan-400 font-semibold font-mono">Express &amp; React Full-Stack</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Files Count:</span>
            <span className="text-slate-200 font-semibold font-mono">{stats.totalFiles}</span>
          </div>
          <span className="text-slate-800 hidden sm:inline">|</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Lines of Code:</span>
            <span className="text-slate-200 font-semibold font-mono">{stats.totalLines.toLocaleString()}</span>
          </div>
          <span className="text-slate-800 hidden sm:inline">|</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Unzipped Size:</span>
            <span className="text-slate-200 font-semibold font-mono">{stats.sizeKB} KB</span>
          </div>
        </div>

        {/* Dynamic breakdown file badges */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-[11px] font-mono">
          <span className="text-slate-600">Breakdown:</span>
          {Object.entries(stats.typeCount).map(([type, count]) => (
            <span key={type} className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
              .{type}: <strong className="text-slate-100 font-bold">{count}</strong>
            </span>
          ))}
        </div>
      </section>

      {/* PythonAnywhere Notice Banner */}
      <div className="bg-slate-950 border-b border-cyan-950/40 px-6 py-2.5 flex items-center space-x-2 text-xs text-cyan-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="font-mono">
          <strong>PythonAnywhere Compatibility:</strong> Ready! Upload <code>app.py</code> and the built <code>dist/</code> folder into PythonAnywhere.com to run instantly on Flask.
        </span>
      </div>

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex overflow-hidden min-h-[calc(100vh-160px)] relative" id="faliz-ai-main">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4" id="view-loader">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-slate-400 font-medium font-mono text-sm">Walking workspace filesystem &amp; cataloguing files...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center" id="view-error">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-8 rounded-xl max-w-lg shadow-xl shadow-red-500/5">
              <h3 className="text-lg font-bold mb-2">Workspace Scan Incomplete</h3>
              <p className="text-sm text-slate-300 font-mono mb-4">{error}</p>
              <button 
                onClick={() => fetchWorkspaceFiles()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Retry Crawl Operation
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row h-full w-full overflow-hidden">
            
            {/* SIDEBAR FILE EXPLORER (LEFT CARD) */}
            <aside className="w-full lg:w-[340px] border-b lg:border-b-0 lg:border-r border-slate-900 bg-slate-950/40 divide-y divide-slate-900 flex flex-col shrink-0">
              
              {/* FILE FILTER INTERFACE */}
              <div className="p-4 bg-slate-950/20">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Files Explorer Navigation</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file name, path, extension..."
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500/50 rounded-lg py-2 pl-9 pr-4 text-sm font-sans placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 text-xs font-semibold px-1 bg-slate-800 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    Found {filteredFiles.length} matched files matching your filter term (out of {files.length})
                  </div>
                )}
              </div>

              {/* LIVE TREE / LIST VIEW */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[300px] lg:max-h-full">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 font-mono text-xs">
                    No files matched query.
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = file.path === selectedPath;
                    const segments = file.path.split('/');
                    const filename = segments.pop() || file.path;
                    const folderPath = segments.join('/');

                    return (
                      <button
                        key={file.path}
                        onClick={() => {
                          setSelectedPath(file.path);
                          // Clear in-file matching code searchQuery on change
                          setCodeSearchQuery("");
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start space-x-3 transition-all duration-150 group cursor-pointer ${
                          isSelected 
                            ? "bg-slate-900 border border-slate-800 text-white shadow-md shadow-black/30" 
                            : "hover:bg-slate-900/50 border border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                        id={`btn-file-${file.path.replace(/\//g, "-")}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getFileIcon(file.path)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-medium truncate ${isSelected ? 'text-cyan-400' : ''}`}>
                              {filename}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono ml-2 group-hover:text-slate-400 transition-colors">
                              {file.content.split('\n').length} lines
                            </span>
                          </div>
                          {folderPath && (
                            <span className="text-[10px] text-slate-600 block truncate font-mono mt-0.5 select-all">
                              {folderPath}/
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* QUICK INFO BOX FOOTER */}
              <div className="p-4 bg-slate-950/80 text-[11px] text-slate-500 font-mono hidden lg:block space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>CRAWLING CONSTRAINTS</span>
                </div>
                <p>Crawling automatically ignores <code>node_modules/</code>, <code>.git/</code>, lockfiles and compiled directories targeting ultra fast client downloads.</p>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-900/80 mt-2">
                  <p className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>FALIZ AI PRO v2.4</span>
                    <span className="text-emerald-400">Node/Python active</span>
                  </p>
                </div>
              </div>
            </aside>

            {/* LIVE ACTIVE CODE PANEL AND 3D GRAPH VISUALIZER PANEL */}
            <section className="flex-1 flex flex-col overflow-hidden bg-slate-950/20" id="faliz-ai-details">
              
              {/* TABS SELECTOR BOARD */}
              <div className="bg-slate-950 border-b border-slate-900 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab("inspect")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      activeTab === "inspect"
                        ? "bg-slate-900 text-white shadow-sm border border-slate-800"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Raw Code view ({selectedPath.split('/').pop() || "None"})</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab("three3d")}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                      activeTab === "three3d"
                        ? "bg-slate-900 text-cyan-300 shadow-sm border border-cyan-900/50"
                        : "text-slate-400 hover:text-cyan-400"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Interactive 3D Galaxy Tree</span>
                  </button>
                </div>
                
                <div className="text-[10px] text-slate-500 hidden sm:block">
                  Click nodes in 3D scene to open target file instantly.
                </div>
              </div>

              {activeTab === "three3d" ? (
                // THREEJS 3D TREE SYSTEM RENDER WINDOW
                <div className="flex-1 p-4 bg-slate-950 overflow-hidden flex flex-col">
                  <ThreeTree 
                    files={files} 
                    selectedPath={selectedPath} 
                    onSelectPath={(path) => {
                      setSelectedPath(path);
                      setActiveTab("inspect");
                    }} 
                  />
                </div>
              ) : selectedFile ? (
                <div className="flex-1 flex flex-col overflow-hidden divide-y divide-slate-900">
                  
                  {/* SELECTED FILE METADATA HEADER */}
                  <div className="p-4 bg-slate-900/20 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                    <div>
                      <div className="flex items-center space-x-2 text-xs font-mono mb-1">
                        <span className="text-slate-500">Active Path:</span>
                        <span 
                          onClick={handleCopyPath}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-800 cursor-copy flex items-center space-x-1 transition-all"
                          title="Copy file path to clipboard"
                        >
                          <span>{selectedFile.path}</span>
                          {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="font-mono">{selectedFile.content.split('\n').length} lines of code</span>
                        <span className="text-slate-700">•</span>
                        <span className="font-mono">{(new Blob([selectedFile.content]).size / 1024).toFixed(2)} KB</span>
                        <span className="text-slate-700">•</span>
                        <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                          {selectedFile.path.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    {/* SEARCH IN-FILE AND ACTIONS BOARD */}
                    <div className="flex items-center space-x-2 self-start md:self-auto w-full md:w-auto">
                      
                      {/* Search keyword matching in currently active code block */}
                      <div className="relative shrink-0 w-44 md:w-56">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={codeSearchQuery}
                          onChange={(e) => setCodeSearchQuery(e.target.value)}
                          placeholder="Search inside code..."
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-md py-1.5 pl-8 pr-4 text-xs font-mono placeholder-slate-600 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                        {codeSearchQuery && (
                          <button
                            onClick={() => setCodeSearchQuery("")}
                            className="absolute right-2.5 top-1.5 text-[9px] text-slate-400 hover:text-white bg-slate-800 px-1 rounded"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Copy individual file code */}
                      <button
                        onClick={handleCopyCode}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border flex items-center space-x-2.5 transition-all duration-200 cursor-pointer ${
                          copiedCode 
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                        title="Copy file contents"
                        id="btn-file-copy-code"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                      </button>

                      {/* Raw file download wrapper */}
                      <a
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(selectedFile.content)}`}
                        download={selectedFile.path.split('/').pop() || "code.txt"}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md text-slate-400 hover:text-white transition-all text-xs flex items-center justify-center cursor-pointer"
                        title="Download raw file directly"
                        id="btn-file-download-raw"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* ACTIVE CODE COMPONENT WINDOW */}
                  <div className="flex-1 overflow-auto bg-slate-950 font-mono text-sm leading-relaxed p-4 md:p-6" id="code-canvas">
                    
                    {/* Highlight Match Bar */}
                    {codeSearchQuery && (
                      <div className="mb-4 bg-cyan-950/30 border border-cyan-800/35 px-4 py-2 rounded-lg text-xs text-cyan-200 font-sans flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Searching for match keyword: <strong className="font-mono text-cyan-100">"{codeSearchQuery}"</strong></span>
                        </div>
                        <span>
                          Found {renderedHighlightLines.filter(l => l.isMatched).length} matching instances in file
                        </span>
                      </div>
                    )}

                    {/* Syntax Highlighter Viewer Panel */}
                    <div className="min-w-full inline-block">
                      <table className="w-full border-collapse">
                        <tbody>
                          {renderedHighlightLines.map((lineObj) => (
                            <tr 
                              key={lineObj.lineNum} 
                              className={`group transition-colors duration-100 ${
                                lineObj.isMatched 
                                  ? 'bg-yellow-500/10 hover:bg-yellow-500/15' 
                                  : 'hover:bg-slate-900/40'
                              }`}
                            >
                              {/* Line indices columns */}
                              <td className="w-12 text-right pr-4 text-slate-600 select-none text-[12px] font-mono border-r border-slate-900/60 leading-normal py-0.5">
                                {lineObj.lineNum}
                              </td>
                              
                              {/* Content string columns */}
                              <td 
                                className="pl-4 font-mono text-[13px] leading-normal py-0.5 pr-4 whitespace-pre"
                                dangerouslySetInnerHTML={{ __html: lineObj.formattedHtml || "&nbsp;" }}
                              />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTIVE VIEW DETAIL FOOTER */}
                  <footer className="px-6 py-3 bg-slate-950/80 border-t border-slate-900 flex justify-between items-center text-xs text-slate-500 font-mono shrink-0">
                    <div className="flex items-center space-x-1 text-slate-500">
                      <span>Currently inspecting:</span>
                      <strong className="text-slate-400 font-semibold">{selectedFile.path}</strong>
                    </div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-widest bg-slate-900 border border-slate-800/60 px-2 py-0.5 rounded font-bold">
                      ASCII Plain Text Code View
                    </div>
                  </footer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-sm" id="view-empty">
                  <FolderOpen className="w-12 h-12 text-slate-700 mb-2 animate-bounce" />
                  <p>Choose an item in file search navigator to output code content.</p>
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* GLOBAL NOTIFICATION AND HELP BAR */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 px-6 text-center text-xs text-slate-600 flex flex-col md:flex-row justify-between items-center gap-2" id="faliz-ai-footer">
        <p className="font-mono">© 2214 FALIZ AI • Elite Systems Engine Workspace</p>
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-slate-500 font-mono">Workspace Sync: Connected</span>
          </span>
          <span className="text-slate-800">|</span>
          <span className="text-slate-600 font-mono">Dynamic Node Injection</span>
        </div>
      </footer>

    </div>
  );
}
