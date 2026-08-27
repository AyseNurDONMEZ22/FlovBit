"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ProjectSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectIdParam = searchParams.get("projectId");
  const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem("currentProjectId") : null;
  const currentProjectId = projectIdParam ? parseInt(projectIdParam) : (savedProjectId ? parseInt(savedProjectId) : null);

  useEffect(() => {
    if (currentProjectId) {
      fetchProjectDetails();
    } else {
      setIsLoading(false);
    }
  }, [currentProjectId]);

  const fetchProjectDetails = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/projects/${currentProjectId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setProject(await response.json());
      }
    } catch (error) {
      console.error("Proje yüklenirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  };

  const handleDeleteProject = () => {
    if (window.confirm("Bu projeyi tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
      alert("Proje silme işlemi için Backend API bekleniyor...");
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Yükleniyor...</div>;
  if (!project) return <div className="p-8 text-red-500">Geçerli bir proje bulunamadı. Lütfen Workspace üzerinden bir proje seçin.</div>;

  return (
    <div className="w-full h-full p-6 md:p-8 max-w-[800px] transition-colors duration-200">
      
      {/* Breadcrumb */}
      <div className="text-[13px] font-medium text-gray-500 dark:text-[#848d9c] mb-6">
        Dashboard / Project {currentProjectId} / Settings
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-8">
        Project Settings
      </h1>

      <div className="flex flex-col gap-6">
        
        {/* General Settings */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">General</h2>
            <button className="text-blue-600 dark:text-[#5c9dff] text-[13px] font-bold hover:underline">Edit</button>
          </div>

          <div className="grid grid-cols-1 gap-6 text-[14px]">
            <div>
              <span className="block text-gray-500 dark:text-[#848d9c] mb-1 font-medium">Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{project.name}</span>
            </div>
            
            <div>
              <span className="block text-gray-500 dark:text-[#848d9c] mb-1 font-medium">Key</span>
              <span className="bg-gray-100 dark:bg-[#1c2436] text-slate-900 dark:text-white font-mono font-bold px-2 py-1 rounded">
                {project.projectKey || "PROJ"}
              </span>
            </div>

            <div>
              <span className="block text-gray-500 dark:text-[#848d9c] mb-1 font-medium">Description</span>
              <span className="text-slate-800 dark:text-[#e2e8f0]">
                {project.description || "No description provided."}
              </span>
            </div>

            <div className="flex gap-12 border-t border-gray-100 dark:border-[#1e232d] pt-6 mt-2">
              <div>
                <span className="block text-gray-400 dark:text-[#64748b] text-[12px] mb-1">Created</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatDate(project.createdAt)}</span>
              </div>
              <div>
                <span className="block text-gray-400 dark:text-[#64748b] text-[12px] mb-1">Updated</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatDate(project.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Bağlantısı */}
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">Workspace</h2>
            <p className="text-gray-500 dark:text-[#848d9c] text-[13px]">This project belongs to Workspace ID: {project.workspaceId}</p>
          </div>
          <Link 
            href={`/dashboard/workspace/${project.workspaceId}`}
            className="text-blue-600 dark:text-[#5c9dff] text-[13px] font-bold hover:underline"
          >
            View Workspace
          </Link>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-6 mt-4">
          <h2 className="text-[16px] font-bold text-red-600 dark:text-red-500 mb-2">Danger Zone</h2>
          <p className="text-gray-600 dark:text-gray-400 text-[13px] mb-6">
            Permanently delete all project data, boards, issues, cycles, and comments. This action cannot be undone.
          </p>
          <button 
            onClick={handleDeleteProject}
            className="bg-white dark:bg-[#0b0d12] border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
          >
            Delete Project
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Ayarlar yükleniyor...</div>}>
      <ProjectSettingsContent />
    </Suspense>
  );
}