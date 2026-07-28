"use client";
import { 
  FiBell, FiClipboard, FiLayers, FiRefreshCcw, FiZap,
  FiClock, FiAlertTriangle, FiCheckCircle, FiInbox, FiEye, FiPlus, FiArrowRight
} from "react-icons/fi";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userEmail, setUserEmail] = useState(""); 
    const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const urlEmail = urlParams.get("email");

      if (urlToken && urlEmail) {
        localStorage.setItem("token", urlToken);
        localStorage.setItem("email", urlEmail);
        window.history.replaceState({}, document.title, "/dashboard");
      }

      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");

      if (!token || !email) {
          window.location.href = "/";
          return;
      }
      
      setUserEmail(email);
      setUserName(email.split('@')[0]);

      try {
        const res = await fetch(`http://localhost:8081/api/v1/workspaces/user/${email}`, {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}` 
          }
        });
        
        if (res.ok) {
            const data = await res.json();
            setWorkspaces(data);
        }
      } catch (err) {
        console.error("Veriler çekilemedi:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

    const handleCreateWorkspace = async () => {
        const workspaceName = window.prompt("Yeni Çalışma Alanı (Workspace) adını girin:");
        if (!workspaceName) return; 

        const token = localStorage.getItem("token");
        const email = localStorage.getItem("email");

        try {
            const response = await fetch("http://localhost:8081/api/v1/workspaces/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: workspaceName,
                    email: email
                })
            });

            if (response.ok) {
                const newWorkspace = await response.json();
                alert("Çalışma alanı başarıyla oluşturuldu!");
                setWorkspaces([...workspaces, newWorkspace]); 
            } else {
                alert("Oluşturulurken bir hata oluştu.");
            }
        } catch (error) {
            console.error("Workspace oluşturma hatası:", error);
        }
    };

    const handleCreateIssue = async () => {
        if (workspaces.length === 0) {
            alert("Lütfen önce bir Çalışma Alanı (Workspace) oluşturun!");
            return;
        }

        const issueTitle = window.prompt("Yeni Görev (Issue) adını girin:");
        if (!issueTitle) return;

        const token = localStorage.getItem("token");
        const defaultWorkspaceId = workspaces[0].id; 

        try {
            const response = await fetch("http://localhost:8081/api/v1/issues/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: issueTitle,
                    status: "To Do",
                    priority: "High",
                    workspaceId: defaultWorkspaceId
                })
            });

            if (response.ok) {
                alert("Görev başarıyla eklendi!");
            }
        } catch (error) {
            console.error("Görev ekleme hatası:", error);
        }
    };

  const totalIssuesCount = workspaces.reduce((total, workspace) => {
    return total + (workspace.issues ? workspace.issues.length : 0);
  }, 0);

  const activeIssuesCount = workspaces.reduce((total, workspace) => {
    if (!workspace.issues) return total;
    const activeInWorkspace = workspace.issues.filter((issue: any) => issue.status !== "Done").length;
    return total + activeInWorkspace;
  }, 0);

  // --- DİNAMİK TEAM ACTIVITY VERİSİ ---
  const activities = [
    { id: 1, user: userName || "User", action: "created project", target: "project", time: "2m ago", badgeType: "project" },
    { id: 2, user: userName || "User", action: "activated cycle", target: "cycle_activated", time: "1h ago", badgeType: "cycle" },
    { id: 3, user: userName || "User", action: "created cycle", target: "cycle_created", time: "2h ago", badgeType: "cycle" },
    { id: 4, user: userName || "User", action: "closed cycle", target: "cycle_closed", time: "5h ago", badgeType: "cycle" },
  ];

  return (
    <div className="w-full h-full text-[14px] font-sans antialiased text-slate-800 dark:text-[#e2e8f0] pb-24 transition-colors duration-200">

      <div className="w-full flex flex-col relative">
        
        {/* İçerik Alanı */}
        {activeTab === "dashboard" && (
        <div className="p-8 max-w-[1200px] w-full">
          
          <div className="mb-8">
            <span className="text-gray-500 dark:text-[#848d9c] text-[13px] mb-4 block">Dashboard</span>
            <span className="text-[11px] font-bold text-slate-800 dark:text-[#e2e8f0] tracking-wider uppercase block mb-1">Welcome Back</span>
            <h1 className="text-slate-900 dark:text-white text-[28px] font-bold tracking-tight">Dashboard</h1>
          </div>

          {/* 4'lü Özet Kartları */}
          <div className="grid grid-cols-4 gap-5 mb-10">
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 flex flex-col justify-between h-[116px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">My Issues</span>
                <div className="w-7 h-7 rounded bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center">
                  <FiClipboard className="text-[14px]" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">{activeIssuesCount}</span>
                <span className="text-gray-500 dark:text-[#848d9c] text-[13px] mb-[3px]">Assigned to you</span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 flex flex-col justify-between h-[116px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">Total Issues</span>
                <div className="w-7 h-7 rounded bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center">
                  <FiLayers className="text-[14px]" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">{totalIssuesCount}</span>
                <span className="text-gray-500 dark:text-[#848d9c] text-[13px] mb-[3px]">In this project</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 flex flex-col justify-between h-[116px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">Active Cycles</span>
                <div className="w-7 h-7 rounded bg-purple-50 dark:bg-[#2c1d3b] text-purple-600 dark:text-[#a855f7] flex items-center justify-center">
                  <FiRefreshCcw className="text-[14px]" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">0</span>
                <span className="text-gray-500 dark:text-[#848d9c] text-[13px] mb-[3px]">Sprints</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 flex flex-col justify-between h-[116px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">Live Feed</span>
                <div className="w-7 h-7 rounded bg-green-50 dark:bg-[#1a2e25] text-green-600 dark:text-[#22c55e] flex items-center justify-center">
                  <FiZap className="text-[14px]" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-[#22c55e]"></div>
                <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Real-time updates</span>
              </div>
            </div>
          </div>

          {/* MY WORK */}
          <div>
            <h2 className="text-slate-900 dark:text-white text-[18px] font-bold tracking-wide mb-4">My Work</h2>
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[220px] shadow-sm dark:shadow-none transition-colors duration-200">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-[#1e232d]">
                  <FiClock className="text-slate-800 dark:text-[#e2e8f0] text-[15px]" />
                  <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">Today Focus</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <FiCheckCircle className="text-gray-400 dark:text-[#848d9c] text-[22px] mb-4" />
                  <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">Nothing due soon</span>
                  <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">No high-priority or due-soon issues</span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[220px] shadow-sm dark:shadow-none transition-colors duration-200">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-[#1e232d]">
                  <FiZap className="text-slate-800 dark:text-[#e2e8f0] text-[15px]" />
                  <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">My Active Work</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <FiInbox className="text-gray-400 dark:text-[#848d9c] text-[22px] mb-4" />
                  <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">No active issues</span>
                  <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Your assigned issues will appear here</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[220px] shadow-sm dark:shadow-none transition-colors duration-200">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-[#1e232d]">
                  <FiAlertTriangle className="text-slate-800 dark:text-[#e2e8f0] text-[15px]" />
                  <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">Risk & Alerts</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <FiCheckCircle className="text-gray-400 dark:text-[#848d9c] text-[22px] mb-4" />
                  <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">All clear</span>
                  <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">No overdue, blocked, or review-queue issues</span>
                </div>
              </div>
            </div>
          </div>

          {/* FOCUS MODE */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-blue-600 dark:text-[#5c9dff]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                </svg>
              </div>
              <div className="flex flex-col">
                <h2 className="text-slate-900 dark:text-white text-[16px] font-bold tracking-wide leading-tight">Focus Mode</h2>
                <span className="text-gray-500 dark:text-[#848d9c] text-[12px]">Monday, July 6, 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-red-500/40 via-gray-200 dark:via-[#1e232d] to-gray-200 dark:to-[#1e232d] h-[220px]">
                <div className="bg-white dark:bg-[#0b0d12] rounded-[11px] h-full w-full flex flex-col transition-colors duration-200">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-[#1e232d]">
                    <FiAlertTriangle className="text-red-500 dark:text-red-400 text-[15px]" />
                    <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">Overdue Today</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FiAlertTriangle className="text-green-500 dark:text-[#22c55e] text-[22px] mb-4" />
                    <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">No overdue issues 🎉</span>
                    <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">You're all caught up!</span>
                  </div>
                </div>
              </div>
              
              <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-amber-500/40 via-gray-200 dark:via-[#1e232d] to-gray-200 dark:to-[#1e232d] h-[220px]">
                <div className="bg-white dark:bg-[#0b0d12] rounded-[11px] h-full w-full flex flex-col transition-colors duration-200">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-[#1e232d]">
                    <FiEye className="text-amber-500 dark:text-amber-400 text-[15px]" />
                    <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">Review Pending</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FiEye className="text-green-500 dark:text-[#22c55e] text-[22px] mb-4" />
                    <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">No items awaiting review</span>
                    <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Nothing needs your attention</span>
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/40 via-gray-200 dark:via-[#1e232d] to-gray-200 dark:to-[#1e232d] h-[220px]">
                <div className="bg-white dark:bg-[#0b0d12] rounded-[11px] h-full w-full flex flex-col transition-colors duration-200">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-[#1e232d]">
                    <FiZap className="text-emerald-500 dark:text-emerald-400 text-[15px]" />
                    <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">Active Work</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FiZap className="text-gray-400 dark:text-[#848d9c] text-[22px] mb-4" />
                    <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">No active work</span>
                    <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Start working on an issue to see it here</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MY ISSUES & TEAM ACTIVITY */}
          <div className="grid grid-cols-2 gap-5 mt-12 mb-12">
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[340px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="p-5 border-b border-gray-200 dark:border-[#1e232d]">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-slate-900 dark:text-white text-[16px] font-bold tracking-wide">My Issues</h2>
                  <span className="text-blue-600 dark:text-[#5c9dff] text-[13px] font-semibold">{activeIssuesCount}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 text-[13px]">
                    <button className="bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] px-2 py-0.5 rounded font-medium">All</button>
                    <button className="text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">To Do</button>
                    <button className="text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">In Progress</button>
                    <button className="text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">Done</button>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <button className="bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium">All</button>
                    <button className="flex items-center gap-1.5 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="w-[6px] h-[6px] rounded-full bg-blue-500 dark:bg-[#5c9dff]"></span> Low
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="w-[6px] h-[6px] rounded-full bg-purple-500 dark:bg-[#a855f7]"></span> Med
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="w-[6px] h-[6px] rounded-full bg-yellow-500 dark:bg-[#eab308]"></span> High
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="w-[6px] h-[6px] rounded-full bg-red-500 dark:bg-[#ef4444]"></span> Crit
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FiInbox className="text-blue-500 dark:text-[#5c9dff] text-[26px] mb-4 opacity-80" />
                <span className="text-gray-500 dark:text-[#848d9c] text-[14px]">No issues assigned to you</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[340px] shadow-sm dark:shadow-none transition-colors duration-200 overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-[#1e232d] shrink-0">
                <h2 className="text-slate-900 dark:text-white text-[16px] font-bold tracking-wide">Team Activity</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-[#22c55e]"></span>
                  <span className="text-green-600 dark:text-[#22c55e] text-[12px] font-semibold">Live</span>
                </div>
              </div>
              
              {/* --- GÜNCEL TEAM ACTIVITY (MAP İLE DİNAMİK YAPILDI) --- */}
              <div className="flex flex-col overflow-y-auto custom-scrollbar">
                {activities.map((activity, index) => (
                  <div key={activity.id} className={`flex items-start gap-4 p-5 ${index !== activities.length - 1 ? 'border-b border-gray-100 dark:border-[#1e232d]' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-[#1c2436] flex items-center justify-center text-blue-600 dark:text-[#5c9dff] font-bold text-[12px] shrink-0 mt-0.5">
                      {activity.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[14px] text-gray-500 dark:text-[#848d9c]">
                        <span className="text-slate-900 dark:text-white font-semibold mr-1">{activity.user}</span> 
                        {activity.action}
                      </p>
                      <div className="flex items-center gap-2">
                        {activity.badgeType === "project" && (
                          <span className="bg-purple-50 dark:bg-[#2c1d3b] text-purple-600 dark:text-[#a855f7] text-[11px] px-2 py-0.5 rounded font-medium">{activity.target || "project"}</span>
                        )}
                        {activity.badgeType === "cycle" && (
                          <span className="bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] text-[11px] px-2 py-0.5 rounded font-medium">{activity.target || "cycle"}</span>
                        )}
                        <span className="text-gray-400 dark:text-[#5e5f64] text-[12px]">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* --- YOUR WORKSPACES --- */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-slate-900 dark:text-white text-[18px] font-bold tracking-wide">Your Workspaces</h2>
              <button 
                onClick={handleCreateWorkspace}
                className="bg-blue-600 dark:bg-[#5c9dff] text-white dark:text-[#0b0d12] px-4 py-2 rounded-lg font-semibold text-[13px] hover:bg-blue-700 dark:hover:bg-[#4a8bee] transition-colors cursor-pointer"
              >
                Create Workspace
              </button>
            </div>

            <div className="flex gap-4">
              {isLoading ? (
                  <p className="text-gray-500 dark:text-[#848d9c]">Yükleniyor...</p>
              ) : workspaces.length > 0 ? (
                workspaces.map((w: any) => (
                  <div key={w.id} className="bg-white dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 w-[340px] flex flex-col gap-5 shadow-sm dark:shadow-none transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600 dark:text-[#5c9dff] font-bold text-[16px] w-6 text-center bg-blue-50 dark:bg-[#1c2436] rounded uppercase">
                        {w.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white text-[15px] font-bold">{w.name}</span>
                        <span className="text-gray-500 dark:text-[#848d9c] text-[12px] mt-0.5">Admin</span>
                      </div>
                    </div>
                    {/* URL "/dashboard/project/overview" olarak GÜNCELLENDİ */}
                   {/* GÜNCEL VIEW PROJECTS LINKİ */}
<Link 
  href={`/dashboard/workspace/${w.id}`}
  className="mt-auto flex items-center gap-1.5 text-[13px] font-bold text-blue-600 dark:text-[#5c9dff] hover:text-blue-800 dark:hover:text-[#4a8bee] transition-colors w-max cursor-pointer"
>
  View projects <FiArrowRight className="mt-0.5" />
</Link>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-[#848d9c]">Henüz bir workspace yok. Oluşturmaya ne dersin?</p>
              )}
            </div>
          </div>
        </div>
        )}
        
        {/* --- NOTIFICATIONS SEKMESİ --- */}
        {activeTab === "notifications" && (
          <div className="p-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
            
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-slate-900 dark:text-white text-[26px] font-bold tracking-tight">Notifications</h1>
              
              <div className="flex items-center p-1 bg-transparent border border-gray-200 dark:border-[#2a2f3a] rounded-full">
                <button className="px-5 py-1.5 bg-gray-200 dark:bg-[#26282b] text-slate-900 dark:text-white text-[13px] font-medium rounded-full transition-colors cursor-pointer">All</button>
                <button className="px-5 py-1.5 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium rounded-full transition-colors cursor-pointer">Unread</button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl flex flex-col items-center justify-center h-[340px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="w-[52px] h-[52px] bg-gray-100 dark:bg-[#1c2436] rounded-[16px] flex items-center justify-center mb-5">
                <FiBell className="text-gray-400 dark:text-[#848d9c] text-[22px]" />
              </div>
              <h3 className="text-slate-900 dark:text-white text-[15px] font-bold tracking-wide mb-1.5">No notifications yet</h3>
              <p className="text-gray-500 dark:text-[#848d9c] text-[13px]">You'll see notifications here when something happens.</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}