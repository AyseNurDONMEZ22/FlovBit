"use client";
import { useState, useEffect } from "react";
import { FiCopy, FiTerminal, FiCode, FiBox, FiCheck } from "react-icons/fi";
import Link from "next/link";

export default function ApiReferencePage() {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  
  // Dinamik ortam değişkenleri (localStorage'dan alınabilir)
  const [envData, setEnvData] = useState({
    baseUrl: "http://localhost:8081",
    userId: "user_...",
    workspaceId: "ws_...",
    projectId: "proj_..."
  });

  useEffect(() => {
    // Sayfa yüklendiğinde mevcut localStorage verileriyle ortamı doldur
    const email = localStorage.getItem("email") || "test@example.com";
    const wsId = localStorage.getItem("currentWorkspaceId") || "ws_default";
    const projId = localStorage.getItem("currentProjectId") || "proj_default";
    
    setEnvData({
      baseUrl: "http://localhost:8081",
      userId: email,
      workspaceId: wsId,
      projectId: projId
    });
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [id]: true });
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, [id]: false });
    }, 2000);
  };

  const CopyButton = ({ text, id }: { text: string, id: string }) => (
    <button 
      onClick={() => handleCopy(text, id)}
      className="text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      title="Kopyala"
    >
      {copiedStates[id] ? <FiCheck className="text-green-500" /> : <FiCopy />}
    </button>
  );

  return (
    <div className="p-8 max-w-[1000px] mx-auto w-full font-sans transition-colors duration-200 pb-24 animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">API & MCP Guide</h1>
        <p className="text-[14px] text-gray-500 dark:text-[#848d9c] mt-2">
          Programmatic integration with FlowBit — step by step, filled with your environment.
        </p>
      </div>

      {/* YOUR ENVIRONMENT */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">Your Environment</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">auto-filled · used in commands</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base URL</div>
              <div className="text-[14px] font-mono text-slate-900 dark:text-[#e2e8f0]">{envData.baseUrl}</div>
            </div>
            <CopyButton text={envData.baseUrl} id="env-base" />
          </div>
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">User / Email</div>
              <div className="text-[14px] font-mono text-slate-900 dark:text-[#e2e8f0]">{envData.userId}</div>
            </div>
            <CopyButton text={envData.userId} id="env-user" />
          </div>
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Workspace ID</div>
              <div className="text-[14px] font-mono text-slate-900 dark:text-[#e2e8f0]">{envData.workspaceId}</div>
            </div>
            <CopyButton text={envData.workspaceId} id="env-ws" />
          </div>
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Project ID</div>
              <div className="text-[14px] font-mono text-slate-900 dark:text-[#e2e8f0]">{envData.projectId}</div>
            </div>
            <CopyButton text={envData.projectId} id="env-proj" />
          </div>
        </div>
      </div>

      {/* QUICK START */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">Quick Start</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-6">First integration in four steps — commands are filled with your environment.</p>
        
        <div className="flex flex-col gap-6">
          {/* STEP 1 */}
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center font-bold text-[14px]">1</div>
              <div className="w-full">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Get token</h3>
                <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">Take the token value from the login response and use it as $TOKEN.</p>
                <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d] text-gray-400 text-[11px] font-mono">
                    <span>curl</span>
                    <CopyButton text={`curl -X POST ${envData.baseUrl}/api/auth/login -H "Content-Type: application/json" -d '{"email": "${envData.userId}", "password": "password123"}'`} id="qs-1" />
                  </div>
                  <pre className="p-4 text-[13px] font-mono text-gray-300 overflow-x-auto">
                    <span className="text-pink-400">curl</span> -X POST {envData.baseUrl}/api/v1/auth/login \<br/>
                    &nbsp;&nbsp;-H <span className="text-yellow-300">"Content-Type: application/json"</span> \<br/>
                    &nbsp;&nbsp;-d <span className="text-yellow-300">'{'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"email": "{envData.userId}",<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"password": "password123"<br/>
                    &nbsp;&nbsp;{'}'}'</span>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center font-bold text-[14px]">2</div>
              <div className="w-full">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Make your first request</h3>
                <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">Fetch issues assigned to you with a Bearer token.</p>
                <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d] text-gray-400 text-[11px] font-mono">
                    <span>curl</span>
                    <CopyButton text={`curl "${envData.baseUrl}/api/v1/issues/assignee/${envData.userId}" -H "Authorization: Bearer $TOKEN"`} id="qs-2" />
                  </div>
                  <pre className="p-4 text-[13px] font-mono text-gray-300 overflow-x-auto">
                    <span className="text-pink-400">curl</span> <span className="text-yellow-300">"{envData.baseUrl}/api/v1/issues/assignee/{envData.userId}"</span> \<br/>
                    &nbsp;&nbsp;-H <span className="text-yellow-300">"Authorization: Bearer $TOKEN"</span>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center font-bold text-[14px]">3</div>
              <div className="w-full">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Connect MCP</h3>
                <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">Add this block to your Claude Desktop / Cursor MCP settings.</p>
                <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d] text-gray-400 text-[11px] font-mono">
                    <span>config.json</span>
                    <CopyButton text={`{\n  "mcpServers": {\n    "flowbit": {\n      "command": "npx",\n      "args": ["tsx", "src/mcp/server.ts"],\n      "env": { "MCP_STDIO_TOKEN": "<API_KEY>" }\n    }\n  }\n}`} id="qs-3" />
                  </div>
                  <pre className="p-4 text-[13px] font-mono text-gray-300 overflow-x-auto">
                    {'{'}<br/>
                    &nbsp;&nbsp;<span className="text-blue-300">"mcpServers"</span>: {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">"flowbit"</span>: {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">"command"</span>: <span className="text-yellow-300">"npx"</span>,<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">"args"</span>: [<span className="text-yellow-300">"tsx"</span>, <span className="text-yellow-300">"src/mcp/server.ts"</span>],<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">"env"</span>: {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">"MCP_STDIO_TOKEN"</span>: <span className="text-yellow-300">"&lt;YOUR_TOKEN&gt;"</span><br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                    &nbsp;&nbsp;{'}'}<br/>
                    {'}'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL REFERENCE */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-6">Full Reference</h2>
        
        <div className="flex flex-col gap-8">
          {/* Section: Workspaces */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-400 dark:text-[#848d9c] uppercase tracking-wider mb-3">Workspaces</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-blue-600 dark:text-[#5c9dff]">GET</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/workspaces/user/{`{email}`}</span>
                <span className="text-[13px] text-gray-500 ml-auto">List user workspaces</span>
              </div>
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-green-600 dark:text-[#22c55e]">POST</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/workspaces/create</span>
                <span className="text-[13px] text-gray-500 ml-auto">Create workspace</span>
              </div>
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-green-600 dark:text-[#22c55e]">POST</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/workspaces/members/{`{id}`}/add</span>
                <span className="text-[13px] text-gray-500 ml-auto">Invite member</span>
              </div>
            </div>
          </div>

          {/* Section: Issues */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-400 dark:text-[#848d9c] uppercase tracking-wider mb-3">Issues</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-blue-600 dark:text-[#5c9dff]">GET</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/issues/project/{`{id}`}</span>
                <span className="text-[13px] text-gray-500 ml-auto">List project issues</span>
              </div>
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-green-600 dark:text-[#22c55e]">POST</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/issues/create</span>
                <span className="text-[13px] text-gray-500 ml-auto">Create issue</span>
              </div>
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-amber-500 dark:text-[#f59e0b]">PUT</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/issues/{`{id}`}</span>
                <span className="text-[13px] text-gray-500 ml-auto">Update issue details</span>
              </div>
              <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-[#1e232d]">
                <span className="w-14 text-[11px] font-bold text-red-500 dark:text-[#ef4444]">DEL</span>
                <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">/api/v1/issues/{`{id}`}</span>
                <span className="text-[13px] text-gray-500 ml-auto">Delete issue</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}