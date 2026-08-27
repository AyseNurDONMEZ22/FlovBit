"use client";

import { 
  FiBell, FiSearch, FiCode, FiCreditCard, FiSettings, FiLogOut, 
  FiSun, FiMoon, FiPlus, FiLayout, FiColumns, FiList, FiRefreshCw, FiBarChart2, FiX 
} from "react-icons/fi";
import { TbLayoutDashboard } from "react-icons/tb";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); 
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // SOL MENÜ İÇİN DİNAMİK PROJE BİLGİLERİ
  const [currentProjectName, setCurrentProjectName] = useState("Proje Seçin");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // GÖREV EKLEME (ISSUE MODAL) STATE'LERİ
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueStatus, setIssueStatus] = useState("To Do"); // Column
  const [issuePriority, setIssuePriority] = useState("Medium");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Kullanıcının seçebileceği projeleri tutan liste
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    setMounted(true);
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    
    if (email) {
        setUserEmail(email);
        setUserName(email.split('@')[0]); 

        if (token) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/notifications/user/${email}`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
          .then(res => {
            if(res.ok) return res.json();
            return [];
          })
          .then(data => {
            if(Array.isArray(data)) {
              const unread = data.filter((n: any) => !(n.read === true || n.isRead === true)).length;
              setUnreadCount(unread);
            }
          })
          .catch(err => console.error("Bildirimler çekilemedi:", err));
        }
    }
  }, [pathname]);

  // HAFIZAYI SÜREKLİ DİNLEYEREK SOL MENÜYÜ GÜNCELLEYEN EFFECT
  useEffect(() => {
    const updateSidebar = () => {
      const savedName = localStorage.getItem("currentProjectName");
      const savedId = localStorage.getItem("currentProjectId");
      if (savedName) setCurrentProjectName(savedName);
      if (savedId) setCurrentProjectId(savedId);
    };

    updateSidebar(); 
    window.addEventListener("projectChanged", updateSidebar);

    return () => window.removeEventListener("projectChanged", updateSidebar);
  }, []);

  // MODAL AÇILDIĞINDA KULLANICININ TÜM PROJELERİNİ ÇEKER
  useEffect(() => {
    if (isIssueModalOpen) {
      loadUserProjects();
    }
  }, [isIssueModalOpen]);

  const loadUserProjects = async () => {
    setIsLoadingProjects(true);
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) return;

    try {
      // 1. Önce kullanıcının workspace'lerini çek
      const wsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/user/${email}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!wsRes.ok) return;
      const workspaces = await wsRes.json();

      // 2. Her workspace için projeleri çekip tek bir listede birleştir
      let allProjects: any[] = [];
      for (const ws of workspaces) {
        const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/projects/workspace/${ws.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (pRes.ok) {
          const projs = await pRes.json();
          projs.forEach((p: any) => {
            allProjects.push({ ...p, workspaceName: ws.name });
          });
        }
      }
      setAvailableProjects(allProjects);

      // Varsayılan olarak hafızadaki projeyi veya listedeki ilk projeyi seçili yap
      const savedId = localStorage.getItem("currentProjectId");
      if (savedId && allProjects.find(p => p.id.toString() === savedId)) {
        setSelectedProjectId(savedId);
      } else if (allProjects.length > 0) {
        setSelectedProjectId(allProjects[0].id.toString());
      }
    } catch (error) {
      console.error("Projeler yüklenirken hata:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/"; 
  };

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  // GÖREV OLUŞTURMA FONKSİYONU
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      alert("Lütfen önce bir Board (Proje) seçin.");
      return;
    }

    const token = localStorage.getItem("token");
    const submitBtn = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/issues/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: issueTitle,
          description: issueDescription, // Yeni eklenen alan
          status: issueStatus,
          priority: issuePriority,
          projectId: parseInt(selectedProjectId) // Seçilen proje (Board)
        })
      });

      if (response.ok) {
        setIssueTitle("");
        setIssueDescription("");
        setIssueStatus("To Do");
        setIssuePriority("Medium");
        setIsIssueModalOpen(false);
        
        // Eğer kullanıcı Board veya Backlog sayfasındaysa anında güncellenmesi için sisteme sinyal gönderiyoruz
        window.dispatchEvent(new Event("issueCreated"));
      } else {
        alert("Görev eklenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Görev ekleme hatası:", error);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7fc] dark:bg-[#0b0d12] text-[14px] font-sans antialiased text-slate-800 dark:text-[#e2e8f0] relative overflow-hidden transition-colors duration-200">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-[240px] flex-shrink-0 bg-white dark:bg-[#11141b] border-r border-gray-200 dark:border-[#1e232d] flex flex-col justify-between z-10 transition-colors duration-200">
        <div>
          <div className="flex items-center h-[72px] px-6">
            <div className="w-[26px] h-[26px] bg-white rounded-full flex items-center justify-center mr-3 shadow-md border border-gray-100 dark:border-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-[13px] italic">F</span>
            </div>
            <span className="font-semibold text-[18px] tracking-wide text-slate-900 dark:text-white">Flovbit</span>
          </div>
          <div className="px-3 flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b7280] tracking-wider uppercase mb-2 px-3">Main</span>
            <div className="flex flex-col gap-1">
              
              <Link href="/dashboard" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard" ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname === "/dashboard" && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <TbLayoutDashboard className="text-[20px]" />
                  <span>Dashboard</span>
                </div>
              </Link>

              <Link href="/dashboard/notifications" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard/notifications" ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname === "/dashboard/notifications" && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <FiBell className="text-[18px]" />
                  <span>Notifications</span>
                </div>
              </Link>

              <Link href="/dashboard/search" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard/search" ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname === "/dashboard/search" && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <FiSearch className="text-[18px]" />
                  <span>Search</span>
                </div>
              </Link>

              <Link href="/dashboard/api-reference" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard/api-reference" ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname === "/dashboard/api-reference" && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <FiCode className="text-[18px]" />
                  <span>API Reference</span>
                </div>
              </Link>

              <Link href="/dashboard/billing" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {(pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/")) && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <FiCreditCard className="text-[18px]" />
                  <span>Billing</span>
                </div>
              </Link>
              
              <Link href="/dashboard/settings" className={`relative flex items-center w-full rounded-lg transition-colors ${pathname === "/dashboard/settings" ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname === "/dashboard/settings" && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>
                )}
                <div className="flex items-center gap-3 w-full pl-3 pr-3 py-2 font-medium">
                  <FiSettings className="text-[18px]" />
                  <span>Settings</span>
                </div>
              </Link>

            </div>
          </div>

          {/* --- RECENT PROJECT MENU (DİNAMİK) --- */}
          <div className="px-3 flex flex-col mt-8">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b7280] tracking-wider uppercase">Recent Project</span>
            </div>
            
            <div className="px-3 mb-4">
              {currentProjectId ? (
                <Link
                  href={`/dashboard/project/overview?projectId=${currentProjectId}`}
                  className="block text-[14px] font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-[#5c9dff] transition-colors truncate"
                >
                  {currentProjectName}
                </Link>
              ) : (
                <span className="block text-[13px] text-gray-400 italic">No project selected</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Link href={`/dashboard/project/overview${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/overview") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/overview") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <FiLayout className="text-[18px]" /> <span>Overview</span>
                </div>
              </Link>
              
              <Link href={`/dashboard/project/board${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/board") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/board") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <FiColumns className="text-[18px]" /> <span>Board</span>
                </div>
              </Link>
              
              <Link href={`/dashboard/project/backlog${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/backlog") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/backlog") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <FiList className="text-[18px]" /> <span>Backlog</span>
                </div>
              </Link>
              
              <Link href={`/dashboard/project/cycles${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/cycles") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/cycles") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <FiRefreshCw className="text-[18px]" /> <span>Cycles</span>
                </div>
              </Link>
              
              <Link href={`/dashboard/project/reports${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/reports") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/reports") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <FiBarChart2 className="text-[18px]" /> <span>Reports</span>
                </div>
              </Link>

              <Link href={`/dashboard/project/settings${currentProjectId ? `?projectId=${currentProjectId}` : ""}`} className={`relative flex items-center w-full rounded-lg transition-colors ${pathname.includes("/project/settings") ? "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]" : "text-gray-600 dark:text-[#949eaf] hover:text-slate-900 hover:bg-gray-50 dark:hover:text-white dark:hover:bg-[#1a1e27]"}`}>
                {pathname.includes("/project/settings") && <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[4px] h-[20px] bg-blue-600 dark:bg-[#5c9dff] rounded-r-md"></div>}
                <div className="flex items-center gap-3 w-full px-3 py-2 font-medium">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-[#1e232d] p-5 flex flex-col gap-5">
          <div className="flex flex-col px-1 w-full overflow-hidden">
            <span className="font-semibold text-slate-900 dark:text-white text-[14px] truncate">{userName || "Loading..."}</span>
            <span className="text-gray-500 dark:text-[#848d9c] text-[13px] truncate">{userEmail || "Loading..."}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-1 text-gray-500 dark:text-[#949eaf] hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium cursor-pointer"
          >
            <FiLogOut className="text-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- ANA EKRAN İÇERİĞİ --- */}
      <main className="flex-1 bg-transparent flex flex-col h-screen overflow-y-auto relative">
        
        {/* Üst Bar */}
        <header className="h-[72px] flex items-center justify-between px-8 border-b border-gray-200 dark:border-[#1e232d] shrink-0 sticky top-0 bg-white/90 dark:bg-[#0b0d12]/90 backdrop-blur-sm z-10 transition-colors duration-200">
          <div className="flex items-center bg-gray-50 dark:bg-[#151921] rounded-full px-4 py-2 w-[480px] border border-gray-200 dark:border-[#2a2f3a] focus-within:border-blue-500 dark:focus-within:border-[#5c9dff] transition-colors">
            <FiSearch className="text-gray-400 dark:text-[#6b7280] text-[16px] mr-3" />
            <input 
              type="text" 
              placeholder="Search... (Enter for full results)" 
              className="bg-transparent border-none outline-none text-[13px] text-slate-900 dark:text-white w-full placeholder-gray-400 dark:placeholder-[#6b7280]"
            />
          </div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-[#848d9c]">
            
            {/* TEMA BUTONU */}
            <button 
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-[#1e232d] transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              {mounted ? (
                currentTheme === "dark" ? <FiSun className="text-[18px]" /> : <FiMoon className="text-[18px]" />
              ) : (
                <div className="w-[18px] h-[18px]"></div>
              )}
            </button>
            
            {/* BİLDİRİM (BELL) BUTONU (Dinamik) */}
            <Link 
              href="/dashboard/notifications" 
              className="relative p-2 rounded-full hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-[#1e232d] transition-colors flex items-center justify-center cursor-pointer"
            >
              <FiBell className="text-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-[#0b0d12]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {children}

        {/* ON-CLICK EKLENEN FLOATING ACTION BUTTON */}
        <button 
          onClick={() => setIsIssueModalOpen(true)}
          className="fixed bottom-10 right-10 w-14 h-14 bg-blue-600 dark:bg-[#5c9dff] text-white dark:text-[#0b0d12] rounded-full flex items-center justify-center hover:bg-blue-700 dark:hover:bg-[#4a8bee] transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-40 cursor-pointer"
        >
          <FiPlus className="text-[26px]" />
        </button>

        {/* GÖREV OLUŞTURMA MODALI */}
        {isIssueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-[#0b0d12]/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Create New Issue</h3>
                <button 
                  onClick={() => setIsIssueModalOpen(false)} 
                  className="text-gray-400 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <FiX className="text-[20px]" />
                </button>
              </div>
              
              <form className="space-y-5" onSubmit={handleCreateIssue}>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">Issue Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={issueTitle} 
                    onChange={(e) => setIssueTitle(e.target.value)} 
                    placeholder="What needs to be done?" 
                    className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff]" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">Description (optional)</label>
                  <textarea 
                    value={issueDescription} 
                    onChange={(e) => setIssueDescription(e.target.value)} 
                    placeholder="Add more details..." 
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] resize-none" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">Priority</label>
                    <select 
                      value={issuePriority} 
                      onChange={(e) => setIssuePriority(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] appearance-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">Column (Status) *</label>
                    <select 
                      value={issueStatus} 
                      onChange={(e) => setIssueStatus(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] appearance-none"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">Board (Project) *</label>
                  {isLoadingProjects ? (
                    <div className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-gray-500 dark:text-[#848d9c]">Yükleniyor...</div>
                  ) : (
                    <select 
                      value={selectedProjectId} 
                      onChange={(e) => setSelectedProjectId(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] appearance-none"
                    >
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.workspaceName} / {p.name}
                        </option>
                      ))}
                      {availableProjects.length === 0 && (
                        <option value="" disabled>Hiçbir proje bulunamadı</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1e232d] mt-2">
                  <button type="button" onClick={() => setIsIssueModalOpen(false)} className="px-4 py-2 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={!selectedProjectId} className="bg-blue-600 hover:bg-blue-700 dark:bg-[#5c9dff] dark:hover:bg-[#4a8bee] disabled:opacity-50 text-white dark:text-[#0b0d12] px-6 py-2 rounded-full font-bold text-[13px] transition-colors shadow-sm cursor-pointer">
                    Create Issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}