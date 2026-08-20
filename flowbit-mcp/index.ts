import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * FlovBit MCP Server — hem yerel (stdio) hem uzak/çoklu-kullanıcı (http) modda çalışır.
 *
 * STDIO modu (Claude Desktop/Cursor, tek kullanıcı, lokal):
 *   FLOWBIT_TOKEN=<jwt veya fb_ api key> npx tsx index.ts
 *
 * HTTP modu (Railway/Render'da host edilir, ÇOKLU kullanıcı):
 *   MCP_TRANSPORT=http npx tsx index.ts
 *   Her istek kendi Authorization: Bearer <API_KEY> header'ını taşır — global bir
 *   TOKEN yoktur, bu yüzden aynı anda birden fazla kullanıcı güvenle bağlanabilir.
 *
 * Ortam değişkenleri:
 *   FLOWBIT_API_BASE   backend adresi (varsayılan: http://localhost:8081/api/v1 —
 *                       PRODUCTION'DA MUTLAKA deploy edilen backend URL'ine ayarla!)
 *   FLOWBIT_TOKEN       sadece stdio modunda kullanılır
 *   PORT                http modunda dinlenecek port (Railway otomatik atar)
 */

const API_URL = process.env.FLOWBIT_API_BASE || "http://localhost:8081/api/v1";

/* ──────────────────────────── TOOL TANIMLARI ──────────────────────────── */

const TOOL_DEFINITIONS = [
  {
    name: "get_project_issues",
    description: "Belirli bir projeye ait tüm görevleri (issues) getirir.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "number", description: "Projenin ID numarası" } },
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
      properties: { workspaceId: { type: "number" }, name: { type: "string" } },
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
    inputSchema: { type: "object", properties: { cycleId: { type: "number" } }, required: ["cycleId"] },
  },
  {
    name: "close_cycle",
    description: "Aktif bir cycle'ı kapatır.",
    inputSchema: { type: "object", properties: { cycleId: { type: "number" } }, required: ["cycleId"] },
  },
  {
    name: "get_notifications",
    description: "Bir kullanıcının son bildirimlerini getirir.",
    inputSchema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] },
  },
  {
    name: "get_board",
    description: "Bir projenin Kanban board'unu (issue'lar status'e göre gruplu) getirir.",
    inputSchema: { type: "object", properties: { projectId: { type: "number" } }, required: ["projectId"] },
  },
  {
    name: "get_project_stats",
    description: "Bir projenin özet istatistiklerini (toplam, status/priority dağılımı) getirir.",
    inputSchema: { type: "object", properties: { projectId: { type: "number" } }, required: ["projectId"] },
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
    description: "Bir issue'ya yorum ekler. Yorum sahibi olarak isteği yapan token'ın ait olduğu kullanıcı kaydedilir.",
    inputSchema: {
      type: "object",
      properties: { issueId: { type: "number" }, content: { type: "string" } },
      required: ["issueId", "content"],
    },
  },
  {
    name: "assign_issue_to_cycle",
    description: "Bir issue'yu bir cycle'a (sprint'e) atar. cycleId olarak null gönderirsen issue cycle'dan çıkarılır.",
    inputSchema: {
      type: "object",
      properties: { issueId: { type: "number" }, cycleId: { type: "number" } },
      required: ["issueId", "cycleId"],
    },
  },
  {
    name: "get_cycle_summary",
    description: "Bir cycle'ın özetini getirir: issue sayısı, biten issue sayısı, kalan gün.",
    inputSchema: { type: "object", properties: { cycleId: { type: "number" } }, required: ["cycleId"] },
  },
];

/* ──────────────────────────── PROMPT TANIMLARI ──────────────────────────── */

const PROMPT_DEFINITIONS = [
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
      { name: "cycleSummary", description: "get_cycle_summary çıktısı", required: true },
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
];

const PROMPT_TEMPLATES: Record<string, (args: any) => string> = {
  break_prd_into_issues: (args) =>
    `Aşağıdaki PRD'yi oku ve aksiyona dönüştürülebilir issue'lara böl. Her issue için title, description ve priority (Low/Medium/High) öner${
      args.projectKey ? `, başlıkların başına "[${args.projectKey}]" ekle` : ""
    }. Sonucu create_issues tool'una verilebilecek bir JSON listesi olarak sun.\n\nPRD:\n${args.prd}`,
  summarize_cycle_risk: (args) =>
    `Aşağıdaki cycle özetini ve issue listesini incele. Zamanında bitmeme riski taşıyan issue'ları belirle, nedenini açıkla ve somut öneriler sun.\n\nCycle özeti:\n${args.cycleSummary}\n\nIssue listesi:\n${args.issueList}`,
  summarize_project_status: (args) =>
    `Aşağıdaki proje istatistiklerine göre kısa, yönetime sunulabilecek bir durum özeti yaz (2-3 paragraf, ilerleme, riskler, sıradaki adımlar).\n\n${args.projectSummary}`,
  daily_standup: (args) =>
    `${args.userId} için aşağıdaki proje verisine bakarak bir günlük standup güncellemesi yaz: dün ne tamamlandı, bugün ne yapılacak, herhangi bir engel var mı.\n\n${args.projectSummary}`,
  sprint_retrospective: (args) =>
    `Aşağıdaki kapanmış cycle raporuna göre bir retrospektif toplantısı için konuşma başlıkları üret: neler iyi gitti, neler geliştirilebilir, somut aksiyon maddeleri.\n\n${args.cycleReport}`,
};

/* ──────────────────────────── SERVER FACTORY ──────────────────────────── */
/* Her bağlantı (stdio: bir kere, http: her istek) kendi token'ıyla bir Server
   örneği alır — global mutable state yok, çoklu kullanıcı için güvenli. */

function createServer(token: string): Server {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const server = new Server(
    { name: "flowbit-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {}, prompts: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
        const response = await fetch(`${API_URL}/issues/${issueId}`, { method: "PUT", headers, body: JSON.stringify(fields) });
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

      if (name === "get_cycle_summary") {
        const response = await fetch(`${API_URL}/cycles/${args.cycleId}/summary`, { headers });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      throw new Error("Bilinmeyen bir araç çağrıldı.");
    } catch (error: any) {
      return { isError: true, content: [{ type: "text", text: `Hata oluştu: ${error.message}` }] };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPT_DEFINITIONS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const build = PROMPT_TEMPLATES[name];
    if (!build) {
      throw new Error(`Bilinmeyen prompt: ${name}`);
    }
    return { messages: [{ role: "user", content: { type: "text", text: build(args) } }] };
  });

  return server;
}

/* ──────────────────────────── TRANSPORT SEÇİMİ ──────────────────────────── */

async function main() {
  const transport = process.env.MCP_TRANSPORT || "stdio";

  if (transport === "stdio") {
    const token = process.env.FLOWBIT_TOKEN;
    if (!token) {
      console.error("HATA: FLOWBIT_TOKEN ortam değişkeni bulunamadı!");
      process.exit(1);
    }
    const server = createServer(token);
    const stdio = new StdioServerTransport();
    await server.connect(stdio);
    console.error("FlowBit MCP Sunucusu (stdio) başarıyla başlatıldı!");
    return;
  }

if (transport === "http") {
    const { default: express } = await import("express");
    const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");

    const app = express();
    app.use(express.json());

    const transports = new Map<string, any>();
    const servers = new Map<string, any>(); 

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    // 1. Cursor'ın ilk denediği deneysel POST metodunu temizce reddediyoruz (Log kirliliğini önler)
    app.post("/mcp", (_req, res) => {
      res.status(404).send("Lütfen SSE için GET /mcp kullanın.");
    });

    // 2. Cursor fallback yapıp GET ile asıl SSE bağlantısını kurar
    app.get("/mcp", async (req, res) => {
      const authHeader = req.headers["authorization"];
      if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authorization: Bearer <API_KEY> header'ı gerekli" });
        return;
      }
      const token = authHeader.substring(7);

      // Benzersiz oturum ID'si
      const sessionId = Math.random().toString(36).substring(2, 15);
      
      const server = createServer(token);
      
      // Query param yerine temiz URL kullanıyoruz (Proxy'lerde silinme riskine karşı)
      const sseTransport = new SSEServerTransport(`/messages/${sessionId}`, res);

      transports.set(sessionId, sseTransport);
      servers.set(sessionId, server);

      // HATA BURADAYDI: res.on("close") çok erken tetikleniyordu. req.on("close") kullanıyoruz.
      req.on("close", () => {
        sseTransport.close();
        server.close();
        transports.delete(sessionId);
        servers.delete(sessionId);
      });

      await server.connect(sseTransport);
    });

    // 3. Cursor komutları buraya POST eder
    app.post("/messages/:sessionId", async (req, res) => {
      const sessionId = req.params.sessionId;
      const sseTransport = transports.get(sessionId);

      if (!sseTransport) {
        res.status(404).send("Geçersiz veya kapanmış oturum");
        return;
      }

      await sseTransport.handlePostMessage(req, res);
    });

    const port = Number(process.env.PORT) || 3100;
    app.listen(port, () => {
      console.error(`FlowBit MCP Sunucusu (http) çalışıyor: http://localhost:${port}/mcp`);
    });
    return;
  }

  throw new Error(`Bilinmeyen MCP_TRANSPORT değeri: ${transport}`);
}

main().catch((err) => {
  console.error("FlowBit MCP server başlatılamadı:", err);
  process.exit(1);
});