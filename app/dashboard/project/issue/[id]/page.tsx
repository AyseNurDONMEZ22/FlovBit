"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params?.id;

  const [issue, setIssue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State'leri (Anında güncellenebilmesi için)
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("Unassigned");

  useEffect(() => {
    if (issueId) fetchIssueDetails();
  }, [issueId]);

  const fetchIssueDetails = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:8081/api/v1/issues/${issueId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIssue(data);
        setStatus(data.status || "To Do");
        setPriority(data.priority || "Medium");
        setAssignee(data.assigneeEmail || "Unassigned");
      }
    } catch (error) {
      console.error("Görev detayları çekilemedi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    const token = localStorage.getItem("token");
    const updatedData = { [field]: value };

    // State'i anında güncelle (Optimistic UI)
    if (field === "status") setStatus(value);
    if (field === "priority") setPriority(value);
    if (field === "assigneeEmail") setAssignee(value);

    try {
      await fetch(`http://localhost:8081/api/v1/issues/${issueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(updatedData)
      });
      // Değişikliğin menülere yansıması için tetikleyici fırlat
      window.dispatchEvent(new Event("issueCreated"));
    } catch (error) {
      console.error("Güncelleme hatası:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:8081/api/v1/issues/${issueId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        window.dispatchEvent(new Event("issueCreated"));
        router.back(); // Silindikten sonra bir önceki sayfaya (Board'a) dön
      }
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Yükleniyor...</div>;
  if (!issue) return <div className="p-8 text-red-500">Görev bulunamadı.</div>;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("tr-TR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full font-sans transition-colors duration-200 pb-24">
      
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-[#64748b] mb-6">
        <Link href="/dashboard" className="hover:underline hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
        <span>/</span>
        <span className="cursor-pointer hover:underline hover:text-slate-900 dark:hover:text-white" onClick={() => router.back()}>Project Board</span>
        <span>/</span>
        <span className="text-slate-900 dark:text-[#e2e8f0] font-bold">#{issue.id} {issue.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL KOLON (Ana İçerik & Yorumlar) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* ÜST KART: Başlık ve Cycle */}
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 dark:text-[#848d9c] text-[13px] font-mono">#{issue.id}</span>
              <button className="text-blue-600 dark:text-[#5c9dff] text-[13px] font-bold hover:underline">Edit</button>
            </div>
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-[24px] font-bold text-slate-900 dark:text-white leading-tight">{issue.title}</h1>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-600' :
                priority.toLowerCase() === 'critical' ? 'bg-red-100 text-red-600' :
                'bg-purple-50 text-purple-600 dark:bg-[#2c1d3b] dark:text-[#a855f7]'
              }`}>
                {priority}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[12px] text-gray-500 dark:text-[#848d9c] mb-6">
              <span>Created: {formatDate(issue.createdAt)}</span>
              {issue.updatedAt && <span>Updated: {formatDate(issue.updatedAt)}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-slate-800 dark:text-[#e2e8f0]">Cycle</label>
              <select className="bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500">
                <option value="">No cycle</option>
              </select>
            </div>
          </div>

          {/* YORUMLAR KARTI */}
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-4">Comments <span className="text-gray-400 font-normal">(0)</span></h3>
            
            <div className="border border-dashed border-gray-200 dark:border-[#2a3140] rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6">
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-white mb-1">No comments yet</h4>
              <p className="text-[13px] text-gray-500 dark:text-[#848d9c]">Start the conversation below.</p>
            </div>

            <div className="border border-gray-200 dark:border-[#2a3140] rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors bg-gray-50 dark:bg-[#0b0d12]">
              <textarea 
                placeholder="Add a comment..." 
                rows={3}
                className="w-full bg-transparent p-4 text-[14px] text-slate-900 dark:text-white outline-none resize-none"
              />
              <div className="flex justify-end p-3 border-t border-gray-100 dark:border-[#1e232d] bg-white dark:bg-[#11141b]">
                <button className="bg-blue-600 hover:bg-blue-700 dark:bg-[#5c9dff] text-white dark:text-[#0b0d12] px-5 py-2 rounded-lg text-[13px] font-bold transition-colors">
                  Comment
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* SAĞ KOLON (Detaylar & Aksiyonlar) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] uppercase tracking-wider mb-5">Details</h3>
            
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-slate-600 dark:text-[#848d9c] font-medium">Status</label>
                <select 
                  value={status}
                  onChange={(e) => handleUpdate("status", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-lg px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-slate-600 dark:text-[#848d9c] font-medium">Assignee</label>
                <select 
                  value={assignee}
                  onChange={(e) => handleUpdate("assigneeEmail", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-lg px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value={localStorage.getItem("email") || ""}>Bana Ata</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] text-slate-600 dark:text-[#848d9c] font-medium">Priority</label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase">{priority}</span>
                </div>
                <select 
                  value={priority}
                  onChange={(e) => handleUpdate("priority", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-lg px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-slate-600 dark:text-[#848d9c] font-medium">Due Date</label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-lg px-3 py-2 text-[13px] text-slate-900 dark:text-white outline-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5 pb-4 border-b border-gray-100 dark:border-[#1e232d]">
                <label className="text-[12px] text-slate-600 dark:text-[#848d9c] font-medium">Labels</label>
                <span className="text-[13px] text-gray-400">No labels</span>
              </div>

              <div className="flex flex-col gap-2 text-[12px] text-gray-500 dark:text-[#848d9c]">
                <div className="flex justify-between"><span>Created</span> <span>{formatDate(issue.createdAt)}</span></div>
                {issue.updatedAt && <div className="flex justify-between"><span>Updated</span> <span>{formatDate(issue.updatedAt)}</span></div>}
              </div>

              <button 
                onClick={handleDelete}
                className="mt-2 w-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-[#3a1d1d] dark:text-[#f87171] dark:hover:bg-[#4a2525] py-2.5 rounded-lg text-[13px] font-bold transition-colors"
              >
                Delete Issue
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}