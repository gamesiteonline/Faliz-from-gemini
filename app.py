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
