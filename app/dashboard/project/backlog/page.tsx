"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiMenu } from "react-icons/fi";

// 1. Asıl içeriği ve mantığı barındıran yeni bileşenimiz
function BacklogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem("currentProjectId") : null;
  const currentProjectId = projectIdParam ? parseInt(projectIdParam) : (savedProjectId ? parseInt(savedProjectId) : null);

  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");

  const projectName = typeof window !== 'undefined' ? localStorage.getItem("currentProjectName") || "Default Project" : "Default Project";

  useEffect(() => {
    if (currentProjectId) {
      fetchProjectIssues();
    } else {
      setIsLoading(false);
    }
  }, [currentProjectId]);

  const fetchProjectIssues = async () => {
    const token = localStorage.getItem("token");
    if (!token || !currentProjectId) return;

    try {
      const response = await fetch(`http://localhost:8081/api/v1/issues/project/${currentProjectId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (err) {
      console.error("Görevler çekilemedi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (priorityFilter === "All Priorities") return true;
    return issue.priority === priorityFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": 
      case "critical": 
        return "bg-orange-50 text-orange-600 dark:bg-[#3a201d] dark:text-[#ff7b72]";
      case "medium": 
        return "bg-purple-50 text-purple-600 dark:bg-[#2c1d3b] dark:text-[#a855f7]";
      default: 
        return "bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]";
    }
  };

  const getAssigneeInitials = (email: string) => {
    if (!email || email === "Unassigned") return "-";
    return email.charAt(0).toUpperCase();
  };

  if (!currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Proje Seçilmedi</h2>
        <p className="text-gray-500 dark:text-[#848d9c]">Lütfen sol menüden veya Workspace üzerinden bir projeye giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full font-sans transition-colors duration-200 pb-24 animate-in fade-in">
      
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-[#64748b] mb-6">
        <Link href="/dashboard" className="hover:underline hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
        <span>/</span>
        <Link href={`/dashboard/project/overview?projectId=${currentProjectId}`} className="hover:underline hover:text-slate-900 dark:hover:text-white">{projectName}</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-[#e2e8f0] font-bold">Backlog</span>
      </div>

      {/* BAŞLIK VE FİLTRE */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Backlog</h1>
          <p className="text-[14px] text-gray-500 dark:text-[#848d9c] mt-1">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} in backlog
          </p>
        </div>

        <select 
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#2a3140] rounded-full px-4 py-2 text-[13px] font-medium text-slate-900 dark:text-[#e2e8f0] outline-none cursor-pointer shadow-sm hover:bg-gray-50 dark:hover:bg-[#1e232d] transition-colors"
        >
          <option value="All Priorities">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* BACKLOG TABLOSU */}
      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl shadow-sm overflow-hidden">
        
        <div className="flex items-center px-6 py-3 bg-gray-50/50 dark:bg-[#1e232d]/30 border-b border-gray-200 dark:border-[#1e232d] text-[11px] font-bold text-gray-400 dark:text-[#848d9c] uppercase tracking-wider">
          <div className="w-[80px] pl-8">ID</div>
          <div className="flex-1">Title</div>
          <div className="w-[120px] text-center">Priority</div>
          <div className="w-[100px] text-right">Assignee</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-[#848d9c] text-[13px]">Yükleniyor...</div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-[#848d9c] text-[14px]">Görev bulunamadı.</div>
        ) : (
          <div className="flex flex-col">
            {filteredIssues.map((issue) => (
              <div 
                key={issue.id} 
                onClick={() => router.push(`/dashboard/project/issue/${issue.id}`)}
                className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-[#1e232d] hover:bg-gray-50 dark:hover:bg-[#1e232d]/50 transition-colors cursor-pointer group"
              >
                <div className="w-[80px] flex items-center gap-3 text-gray-400 dark:text-[#64748b]">
                  <FiMenu className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                  <span className="text-[12px] font-mono">#{issue.id}</span>
                </div>
                
                <div className="flex-1 text-[14px] font-medium text-slate-900 dark:text-[#e2e8f0]">
                  {issue.title}
                </div>
                
                <div className="w-[120px] flex justify-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || "Low"}
                  </span>
                </div>
                
                <div className="w-[100px] flex justify-end">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-[#1c2436] border border-blue-100 dark:border-[#2a3140] flex items-center justify-center text-blue-600 dark:text-[#5c9dff] text-[11px] font-bold">
                    {getAssigneeInitials(issue.assigneeEmail)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 bg-white dark:bg-[#11141b] text-[12px] text-gray-400 dark:text-[#64748b]">
          Showing {filteredIssues.length} of {issues.length} issues
        </div>
      </div>

    </div>
  );
}

// 2. Sayfanın ana export'u artık Suspense ile sarılmış hali
export default function BacklogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full p-10 text-gray-500">
        Sayfa yükleniyor...
      </div>
    }>
      <BacklogContent />
    </Suspense>
  );
}