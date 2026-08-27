"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ReportsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem("currentProjectId") : null;
  const currentProjectId = projectIdParam ? parseInt(projectIdParam) : (savedProjectId ? parseInt(savedProjectId) : null);

  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ekmek Kırıntısı (Breadcrumb) için isimler
  const workspaceName = typeof window !== 'undefined' ? localStorage.getItem("currentWorkspaceName") || "Workspace" : "Workspace";
  const projectName = typeof window !== 'undefined' ? localStorage.getItem("currentProjectName") || "Project" : "Project";

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/issues/project/${currentProjectId}`, {
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

  // --- METRİK HESAPLAMALARI ---
  const totalIssues = issues.length;
  
  // Dağılım Objeleri
  const statusDist: Record<string, number> = {};
  const priorityDist: Record<string, number> = {};
  const assigneeDist: Record<string, number> = {};

  issues.forEach(issue => {
    // Statü Dağılımı
    const status = issue.status || "To Do";
    statusDist[status] = (statusDist[status] || 0) + 1;
    
    // Öncelik Dağılımı
    const priority = issue.priority || "Medium";
    priorityDist[priority] = (priorityDist[priority] || 0) + 1;
    
    // Atanan Kişi Dağılımı
    const assignee = issue.assigneeEmail && issue.assigneeEmail !== "Unassigned" 
      ? issue.assigneeEmail.split('@')[0] 
      : "Unassigned";
    assigneeDist[assignee] = (assigneeDist[assignee] || 0) + 1;
  });

  const statusesCount = Object.keys(statusDist).length;
  const assigneesCount = Object.keys(assigneeDist).filter(a => a !== "Unassigned").length;
  const overdueCount = 0; 

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high": case "critical": return "bg-orange-500";
      case "medium": return "bg-purple-500";
      default: return "bg-blue-500";
    }
  };

  if (!currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Proje Seçilmedi</h2>
        <p className="text-gray-500 dark:text-[#848d9c]">Lütfen sol menüden veya Workspace üzerinden bir projeye giriş yapın.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-gray-500">Raporlar yükleniyor...</div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full font-sans transition-colors duration-200 pb-24 animate-in fade-in">
      
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-[#64748b] mb-6">
        <Link href="/dashboard" className="hover:underline hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
        <span>/</span>
        <span className="cursor-pointer hover:underline hover:text-slate-900 dark:hover:text-white">{workspaceName}</span>
        <span>/</span>
        <Link href={`/dashboard/project/overview?projectId=${currentProjectId}`} className="hover:underline hover:text-slate-900 dark:hover:text-white">{projectName}</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-[#e2e8f0] font-bold">Reports</span>
      </div>

      <h1 className="text-[28px] font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Project Reports</h1>

      {/* ÜST METRİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-[32px] font-black text-slate-900 dark:text-white leading-none">{totalIssues}</span>
          <span className="text-[12px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider">Total Issues</span>
        </div>
        
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-[32px] font-black text-red-600 leading-none">{overdueCount}</span>
          <span className="text-[12px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider">Overdue</span>
        </div>

        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-[32px] font-black text-slate-900 dark:text-white leading-none">{statusesCount}</span>
          <span className="text-[12px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider">Statuses</span>
        </div>

        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm flex flex-col gap-1">
          <span className="text-[32px] font-black text-blue-600 dark:text-[#5c9dff] leading-none">{assigneesCount}</span>
          <span className="text-[12px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider">Assignees</span>
        </div>
      </div>

      {/* GRAFİK KARTLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* STATUS DISTRIBUTION */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
          <h3 className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider mb-6">Status Distribution</h3>
          {Object.keys(statusDist).length === 0 ? (
            <p className="text-sm text-gray-400">Veri bulunamadı.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(statusDist).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{status}</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-[#1e232d] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 dark:bg-[#5c9dff] rounded-full transition-all duration-500" 
                      style={{ width: `${getPercentage(count, totalIssues)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRIORITY DISTRIBUTION */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
          <h3 className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider mb-6">Priority Distribution</h3>
          {Object.keys(priorityDist).length === 0 ? (
            <p className="text-sm text-gray-400">Veri bulunamadı.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(priorityDist).map(([priority, count]) => (
                <div key={priority}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[14px] font-semibold text-slate-900 dark:text-white uppercase">{priority}</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-[#1e232d] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getPriorityColor(priority)} rounded-full transition-all duration-500`} 
                      style={{ width: `${getPercentage(count, totalIssues)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VELOCITY OVERVIEW */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
          <h3 className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider mb-6">Velocity Overview</h3>
          <div className="flex items-center text-[14px] text-gray-500 dark:text-[#848d9c]">
            No cycle data yet
          </div>
        </div>

        {/* ASSIGNEE WORKLOAD */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
          <h3 className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider mb-6">Assignee Workload</h3>
          {Object.keys(assigneeDist).length === 0 ? (
            <p className="text-sm text-gray-400">Veri bulunamadı.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(assigneeDist).map(([assignee, count]) => (
                <div key={assignee}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{assignee}</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-[#1e232d] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 dark:bg-[#5c9dff] rounded-full transition-all duration-500" 
                      style={{ width: `${getPercentage(count, totalIssues)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10 text-gray-500">Raporlar yükleniyor...</div>}>
      <ReportsContent />
    </Suspense>
  );
}