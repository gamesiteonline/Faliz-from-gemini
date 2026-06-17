# 🌌 FALIZ AI - Interactive Codebase Visualizer & Multi-Runtime Bundler

FALIZ AI is an enterprise-grade workspace browser, 3D structure analyzer (powered by Three.js), and zero-config downloader that bundles and displays entire projects dynamically. This project utilizes a dual-stack configuration enabling standard high-performance execution on Node.js/Vite AND native ready-to-run execution on PythonAnywhere.com via Flask.

---

## 🚀 Key Architectural Advantages
1. **Dynamic Workspace Crawler**: Automatic self-crawled real-time code retrieval via Node (`server.ts`) or Python (`app.py`), ignoring build artifacts, virtual environments, and binary locks.
2. **Interactive 3D Galaxy View**: Immersive, multi-dimensional Three.js visualization mapping folders and file dependencies onto a gravity-simulated orbital tree workspace.
3. **Dual Stack Routing Engine**: Seamlessly compile and run on Express OR serve statically via standard Python WSGI Flask webservers (e.g., PythonAnywhere.com).
4. **Instant LLM Context Bundler**: Package your entire codebase as a single markdown prompt with one-click, making code injection into Gemini, ChatGPT, or Claude effortless.
5. **Secure Local Zipper**: Compile code directory files on the client-side directly using recursive asynchronous compression vectors.

---

## 📁 Repository Blueprint

```text
/
├── app.py                  <-- Dual-Stack PythonAnywhere Web Server (Flask)
├── server.ts               <-- Node.js Production Express/Vite Integration
├── package.json            <-- Dependency configuration and multi-stage builds
├── vite.config.ts          <-- Vite Bundler Configuration
├── tsconfig.json           <-- Compiler settings
├── README.md               <-- System Documentation
├── src/
│   ├── main.tsx            <-- UI Mounting core
│   ├── index.css           <-- Tailwind config and theme decorators
│   ├── App.tsx             <-- Primary Workspace, 3D Space & Code Inspector
│   └── components/
│       └── ThreeTree.tsx   <-- High-Fidelity 3D Interactive Code Space Visualizer
```

---

## 🐍 PythonAnywhere.com Deployment Guide

To deploy this professional application on your **PythonAnywhere.com** account as a live personal portfolio or directory viewer, follow these trivial stages:

### Stage 1: Build static assets (Vite compiled code)
Before uploading, build the frontend code on Node.js using the command:
```bash
npm run build
```
This compilation creates a self-contained static directory `/dist` in the project root.

### Stage 2: Upload Project Directory
Create a ZIP of your files or push directly via Git. Upload the repository into your PythonAnywhere file manager workspace, ensuring the directory structure contains both `/dist` and `/app.py`.

### Stage 3: Initiate Python Web App
1. Go to your **PythonAnywhere Dashboard** and navigate to the **Web** tab.
2. Click **Add a new web app**.
3. Choose **Flask** as your framework.
4. Select **Python 3.10** or higher as the runtime version.
5. Set the path of your main script destination to target the uploaded `/app.py`.

### Stage 4: WSGI Web Configuration Setup
Click **WSGI configuration file** link inside the Web tab settings pane and verify your configuration import block hooks up correctly:

```python
import sys
import os

# Set working directory to project root containing dist/ and app.py
path = '/home/<your-username>/faliz-ai'
if path not in sys.path:
    sys.path.insert(0, path)

from app import app as application
```

Reload the web app using the green button. Your codebase inspector is now fully live on your custom PythonAnywhere sub-domain!

---

## ⚡ Local Development Quickstart

### 1. Install Node modules
```bash
npm install
```

### 2. Launch Developer Mode
```bash
npm run dev
```

### 3. Build & Package for Production
```bash
npm run build
```

---

## 💎 Features Walkthrough

### 🌌 Interactive 3D Tree
Powered by Three.js, visualizes your folders as high-density stardust nodes. Folder hubs act as central orbital points, rendering dependencies on circular vectors inside HTML5 Canvas with smooth responsive orbit controls.

### 🔍 Real-Time Text Search
Features live, optimized regular-expression text search matching within both the left sidebar path explorer and active inspection code tables.

### 📦 Dynamic Prompt Packer
Creates an integrated Single Markdown view file bundle of all source code inside the project, optimized for injecting directly into LLMs for conversation context.
