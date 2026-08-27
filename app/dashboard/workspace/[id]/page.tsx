"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiX, FiUserPlus, FiMail } from "react-icons/fi";
import Link from "next/link";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.id; 

  const [activeTab, setActiveTab] = useState("projects");
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceData();
    }
  }, [workspaceId]);

  const fetchWorkspaceData = async () => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    try {
      const wsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/user/${email}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const currentWs = wsData.find((w: any) => w.id === parseInt(workspaceId as string));
        setWorkspace(currentWs);
      }

      const projRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/projects/workspace/${workspaceId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (projRes.ok) {
        setProjects(await projRes.json());
      }

      const memRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (memRes.ok) {
        setMembers(await memRes.json());
      }
    } catch (err) {
      console.error("Veriler yüklenemedi", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitBtn = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = true;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          workspaceId: workspaceId 
        })
      });

      if (response.ok) {
        setIsCreatingProject(false);
        setProjectName("");
        setProjectDesc("");
        const projRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/projects/workspace/${workspaceId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (projRes.ok) setProjects(await projRes.json());
      } else {
        alert("Proje oluşturulamadı.");
      }
    } catch (error) {
      console.error("Proje oluşturma hatası:", error);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: inviteEmail,
          role: "MEMBER"
        })
      });

      if (response.ok) {
        setInviteEmail("");
        const memRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (memRes.ok) setMembers(await memRes.json());
      } else {
        alert("Kullanıcı eklenemedi veya zaten mevcut.");
      }
    } catch (error) {
      console.error("Üye ekleme hatası:", error);
    }
  };

  const handleRemoveMember = async (emailToRemove: string) => {
    if (!window.confirm(`${emailToRemove} adresini çalışma alanından çıkarmak istediğinize emin misiniz?`)) return;
    
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}/remove/${emailToRemove}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        const memRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (memRes.ok) setMembers(await memRes.json());
      } else {
        alert("Üye çıkarılırken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Üye çıkarma hatası:", error);
    }
  };

  const handleUpdateRole = async (emailToUpdate: string, newRole: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}/update-role/${emailToUpdate}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
          const memRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/v1/workspaces/members/${workspaceId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (memRes.ok) setMembers(await memRes.json());
      }
    } catch (error) {
      console.error("Rol güncelleme hatası:", error);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Yükleniyor...</div>;

  return (
    <div className="p-8 max-w-[1100px] mx-auto w-full pb-24 font-sans transition-colors duration-200">
      
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-[#64748b] mb-6">
        <Link href="/dashboard" className="hover:underline hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-[#e2e8f0] font-bold">{workspace?.name || "Workspace"}</span>
      </div>

      {/* WORKSPACE BAŞLIĞI VE BADGE */}
      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-slate-900 dark:text-white text-[28px] font-bold tracking-tight">{workspace?.name || "Workspace"}</h1>
        <span className="bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1">
          Admin
        </span>
      </div>

      {/* 2'Lİ ÖZET KARTLARI */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm dark:shadow-none">
          <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">Projects</span>
          <div className="text-[36px] font-bold text-slate-900 dark:text-white mt-1 leading-none">{projects.length}</div>
        </div>
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm dark:shadow-none">
          <span className="text-gray-500 dark:text-[#848d9c] text-[11px] font-bold tracking-wider uppercase">Recent Activities</span>
          <div className="text-[36px] font-bold text-slate-900 dark:text-white mt-1 leading-none">10</div>
        </div>
      </div>

      {/* SEKMELER */}
      <div className="flex items-center gap-8 border-b border-gray-200 dark:border-[#1e232d] mb-8 text-[14px] font-semibold">
        <button 
          onClick={() => setActiveTab("projects")}
          className={`pb-3 border-b-2 transition-colors ${activeTab === "projects" ? "text-blue-600 dark:text-[#5c9dff] border-blue-600 dark:border-[#5c9dff]" : "text-gray-500 dark:text-[#848d9c] border-transparent hover:text-slate-900 dark:hover:text-white"}`}
        >
          Projects
        </button>
        <button 
          onClick={() => setActiveTab("members")}
          className={`pb-3 border-b-2 transition-colors ${activeTab === "members" ? "text-blue-600 dark:text-[#5c9dff] border-blue-600 dark:border-[#5c9dff]" : "text-gray-500 dark:text-[#848d9c] border-transparent hover:text-slate-900 dark:hover:text-white"}`}
        >
          Members
        </button>
      </div>

      {/* --- PROJECTS SEKMESİ --- */}
      {activeTab === "projects" && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-slate-900 dark:text-white text-[20px] font-bold">Projects</h2>
            {!isCreatingProject && (
              <button 
                onClick={() => setIsCreatingProject(true)}
                className="bg-blue-600 dark:bg-[#5c9dff] text-white dark:text-[#0b0d12] px-5 py-2.5 rounded-full font-bold text-[13px] hover:bg-blue-700 dark:hover:bg-[#4a8bee] transition-colors shadow-sm cursor-pointer"
              >
                New Project
              </button>
            )}
          </div>

          {/* NEW PROJECT FORMU */}
          {isCreatingProject && (
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 mb-8 shadow-sm transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-slate-900 dark:text-white font-bold text-[18px]">Projects</h3>
                <button 
                  onClick={() => setIsCreatingProject(false)} 
                  className="px-4 py-1.5 border border-gray-200 dark:border-[#2a2f3a] rounded-full text-[13px] font-bold text-gray-600 dark:text-[#848d9c] hover:bg-gray-50 dark:hover:bg-[#1c2436] transition-colors"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-5">
                <div>
                  <label className="block text-gray-500 dark:text-[#848d9c] text-[13px] font-semibold mb-1.5">Project Name</label>
                  <input 
                    type="text" 
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Project" 
                    className="w-full bg-transparent border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 dark:text-[#848d9c] text-[13px] font-semibold mb-1.5">Description (optional)</label>
                  <textarea 
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="What is this project about?" 
                    rows={2}
                    className="w-full bg-transparent border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] resize-none transition-colors"
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="bg-blue-600 dark:bg-[#5c9dff] text-white dark:text-[#0b0d12] px-6 py-2.5 rounded-full text-[14px] font-bold hover:bg-blue-700 dark:hover:bg-[#4a8bee] transition-colors shadow-sm cursor-pointer"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PROJE KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div 
                key={proj.id} 
                onClick={() => {
                  // HAFIZAYA KAYDET VE MENÜYÜ GÜNCELLE
                  localStorage.setItem("currentProjectId", proj.id.toString());
                  localStorage.setItem("currentProjectName", proj.name);
                  window.dispatchEvent(new Event("projectChanged"));
                  
                  router.push(`/dashboard/project/overview?projectId=${proj.id}`);
                }}
                className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] hover:border-blue-400 dark:hover:border-[#5c9dff] rounded-2xl p-6 cursor-pointer shadow-sm dark:shadow-none transition-all group"
              >
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-slate-900 dark:text-white font-bold text-[18px] group-hover:text-blue-600 dark:group-hover:text-[#5c9dff] transition-colors">{proj.name}</h3>
                  <span className="bg-gray-100 dark:bg-[#1c2436] text-gray-500 dark:text-[#848d9c] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {proj.projectKey || "PROJ-KEY"}
                  </span>
                </div>
                <p className="text-gray-400 dark:text-[#64748b] text-[13px] font-medium">Created 7/27/2026</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MEMBERS SEKMESİ --- */}
      {activeTab === "members" && (
        <div className="animate-in fade-in duration-300 flex flex-col gap-8">
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <h2 className="text-slate-900 dark:text-white text-[16px] font-bold mb-4">Invite Team Members</h2>
            <form onSubmit={handleInviteMember} className="flex items-end gap-4">
              <div className="flex-1 relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address" 
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a2f3a] rounded-xl pl-11 pr-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-[#0b0d12] px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer">
                <FiUserPlus /> Send Invite
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-slate-900 dark:text-white text-[18px] font-bold mb-4">Current Members</h2>
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl shadow-sm overflow-hidden">
              {members.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-[#848d9c] text-[13px]">Burada henüz kimse yok.</div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#1e232d]">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-5">
                      
                      {/* Kullanıcı Avatar ve E-posta */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-[#1c2436] text-blue-600 dark:text-[#5c9dff] rounded-full flex items-center justify-center font-bold text-[14px] uppercase">
                          {member.userEmail.charAt(0)}
                        </div>
                        <span className="text-slate-900 dark:text-white font-bold text-[14px]">{member.userEmail}</span>
                      </div>
                      
                      {/* Dinamik Rol Menüsü ve Silme Butonu */}
                      <div className="flex items-center gap-4">
                        <select
                          value={member.role || "MEMBER"}
                          onChange={(e) => handleUpdateRole(member.userEmail, e.target.value)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider outline-none cursor-pointer border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
                            member.role === 'ADMIN' ? 'bg-blue-50 text-blue-600 dark:bg-[#1c2436] dark:text-[#5c9dff]' :
                            member.role === 'EDITOR' ? 'bg-purple-50 text-purple-600 dark:bg-[#2c1d3b] dark:text-[#a855f7]' :
                            member.role === 'VIEWER' ? 'bg-amber-50 text-amber-600 dark:bg-[#2d2305] dark:text-[#f59e0b]' :
                            'bg-gray-100 text-gray-600 dark:bg-[#1e232d] dark:text-[#848d9c]'
                          }`}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="EDITOR">Editor</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        
                        {member.role !== 'ADMIN' && (
                          <button 
                            onClick={() => handleRemoveMember(member.userEmail)}
                            className="text-[12px] font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}