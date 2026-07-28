"use client";
import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
// DİNAMİK ID İÇİN EKLENDİ
import { useSearchParams } from "next/navigation"; 

// API'den dönecek verinin tipi
interface Cycle {
  id: number;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: string;
  projectId: number;
}

export default function CyclesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State'leri
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  // Önce URL'e bak, yoksa localStorage'a bak
  const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem("currentProjectId") : null;
  const currentProjectId = projectIdParam ? parseInt(projectIdParam) : (savedProjectId ? parseInt(savedProjectId) : null);

  // Sayfa yüklendiğinde VEYA projectId değiştiğinde Cycle'ları getir
  useEffect(() => {
    if (currentProjectId) {
      fetchCycles();
    } else {
      setIsLoading(false); // ID yoksa yükleniyor durumundan çık
    }
  }, [currentProjectId]);

  const fetchCycles = async () => {
    if (!currentProjectId) return; // ID yoksa istek atma
    const token = localStorage.getItem("token");
    try {
      // DİNAMİK ID KULLANILIYOR
      const response = await fetch(`http://localhost:8081/api/v1/cycles/project/${currentProjectId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCycles(data);
      }
    } catch (error) {
      console.error("Cycles yüklenirken hata oluştu:", error);
    } finally {
      setIsLoading(false);
    }
  };

 const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProjectId) return alert("Proje ID bulunamadı, işlem yapılamaz.");
    if (!name || !startDate || !endDate) return alert("Lütfen zorunlu alanları doldurun.");

    // ÇİFT TIKLAMAYI ÖNLEMEK İÇİN BUTONU KİLİTLE
    const submitBtn = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = true;

    const token = localStorage.getItem("token");
    const newCycle = {
      name, goal, startDate, endDate,
      projectId: currentProjectId,
      status: "Planning" 
    };

    try {
      const response = await fetch("http://localhost:8081/api/v1/cycles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newCycle),
      });

      if (response.ok) {
        setName(""); setGoal(""); setStartDate(""); setEndDate("");
        setIsModalOpen(false);
        fetchCycles();
      } else {
        alert("Cycle oluşturulurken sunucu hatası meydana geldi.");
      }
    } catch (error) {
      console.error("Cycle oluşturulurken hata oluştu:", error);
    } finally {
      // İŞLEM BİTİNCE BUTONUN KİLİDİNİ AÇ
      if (submitBtn) submitBtn.disabled = false;
    }
  };
  

  // Cycle Durumunu Güncelleme Fonksiyonu (Planning -> Active -> Closed)
  const handleUpdateStatus = async (id: number, newStatus: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:8081/api/v1/cycles/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchCycles(); // Listeyi güncelle
      } else {
        alert("Durum güncellenirken hata oluştu.");
      }
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  // Tarihleri DD.MM.YYYY formatına çevirir
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  };

  // Başlangıç, bitiş ve bugünün tarihine göre % ilerleme hesaplar
  const calculateProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const now = new Date().getTime(); 

    if (now <= startDate) return 0;
    if (now >= endDate) return 100;

    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    
    return Math.round((elapsed / totalDuration) * 100);
  };

  // EĞER PROJE ID URL'DE YOKSA UYARI VER (Güvenlik Önlemi)
  if (!currentProjectId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-10">
        <h2 className="text-xl font-bold text-red-500 mb-2">Hata: Proje Seçilmedi</h2>
        <p className="text-gray-500">Lütfen önce Dashboard üzerinden bir projeye tıklayın.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 md:p-8 max-w-[1000px] mx-auto transition-colors duration-200">
      
      {/* Breadcrumb */}
      <div className="text-[13px] font-medium text-gray-500 dark:text-[#848d9c] mb-2">
        Dashboard / Project {currentProjectId} / Cycles
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            Cycles
          </h1>
          <p className="text-[14px] text-gray-500 dark:text-[#848d9c]">
            {cycles.length} cycle
          </p>
        </div>

        {/* New Cycle Butonu */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-[#5c9dff] dark:hover:bg-[#4a8bee] text-white dark:text-[#0b0d12] px-5 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-sm w-max cursor-pointer"
        >
          New Cycle
        </button>
      </div>

      {/* Loading veya Liste/Boş Durum Gösterimi */}
      {isLoading ? (
        <div className="flex justify-center p-10 text-gray-500 dark:text-[#848d9c]">Yükleniyor...</div>
      ) : cycles.length === 0 ? (
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl shadow-sm dark:shadow-none p-16 flex flex-col items-center justify-center text-center transition-colors">
          <div className="w-16 h-16 bg-gray-50 dark:bg-[#1c2436] rounded-full flex items-center justify-center mb-5 border border-gray-100 dark:border-transparent">
            <svg className="w-7 h-7 text-gray-400 dark:text-[#5c9dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">
            No Cycles Yet
          </h3>
          <p className="text-[14px] text-gray-500 dark:text-[#848d9c] max-w-sm">
            Create your first cycle to start tracking progress.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {cycles.map((cycle) => {
            const progress = calculateProgress(cycle.startDate, cycle.endDate);
            const isClosed = cycle.status?.toUpperCase() === 'CLOSED';
            const isActive = cycle.status?.toUpperCase() === 'ACTIVE';

            return (
              <div key={cycle.id} className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] p-6 rounded-2xl shadow-sm dark:shadow-none transition-colors">
                
                <div className="flex justify-between items-start">
                  
                  {/* Sol Kısım: Başlık, Durum, Hedef ve Tarih */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">{cycle.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isActive ? 'text-green-700 bg-green-100 dark:text-[#22c55e] dark:bg-[#22c55e]/10' :
                        isClosed ? 'text-gray-600 bg-gray-100 dark:text-[#848d9c] dark:bg-[#1e232d]' :
                        'text-blue-700 bg-blue-100 dark:text-[#5c9dff] dark:bg-[#5c9dff]/10'
                      }`}>
                        {cycle.status || 'PLANNING'}
                      </span>
                    </div>
                    
                    {cycle.goal && (
                      <p className="text-[14px] text-gray-600 dark:text-[#e2e8f0] font-medium mb-3">
                        {cycle.goal}
                      </p>
                    )}
                    
                    <div className="text-[13px] font-medium text-gray-400 dark:text-[#64748b] tracking-wide mb-6">
                      {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                    </div>
                  </div>

                  {/* Sağ Kısım: Aksiyon Butonu */}
                  {!isClosed && (
                    <button 
                      onClick={() => handleUpdateStatus(cycle.id, isActive ? 'Closed' : 'Active')}
                      className={`px-5 py-2 rounded-full text-[13px] font-bold transition-colors shadow-sm cursor-pointer ${
                        isActive 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-[#ef4444]/10 dark:text-[#ef4444] dark:hover:bg-[#ef4444]/20 border border-red-100 dark:border-transparent' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-[#5c9dff]/10 dark:text-[#5c9dff] dark:hover:bg-[#5c9dff]/20 border border-blue-100 dark:border-transparent'
                      }`}
                    >
                      {isActive ? 'Close' : 'Start'}
                    </button>
                  )}
                </div>

                {/* Alt Kısım: Progress Bar */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2.5 bg-gray-100 dark:bg-[#1e232d] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isClosed ? 'bg-gray-400 dark:bg-[#5e5f64]' : 'bg-green-500 dark:bg-[#22c55e]'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-[13px] font-bold text-gray-500 dark:text-[#848d9c] w-8 text-right">
                    {progress}%
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* New Cycle Modal (Açılır Pencere) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-[#0b0d12]/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative transition-colors">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Create Cycle</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FiX className="text-[20px]" />
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleCreateCycle}>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">
                  Cycle Name <span className="text-blue-600 dark:text-[#5c9dff]">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 24" 
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">
                  Goal <span className="text-gray-400 dark:text-[#64748b] font-normal">(optional)</span>
                </label>
                <input 
                  type="text" 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What will this cycle achieve?" 
                  className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">
                    Start Date <span className="text-blue-600 dark:text-[#5c9dff]">*</span>
                  </label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#e2e8f0] mb-1.5">
                    End Date <span className="text-blue-600 dark:text-[#5c9dff]">*</span>
                  </label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0b0d12] border border-gray-200 dark:border-[#2a3140] rounded-xl px-4 py-2.5 text-[14px] text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-[#5c9dff] transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-[#5c9dff] dark:hover:bg-[#4a8bee] text-white dark:text-[#0b0d12] px-6 py-2 rounded-full font-bold text-[13px] transition-colors shadow-sm cursor-pointer"
                >
                  Create Cycle
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}