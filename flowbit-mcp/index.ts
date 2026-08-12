import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Spring Boot backend adresimiz
const API_URL = "http://localhost:8081/api/v1";

// Çalıştırmak için sisteme vereceğimiz yetki token'ı
// Bunu çalıştırırken ortam değişkeni olarak vereceğiz
const TOKEN = process.env.FLOWBIT_TOKEN;

if (!TOKEN) {
  console.error("HATA: FLOWBIT_TOKEN ortam değişkeni bulunamadı!");
  process.exit(1);
}

const server = new Server(
  {
    name: "flowbit-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// 1. YAPAY ZEKAYA HANGİ ARAÇLARI (TOOLS) KULLANABİLECEĞİNİ SÖYLÜYORUZ
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_issues",
        description: "Belirli bir projeye ait tüm görevleri (issues) getirir.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number", description: "Projenin ID numarası" },
          },
          required: ["projectId"],
        },
      },
      {
        name: "create_issue",
        description: "FlowBit sisteminde yeni bir görev oluşturur.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Görevin başlığı" },
            projectId: { type: "number", description: "Eklenecek projenin ID'si" },
            description: { type: "string", description: "Görev açıklaması (opsiyonel)" },
            assigneeEmail: { type: "string", description: "Atanacak kullanıcının e-postası (opsiyonel)" },
            priority: { type: "string", description: "Öncelik (Low, Medium, High)" },
          },
          required: ["title", "projectId"],
        },
      },
      {
        name: "update_issue",
        description: "Var olan bir görevin başlık/açıklama/öncelik/atanan kişisini günceller.",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "number", description: "Güncellenecek görevin ID'si" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", description: "Low, Medium, High" },
            assigneeEmail: { type: "string" },
          },
          required: ["issueId"],
        },
      },
      {
        name: "move_issue",
        description: "Bir görevin durumunu değiştirir (board'da sütun taşıma).",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "number" },
            status: { type: "string", description: 'Örn: "To Do", "In Progress", "in review", "Done"' },
          },
          required: ["issueId", "status"],
        },
      },
      {
        name: "create_project",
        description: "Bir workspace içinde yeni proje oluşturur.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: { type: "number" },
            name: { type: "string" },
          },
          required: ["workspaceId", "name"],
        },
      },
      {
        name: "invite_member",
        description: "Bir kullanıcıyı e-posta ile workspace'e davet eder (hedef kullanıcı sistemde kayıtlı olmalı).",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: { type: "number" },
            userEmail: { type: "string" },
            role: { type: "string", description: '"ADMIN" veya "MEMBER" (varsayılan MEMBER)' },
          },
          required: ["workspaceId", "userEmail"],
        },
      },
      {
        name: "create_cycle",
        description: "Bir projede yeni sprint/cycle oluşturur.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            name: { type: "string" },
            startDate: { type: "string", description: "YYYY-MM-DD" },
            endDate: { type: "string", description: "YYYY-MM-DD" },
          },
          required: ["projectId"],
        },
      },
      {
        name: "start_cycle",
        description: "Planlanan bir cycle'ı aktif eder.",
        inputSchema: {
          type: "object",
          properties: { cycleId: { type: "number" } },
          required: ["cycleId"],
        },
      },
      {
        name: "close_cycle",
        description: "Aktif bir cycle'ı kapatır.",
        inputSchema: {
          type: "object",
          properties: { cycleId: { type: "number" } },
          required: ["cycleId"],
        },
      },
      {
        name: "get_notifications",
        description: "Bir kullanıcının son bildirimlerini getirir.",
        inputSchema: {
          type: "object",
          properties: { email: { type: "string" } },
          required: ["email"],
        },
      },
      {
        name: "get_board",
        description: "Bir projenin Kanban board'unu (issue'lar status'e göre gruplu) getirir.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"],
        },
      },
      {
        name: "get_project_stats",
        description: "Bir projenin özet istatistiklerini (toplam, status/priority dağılımı) getirir.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"],
        },
      },
      {
        name: "create_issues",
        description: "Birden fazla issue'yu tek seferde oluşturur (1-100 arası). Backlog/PRD'den toplu görev oluşturmak için idealdir.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            issues: {
              type: "array",
              description: "Her biri { title, description?, assigneeEmail?, priority? } şeklinde nesneler",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  assigneeEmail: { type: "string" },
                  priority: { type: "string" },
                },
                required: ["title"],
              },
            },
          },
          required: ["projectId", "issues"],
        },
      },
      {
        name: "search_issues",
        description: "Başlık/açıklamada geçen metne göre issue arar.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            projectId: { type: "number", description: "Belirtilmezse TÜM sistemde arar (dikkat)" },
            assigneeEmail: { type: "string" },
            priority: { type: "string" },
          },
          required: ["query"],
        },
      },
      {
        name: "add_comment",
        description: "Bir issue'ya yorum ekler. Yorum sahibi olarak FLOWBIT_TOKEN'ın ait olduğu kullanıcı kaydedilir.",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "number" },
            content: { type: "string" },
          },
          required: ["issueId", "content"],
        },
      },
      {
        name: "assign_issue_to_cycle",
        description: "Bir issue'yu bir cycle'a (sprint'e) atar. cycleId olarak null gönderirsen issue cycle'dan çıkarılır.",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "number" },
            cycleId: { type: "number" },
          },
          required: ["issueId", "cycleId"],
        },
      },
    ],
  };
});

// 2. YAPAY ZEKA BU ARAÇLARI ÇAĞIRDIĞINDA NE YAPILACAĞINI TANIMLIYORUZ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOKEN}`,
  };

  try {
    const name = request.params.name;
    const args = request.params.arguments as any;

    if (name === "get_project_issues") {
      const response = await fetch(`${API_URL}/issues/project/${args.projectId}`, { headers });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "create_issue") {
      const { title, projectId, description = "", assigneeEmail = "", priority = "Medium" } = args;
      const response = await fetch(`${API_URL}/issues/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, projectId, description, assigneeEmail, priority }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Görev başarıyla oluşturuldu: ${JSON.stringify(data)}` }] };
    }

    if (name === "update_issue") {
      const { issueId, ...fields } = args;
      const response = await fetch(`${API_URL}/issues/${issueId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Görev güncellendi: ${JSON.stringify(data)}` }] };
    }

    if (name === "move_issue") {
      const { issueId, status } = args;
      const response = await fetch(`${API_URL}/issues/${issueId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Görev taşındı: ${JSON.stringify(data)}` }] };
    }

    if (name === "create_project") {
      const { workspaceId, name: projectName } = args;
      const response = await fetch(`${API_URL}/projects/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workspaceId, name: projectName }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Proje oluşturuldu: ${JSON.stringify(data)}` }] };
    }

    if (name === "invite_member") {
      const { workspaceId, userEmail, role = "MEMBER" } = args;
      const response = await fetch(`${API_URL}/workspaces/members/${workspaceId}/add`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userEmail, role }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Davet gönderildi: ${JSON.stringify(data)}` }] };
    }

    if (name === "create_cycle") {
      const { projectId, name: cycleName, startDate, endDate } = args;
      const response = await fetch(`${API_URL}/cycles/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId, name: cycleName, startDate, endDate }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Cycle oluşturuldu: ${JSON.stringify(data)}` }] };
    }

    if (name === "start_cycle") {
      const response = await fetch(`${API_URL}/cycles/${args.cycleId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "Active" }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Cycle aktif edildi: ${JSON.stringify(data)}` }] };
    }

    if (name === "close_cycle") {
      const response = await fetch(`${API_URL}/cycles/${args.cycleId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "Done" }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Cycle kapatıldı: ${JSON.stringify(data)}` }] };
    }

    if (name === "get_notifications") {
      const response = await fetch(`${API_URL}/notifications/user/${encodeURIComponent(args.email)}`, { headers });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "get_board") {
      const response = await fetch(`${API_URL}/boards/project/${args.projectId}`, { headers });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "get_project_stats") {
      const response = await fetch(`${API_URL}/dashboard/stats?projectId=${args.projectId}`, { headers });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "create_issues") {
      const { projectId, issues } = args;
      const results = [];
      for (const item of issues) {
        const response = await fetch(`${API_URL}/issues/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: item.title,
            projectId,
            description: item.description || "",
            assigneeEmail: item.assigneeEmail || "",
            priority: item.priority || "Medium",
          }),
        });
        results.push(await response.json());
      }
      return { content: [{ type: "text", text: `${results.length} görev oluşturuldu:\n${JSON.stringify(results, null, 2)}` }] };
    }

    if (name === "search_issues") {
      const { query, projectId, assigneeEmail, priority } = args;
      const params = new URLSearchParams({ query });
      if (projectId) params.set("projectId", String(projectId));
      if (assigneeEmail) params.set("assigneeEmail", assigneeEmail);
      if (priority) params.set("priority", priority);
      const response = await fetch(`${API_URL}/issues/search?${params.toString()}`, { headers });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "add_comment") {
      const { issueId, content } = args;
      const response = await fetch(`${API_URL}/comments/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ issueId, content }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Yorum eklendi: ${JSON.stringify(data)}` }] };
    }

    if (name === "assign_issue_to_cycle") {
      const { issueId, cycleId } = args;
      const response = await fetch(`${API_URL}/issues/${issueId}/cycle`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ cycleId }),
      });
      const data = await response.json();
      return { content: [{ type: "text", text: `Issue cycle'a atandı: ${JSON.stringify(data)}` }] };
    }

    throw new Error("Bilinmeyen bir araç çağrıldı.");
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Hata oluştu: ${error.message}` }],
    };
  }
});

// 3. MCP PROMPTS — hazır şablonlar, backend'e ihtiyaç duymaz.
// Bunlar LLM'e "şu formatta düşün/yaz" diyen hazır kalıplardır; veriyi
// (issueList, cycleReport vb.) çağıran taraf (Claude Desktop/Cursor) zaten
// diğer tool'lardan (get_board, get_project_stats...) topluyor.
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "break_prd_into_issues",
        description: "Bir PRD'yi aksiyona dönüştürülebilir issue'lara böler (create_issues ile birlikte kullanılır).",
        arguments: [
          { name: "prd", description: "PRD metninin tamamı", required: true },
          { name: "projectKey", description: "Issue başlıklarına eklenecek proje anahtarı (opsiyonel)", required: false },
        ],
      },
      {
        name: "summarize_cycle_risk",
        description: "Bir cycle'ın risklerini analiz eder ve öneriler sunar.",
        arguments: [
          { name: "cycleSummary", description: "get_project_stats/get_board çıktısından cycle özeti", required: true },
          { name: "issueList", description: "Cycle'daki issue'ların listesi (JSON)", required: true },
        ],
      },
      {
        name: "summarize_project_status",
        description: "Proje durumu özetini oluşturur.",
        arguments: [{ name: "projectSummary", description: "get_project_stats çıktısı", required: true }],
      },
      {
        name: "daily_standup",
        description: "Günlük standup güncellemesi oluşturur.",
        arguments: [
          { name: "userId", description: "Kullanıcının e-postası", required: true },
          { name: "projectSummary", description: "get_project_stats / get_board çıktısı", required: true },
        ],
      },
      {
        name: "sprint_retrospective",
        description: "Retrospektif konuşma başlıkları üretir.",
        arguments: [{ name: "cycleReport", description: "Kapanan cycle'ın özeti (issue'lar, durumları)", required: true }],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const templates: Record<string, () => string> = {
    break_prd_into_issues: () =>
      `Aşağıdaki PRD'yi oku ve aksiyona dönüştürülebilir issue'lara böl. Her issue için title, description ve priority (Low/Medium/High) öner${
        args.projectKey ? `, başlıkların başına "[${args.projectKey}]" ekle` : ""
      }. Sonucu create_issues tool'una verilebilecek bir JSON listesi olarak sun.\n\nPRD:\n${args.prd}`,

    summarize_cycle_risk: () =>
      `Aşağıdaki cycle özetini ve issue listesini incele. Zamanında bitmeme riski taşıyan issue'ları belirle, nedenini açıkla ve somut öneriler sun.\n\nCycle özeti:\n${args.cycleSummary}\n\nIssue listesi:\n${args.issueList}`,

    summarize_project_status: () =>
      `Aşağıdaki proje istatistiklerine göre kısa, yönetime sunulabilecek bir durum özeti yaz (2-3 paragraf, ilerleme, riskler, sıradaki adımlar).\n\n${args.projectSummary}`,

    daily_standup: () =>
      `${args.userId} için aşağıdaki proje verisine bakarak bir günlük standup güncellemesi yaz: dün ne tamamlandı, bugün ne yapılacak, herhangi bir engel var mı.\n\n${args.projectSummary}`,

    sprint_retrospective: () =>
      `Aşağıdaki kapanmış cycle raporuna göre bir retrospektif toplantısı için konuşma başlıkları üret: neler iyi gitti, neler geliştirilebilir, somut aksiyon maddeleri.\n\n${args.cycleReport}`,
  };

  const build = templates[name];
  if (!build) {
    throw new Error(`Bilinmeyen prompt: ${name}`);
  }

  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text: build() },
      },
    ],
  };
});

// Sunucuyu standart input/output üzerinden başlat
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("FlowBit MCP Sunucusu başarıyla başlatıldı!");
});