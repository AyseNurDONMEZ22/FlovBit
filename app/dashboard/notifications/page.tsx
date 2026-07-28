"use client";
import { useState, useEffect } from "react";
import { FiBell, FiCheck, FiCheckCircle } from "react-icons/fi";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    if (!token || !email) return;

    try {
      const response = await fetch(`http://localhost:8081/api/v1/notifications/user/${email}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Yeni bildirimlerin en üstte gelmesi için ters çeviriyoruz
        setNotifications(data.reverse());
      }
    } catch (error) {
      console.error("Bildirimler çekilemedi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    const token = localStorage.getItem("token");
    setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: true, isRead: true } : notif));
    try {
      await fetch(`http://localhost:8081/api/v1/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Bildirim güncellenemedi:", error);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    if (!token || !email) return;
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true, isRead: true })));
    try {
      await fetch(`http://localhost:8081/api/v1/notifications/user/${email}/read-all`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Bildirimler güncellenemedi:", error);
    }
  };

  // Daveti Kabul Etme Fonksiyonu
  const handleAcceptInvite = async (notificationId: number) => {
    const token = localStorage.getItem("token");
    
    // Güvenlik amaçlı: Kabul edilecek Workspace ID'sini alıyoruz (Gelecekte Notification objesinin içine eklenebilir)
    const wsId = prompt("Katılmak istediğiniz Workspace ID'sini doğrulayın:");
    if (!wsId) return;

    try {
      const res = await fetch(`http://localhost:8081/api/v1/workspaces/members/${wsId}/accept-invite`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        await markAsRead(notificationId); // Kabul edilince otomatik okundu yap
        alert("Daveti başarıyla kabul ettiniz! Artık çalışma alanına erişebilirsiniz.");
        fetchNotifications();
      } else {
        alert("Davet kabul edilirken bir hata oluştu. Doğru ID girdiğinizden emin olun.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    const isNotifRead = notif.read === true || notif.isRead === true;
    return activeTab === "unread" ? !isNotifRead : true;
  });

  const unreadCount = notifications.filter(n => !(n.read === true || n.isRead === true)).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", { 
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" 
    });
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300 pb-24 transition-colors duration-200">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-slate-900 dark:text-white text-[26px] font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-blue-100 dark:bg-[#5c9dff] text-blue-700 dark:text-[#0b0d12] text-[12px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-2 text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium transition-colors cursor-pointer">
              <FiCheckCircle size={16} /> Mark all as read
            </button>
          )}
          <div className="flex items-center p-1 bg-transparent border border-gray-200 dark:border-[#2a2f3a] rounded-full">
            <button onClick={() => setActiveTab("all")} className={`px-5 py-1.5 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${activeTab === "all" ? "bg-gray-200 dark:bg-[#26282b] text-slate-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>All</button>
            <button onClick={() => setActiveTab("unread")} className={`px-5 py-1.5 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${activeTab === "unread" ? "bg-gray-200 dark:bg-[#26282b] text-slate-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#848d9c] hover:text-slate-900 dark:hover:text-white"}`}>Unread</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500 dark:text-[#848d9c] text-center mt-20">Bildirimler yükleniyor...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl flex flex-col items-center justify-center h-[340px] shadow-sm dark:shadow-none transition-colors">
          <div className="w-[52px] h-[52px] bg-gray-100 dark:bg-[#1c2436] rounded-[16px] flex items-center justify-center mb-5">
            <FiBell className="text-gray-400 dark:text-[#848d9c] text-[22px]" />
          </div>
          <h3 className="text-slate-900 dark:text-white text-[15px] font-bold tracking-wide mb-1.5">
            {activeTab === "all" ? "No notifications yet" : "No unread notifications"}
          </h3>
          <p className="text-gray-500 dark:text-[#848d9c] text-[13px]">
            {activeTab === "all" ? "You'll see notifications here when something happens." : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotifications.map((notif) => {
            const isRead = notif.read === true || notif.isRead === true;
            return (
              <div key={notif.id} className={`flex items-start justify-between p-5 rounded-xl border transition-colors ${isRead ? "bg-gray-50 dark:bg-[#0b0d12] border-gray-200 dark:border-[#1e232d]" : "bg-white dark:bg-[#11141b] border-blue-200 dark:border-[#2a3140] shadow-sm dark:shadow-none"}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-1">{!isRead && <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-[#5c9dff]"></div>}</div>
                  <div className="flex flex-col gap-1">
                    <h4 className={`text-[15px] ${isRead ? "text-gray-600 dark:text-[#e2e8f0]" : "text-slate-900 dark:text-white font-bold"}`}>{notif.title}</h4>
                    <p className="text-gray-500 dark:text-[#848d9c] text-[14px] leading-relaxed">{notif.message}</p>
                    <span className="text-gray-400 dark:text-[#5e5f64] text-[12px] mt-1 font-mono">{formatDate(notif.createdAt)}</span>
                  </div>
                </div>
                
                {/* Sağ Taraf: Aksiyon Butonları */}
                <div className="flex items-center gap-3">
                  {/* Davet Bildirimiyse ve Okunmadıysa Kabul Et Butonu Çıkar */}
                  {!isRead && notif.title.includes("Davet") && (
                    <button 
                      onClick={() => handleAcceptInvite(notif.id)} 
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-[#5c9dff] dark:hover:bg-[#4a8bee] text-white dark:text-[#0b0d12] px-4 py-1.5 rounded-lg text-[12px] font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      Kabul Et
                    </button>
                  )}
                  
                  {!isRead && (
                    <button 
                      onClick={() => markAsRead(notif.id)} 
                      title="Okundu İşaretle"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-[#848d9c] hover:text-blue-600 dark:hover:text-[#5c9dff] hover:bg-blue-50 dark:hover:bg-[#1c2436] transition-colors cursor-pointer"
                    >
                      <FiCheck size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}