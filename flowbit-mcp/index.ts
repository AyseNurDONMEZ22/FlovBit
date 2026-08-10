import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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
            priority: { type: "string", description: "Öncelik (Low, Medium, High, Critical)" },
          },
          required: ["title", "projectId"],
        },
      }
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
    if (request.params.name === "get_project_issues") {
      const { projectId } = request.params.arguments as any;
      const response = await fetch(`${API_URL}/issues/project/${projectId}`, { headers });
      const data = await response.json();
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    if (request.params.name === "create_issue") {
      const { title, projectId, priority = "Medium" } = request.params.arguments as any;
      
      const response = await fetch(`${API_URL}/issues/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          projectId,
          priority,
          status: "To Do"
        }),
      });
      const data = await response.json();

      return {
        content: [{ type: "text", text: `Görev başarıyla oluşturuldu: ${JSON.stringify(data)}` }],
      };
    }

    throw new Error("Bilinmeyen bir araç çağrıldı.");
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Hata oluştu: ${error.message}` }],
    };
  }
});

// Sunucuyu standart input/output üzerinden başlat
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("FlowBit MCP Sunucusu başarıyla başlatıldı!");
});