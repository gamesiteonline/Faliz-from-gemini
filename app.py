# -*- coding: utf-8 -*-
"""
FALIZ AI - Dual-Stack Compatibility Module for PythonAnywhere.com
Provides standard WSGI-compliant Flask server to host codebase explorer engine.
"""

import os
import json
from flask import Flask, jsonify, send_from_directory, safe_join

app = Flask(__name__, static_folder="dist")

# Excludes for filesystem crawling
EXCLUDE_DIRS = {"node_modules", ".git", "dist", "__pycache__", "assets"}
EXCLUDE_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", "project_codes.zip"}
TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css",
    ".example", ".md", ".gitignore", ".config", ".yml", ".yaml", ".py"
}

def get_workspace_files():
    files_list = []
    base_dir = os.getcwd()
    
    for root, dirs, files in os.walk(base_dir):
        # Exclude directories in-place to prevent os.walk from entering them
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
        
        for file in files:
            if file in EXCLUDE_FILES or file.startswith('.'):
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, base_dir)
            _, ext = os.path.splitext(file)
            
            if ext.lower() in TEXT_EXTENSIONS or file.startswith('.') or ext == '':
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    files_list.append({
                        "path": rel_path.replace("\\", "/"),
                        "content": content
                    })
                except Exception as e:
                    print(f"Skipping file {rel_path} due to read error: {e}")
                    
    return files_list

@app.route("/api/files", methods=["GET"])
def api_files():
    """Serves identical codebase list API schema for React frontend."""
    try:
        files = get_workspace_files()
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Serves hierarchical multiple AI model fallback chain mapped natively for zero-module-dependency Flask deployment on PythonAnywhere."""
    try:
        from flask import request
        import urllib.request
        import urllib.error
        
        data = request.get_json() or {}
        messages = data.get("messages", [])
        selected_file_path = data.get("selectedFilePath", "")
        
        if not messages:
            return jsonify({"error": "Messages array is required."}), 400
            
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY environment variable is not defined on Python server."}), 500

        # Crawl workspace files
        all_files = get_workspace_files()
        
        system_instruction = (
            "You are a premium workspace AI core intelligence companion.\n"
            "The user's structural name is Fahad. You must always address him as \"Fahad\" or \"Sir\" with elite, smart, supportive, and highly technical demeanor.\n"
            "You help Fahad analyze, explain, draft, customize, and optimize his codebase.\n"
            "The project is container-bound (Node.js/Express backend + React/Vite/TS frontend).\n\n"
            "Below is the directory catalogue of files with their accurate active contents.\n"
            "Use this information to answer any code-specific queries precisely. Avoid outdated or dummy code references.\n\n"
        )
        
        for file_item in all_files:
            content = file_item.get("content", "")
            filePath = file_item.get("path", "")
            if len(content) < 50000:
                system_instruction += f"\n--- START OF FILE: {filePath} ---\n"
                system_instruction += content
                system_instruction += f"\n--- END OF FILE: {filePath} ---\n"
            else:
                system_instruction += f"\n--- FILE: {filePath} (Large File - Summary) ---\n"
                system_instruction += f"[File size: {len(content)} characters. Lines: {len(content.splitlines())}]\n"
                
        if selected_file_path:
            system_instruction += f"\n\nActive UI Alert: Fahad is currently focusing on and viewing file \"{selected_file_path}\". Focus your technical responses around this module if applicable.\n"
            
        system_instruction += (
            "\nInstructions:\n"
            "1. Support Fahad with proactive, elite intelligence like a custom desktop computer counselor. Use respectful, smart, clean, objective developer tone. Address Fahad or use \"Sir\" naturally. Do not use corporate brand names or marketing hype.\n"
            "2. Provide direct, beautifully engineered ready-to-run markdown code snippets when writing code edits.\n"
            "3. If search result citations are useful to answer Fahad's queries, utilize search grounding.\n"
        )
        
        # Format contents mapping
        contents = []
        for msg in messages:
            role = "model" if msg.get("role") == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })
            
        # Fallback runner configurations
        fallback_chain = [
            {
                "name": "gemini-3.5-flash with Google Search",
                "model": "gemini-3.5-flash",
                "use_search": True
            },
            {
                "name": "gemini-3.5-flash (No Search fallback)",
                "model": "gemini-3.5-flash",
                "use_search": False
            },
            {
                "name": "gemini-3.1-pro-preview premium failover",
                "model": "gemini-3.1-pro-preview",
                "use_search": False
            },
            {
                "name": "gemini-3.1-flash-lite light-speed failover",
                "model": "gemini-3.1-flash-lite",
                "use_search": False
            }
        ]
        
        final_text = None
        grounding_metadata = None
        active_engine = ""
        last_error = ""
        
        for attempt in fallback_chain:
            try:
                model_name = attempt["model"]
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                
                payload = {
                    "contents": contents,
                    "systemInstruction": {
                        "parts": [{"text": system_instruction}]
                    }
                }
                
                if attempt["use_search"]:
                    payload["tools"] = [{"googleSearch": {}}]
                    
                req_data = json.dumps(payload).encode("utf-8")
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "aistudio-build-pythonanywhere"
                }
                
                url_req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(url_req, timeout=25) as response:
                    res_body = response.read().decode("utf-8")
                    parsed_res = json.loads(res_body)
                    
                    candidates = parsed_res.get("candidates", [])
                    if candidates:
                        candidate = candidates[0]
                        parts = candidate.get("content", {}).get("parts", [])
                        if parts:
                            final_text = parts[0].get("text", "")
                            grounding_metadata = candidate.get("groundingMetadata")
                            active_engine = attempt["name"]
                            break
            except Exception as e:
                last_error = str(e)
                print(f"[Python API Fallback] Try failed for {attempt['name']}: {e}")
                
        if not final_text:
            return jsonify({"error": f"All fallback models failed on Python server. Last error: {last_error}"}), 500
            
        return jsonify({
            "text": final_text,
            "modelUsed": active_engine,
            "groundingMetadata": grounding_metadata
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Fallback static and SPA dynamic routing handler."""
    dist_dir = os.path.join(os.getcwd(), "dist")
    
    # Render static files if present in modern dist directory
    if path and os.path.exists(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
        
    # Standard Index fallback for SPA Routing
    return send_from_directory(dist_dir, "index.html")

if __name__ == "__main__":
    # Host on absolute port bindings for general testing
    app.run(host="0.0.0.0", port=3000, debug=True)
