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
    const [myIssues, setMyIssues] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userEmail, setUserEmail] = useState(""); 
    const [userName, setUserName] = useState("");

    // YENİ: Projedeki toplam görev ve sprint sayılarını tutacak state'ler
    const [totalProjectIssues, setTotalProjectIssues] = useState(0);
    const [activeCycles, setActiveCycles] = useState(0);

    const [statusFilter, setStatusFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");

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
        // 1. Workspaces Çekimi
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/user/${email}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            setWorkspaces(await res.json());
        }

        // 2. Bana Atanan Görevler
        const issueRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/issues/assignee/${email}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (issueRes.ok) {
            setMyIssues(await issueRes.json());
        }

        // 3. YENİ: Seçili Projenin Toplam Görev ve Döngü (Sprint) Sayılarını Çekme
        const savedProjectId = localStorage.getItem("currentProjectId");
        if (savedProjectId) {
            // Projedeki tüm görevleri say
            try {
                const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/issues/project/${savedProjectId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (pRes.ok) {
                    const pData = await pRes.json();
                    setTotalProjectIssues(pData.length);
                }
            } catch(e) { console.error(e) }

            // Projedeki aktif döngüleri (sprints) say
            try {
                // Eğer Cycle API ucun /api/v1/cycles/project/{id} ise bunu kullanır
                const cRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/cycles/project/${savedProjectId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (cRes.ok) {
                    const cData = await cRes.json();
                    setActiveCycles(cData.length);
                } else {
                    // Alternatif olarak tüm cycle'ları çekmeyi dener
                    const allCRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/cycles`, {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (allCRes.ok) {
                      const allCData = await allCRes.json();
                      setActiveCycles(allCData.length);
                    }
                }
            } catch(e) { console.error(e) }
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
            const response = await fetch("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name: workspaceName, email: email })
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

  const filteredMyIssues = myIssues.filter(issue => {
    const matchStatus = statusFilter === "All" || issue.status === statusFilter;
    const matchPriority = priorityFilter === "All" || issue.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": case "critical": return "text-red-500 bg-red-50 dark:bg-[#3a1d1d] dark:text-red-400";
      case "medium": return "text-purple-500 bg-purple-50 dark:bg-[#2c1d3b] dark:text-purple-400";
      default: return "text-blue-500 bg-blue-50 dark:bg-[#1c2436] dark:text-blue-400";
    }
  };

  const activities = [
    { id: 1, user: userName || "User", action: "created project", target: "project", time: "2m ago", badgeType: "project" },
    { id: 2, user: userName || "User", action: "activated cycle", target: "cycle_activated", time: "1h ago", badgeType: "cycle" },
    { id: 3, user: userName || "User", action: "created cycle", target: "cycle_created", time: "2h ago", badgeType: "cycle" },
    { id: 4, user: userName || "User", action: "closed cycle", target: "cycle_closed", time: "5h ago", badgeType: "cycle" },
  ];

  return (
    <div className="w-full h-full text-[14px] font-sans antialiased text-slate-800 dark:text-[#e2e8f0] pb-24 transition-colors duration-200">

      <div className="w-full flex flex-col relative">
        
        {activeTab === "dashboard" && (
        <div className="p-8 max-w-[1200px] w-full">
          
          <div className="mb-8">
            <span className="text-gray-500 dark:text-[#848d9c] text-[13px] mb-4 block">Dashboard</span>
            <span className="text-[11px] font-bold text-slate-800 dark:text-[#e2e8f0] tracking-wider uppercase block mb-1">Welcome Back</span>
            <h1 className="text-slate-900 dark:text-white text-[28px] font-bold tracking-tight">Dashboard</h1>
          </div>

          <div className="grid grid-cols-4 gap-5 mb-10">
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-5 flex flex-col justify-between h-[116px] shadow-sm dark:shadow-none transition-colors duration-200">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">My Issues</span>
                <div className="w-7 h-7 rounded bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] flex items-center justify-center">
                  <FiClipboard className="text-[14px]" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">{myIssues.length}</span>
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
                {/* GÜNCELLENDİ: Gerçek Proje Görev Sayısı */}
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">{totalProjectIssues}</span>
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
                {/* GÜNCELLENDİ: Gerçek Sprint (Cycle) Sayısı */}
                <span className="text-slate-900 dark:text-white text-[28px] font-bold leading-none">{activeCycles}</span>
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
                <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-[#22c55e] animate-pulse"></div>
                <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Real-time updates</span>
              </div>
            </div>
          </div>

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
              
              <div className={`bg-gray-50 dark:bg-[#0b0d12] border ${myIssues.length > 0 ? "border-blue-500 dark:border-[#5c9dff]" : "border-gray-200 dark:border-[#1e232d]"} rounded-xl flex flex-col h-[220px] shadow-sm dark:shadow-none transition-colors duration-200 relative overflow-hidden`}>
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-[#1e232d]">
                  <FiZap className="text-slate-800 dark:text-[#e2e8f0] text-[15px]" />
                  <span className="text-slate-800 dark:text-[#e2e8f0] text-[13px] font-semibold">My Active Work</span>
                </div>
                {myIssues.length > 0 ? (
                  <div className="flex-1 flex flex-col p-6 justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-mono text-gray-400">#{myIssues[0].id}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-[#1c2436] dark:text-[#5c9dff] px-2 py-0.5 rounded-full uppercase">{myIssues[0].status}</span>
                    </div>
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">{myIssues[0].title}</p>
                    <Link href={`/dashboard/project/issue/${myIssues[0].id}`} className="mt-4 text-[12px] font-bold text-blue-600 dark:text-[#5c9dff] hover:underline w-max">
                      View Task &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FiInbox className="text-gray-400 dark:text-[#848d9c] text-[22px] mb-4" />
                    <span className="text-slate-900 dark:text-white text-[14px] font-semibold mb-1">No active issues</span>
                    <span className="text-gray-500 dark:text-[#848d9c] text-[13px]">Your assigned issues will appear here</span>
                  </div>
                )}
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

          <div className="grid grid-cols-2 gap-5 mt-12 mb-12">
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl flex flex-col h-[340px] shadow-sm dark:shadow-none transition-colors duration-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-[#1e232d] shrink-0">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-slate-900 dark:text-white text-[16px] font-bold tracking-wide">My Issues</h2>
                  <span className="text-blue-600 dark:text-[#5c9dff] text-[13px] font-semibold">{myIssues.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 text-[13px]">
                    {["All", "To Do", "In Progress", "Done"].map(s => (
                      <button key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? "bg-blue-50 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] px-2 py-0.5 rounded font-medium transition-colors" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors"}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <button onClick={() => setPriorityFilter("All")} className={priorityFilter === "All" ? "bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium transition-colors" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors"}>All</button>
                    
                    <button onClick={() => setPriorityFilter("Low")} className={`flex items-center gap-1.5 transition-colors ${priorityFilter === "Low" ? "bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>
                      <span className="w-[6px] h-[6px] rounded-full bg-blue-500 dark:bg-[#5c9dff]"></span> Low
                    </button>
                    <button onClick={() => setPriorityFilter("Medium")} className={`flex items-center gap-1.5 transition-colors ${priorityFilter === "Medium" ? "bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>
                      <span className="w-[6px] h-[6px] rounded-full bg-purple-500 dark:bg-[#a855f7]"></span> Med
                    </button>
                    <button onClick={() => setPriorityFilter("High")} className={`flex items-center gap-1.5 transition-colors ${priorityFilter === "High" ? "bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>
                      <span className="w-[6px] h-[6px] rounded-full bg-yellow-500 dark:bg-[#eab308]"></span> High
                    </button>
                    <button onClick={() => setPriorityFilter("Critical")} className={`flex items-center gap-1.5 transition-colors ${priorityFilter === "Critical" ? "bg-gray-100 dark:bg-[#1e232d] text-slate-900 dark:text-white px-2 py-0.5 rounded font-medium" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>
                      <span className="w-[6px] h-[6px] rounded-full bg-red-500 dark:bg-[#ef4444]"></span> Crit
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex justify-center p-6 text-gray-500 text-[13px]">Yükleniyor...</div>
                ) : filteredMyIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center h-full">
                    <FiInbox className="text-blue-500 dark:text-[#5c9dff] text-[26px] mb-4 opacity-80" />
                    <span className="text-gray-500 dark:text-[#848d9c] text-[14px]">No issues match your filters</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredMyIssues.map(issue => (
                      <Link href={`/dashboard/project/issue/${issue.id}`} key={issue.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#1e232d]/50 rounded-lg transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#1c2436] flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-[#848d9c]">
                            {issue.id}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#5c9dff] transition-colors">{issue.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPriorityColor(issue.priority)}`}>{issue.priority || "Low"}</span>
                              <span className="text-[11px] text-gray-400 dark:text-[#64748b]">Assigned Task</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 dark:text-[#848d9c] bg-gray-100 dark:bg-[#1e232d] px-2.5 py-1 rounded">
                          {issue.status}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
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