"use client";
import { useState, useEffect } from "react";
import { FiCopy, FiCheck, FiChevronDown, FiPlay, FiLoader } from "react-icons/fi";

/* ────────────────────────────────────────────────────────────────
   Backend: Spring Boot, prefix /api/v1, port 8081.
   CORS (SecurityConfig.java) sadece http://localhost:3000'e izinli.
   İzinli metotlar: GET, POST, PUT, DELETE (PATCH yok).
   Login cevabı: { message, token }.

   CYCLE alanları: CycleController'da sadece projectId ve status
   kesin (repository + service'ten teyitli). "name", "startDate",
   "endDate" TAHMİN — Cycle.java entity'sini paylaşırsan kesinleştiririm.

   Board / Dashboard: BoardController.java + DashboardController.java
   eklendi ve derleniyor. Cycle activate/close ayrı endpoint değil,
   PUT /cycles/{id}/status ile yapılıyor. Issue↔Cycle bağlantısı
   (assign_issue_to_cycle) henüz yok, şimdilik gerekmiyor.
   MCP: flowbit-mcp/index.ts henüz stub — MCP Tools sekmesindeki
   "Hazır" etiketli tool'lar mevcut REST endpoint'lerini sarar,
   "Planlanan" olanlar backend'de karşılığı olmadığı için henüz
   yazılamaz. Uzak (hosted) MCP + API Key yönetimi de yok.
──────────────────────────────────────────────────────────────── */
const API_PREFIX = "/api/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type EnvKey = "workspaceId" | "projectId" | "userId" | "issueId" | "notificationId" | "cycleId";

interface ParamDef {
  name: string;
  label: string;
  defaultFrom?: EnvKey;
  placeholder?: string;
}

interface Endpoint {
  id: string;
  method: Method;
  path: string;
  desc: string;
  authRequired: boolean;
  params?: ParamDef[];
  query?: ParamDef[];
  body?: (env: EnvData) => Record<string, unknown>; // canlı env'e göre üretilir
  captureFrom?: { envKey: EnvKey; jsonPath: string };
}

interface EnvData {
  baseUrl: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  issueId: string;
  notificationId: string;
  cycleId: string;
  token: string;
}

const methodStyles: Record<Method, string> = {
  GET: "text-blue-600 dark:text-[#5c9dff] bg-blue-50 dark:bg-[#1c2436]",
  POST: "text-green-600 dark:text-[#22c55e] bg-green-50 dark:bg-[#122019]",
  PUT: "text-amber-600 dark:text-[#f59e0b] bg-amber-50 dark:bg-[#241d0f]",
  DELETE: "text-red-600 dark:text-[#ef4444] bg-red-50 dark:bg-[#240f0f]",
};

const num = (v: string) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : v);

// JWT'nin payload'ını (imza doğrulamadan, sadece görüntü amaçlı) çözüp "sub" (email) alanını döner.
function decodeJwtEmail(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/* ──────────────────────────── ENDPOINT VERİSİ ──────────────────────────── */
const categories: { title: string; endpoints: Endpoint[] }[] = [
  {
    title: "Auth",
    endpoints: [
      {
        id: "auth-register",
        method: "POST",
        path: "/auth/register",
        desc: "Register new user",
        authRequired: false,
        body: (env) => ({ username: "testuser", email: env.userId, password: "password123" }),
      },
      {
        id: "auth-login",
        method: "POST",
        path: "/auth/login",
        desc: "Login with email/password — returns { message, token }",
        authRequired: false,
        body: (env) => ({ email: env.userId, password: "password123" }),
      },
    ],
  },
  {
    title: "Users",
    endpoints: [
      {
        id: "user-update-profile",
        method: "POST",
        path: "/users/update-profile",
        desc: "Update display name / avatar",
        authRequired: true,
        body: (env) => ({ email: env.userId, name: "New Name", avatarUrl: "" }),
      },
      {
        id: "user-change-password",
        method: "POST",
        path: "/users/change-password",
        desc: "Change password (fails for Google/OAuth users)",
        authRequired: true,
        body: (env) => ({ email: env.userId, currentPassword: "password123", newPassword: "newpassword456" }),
      },
    ],
  },
  {
    title: "Workspaces",
    endpoints: [
      {
        id: "ws-create",
        method: "POST",
        path: "/workspaces/create",
        desc: "Create workspace (creator becomes ADMIN) — Workspace ID otomatik yakalanır",
        authRequired: true,
        body: (env) => ({ name: "My Workspace", email: env.userId }),
        captureFrom: { envKey: "workspaceId", jsonPath: "id" },
      },
      {
        id: "ws-list",
        method: "GET",
        path: "/workspaces/user/{email}",
        desc: "List workspaces the user belongs to",
        authRequired: true,
        params: [{ name: "email", label: "Email", defaultFrom: "userId" }],
      },
    ],
  },
  {
    title: "Workspace Members",
    endpoints: [
      {
        id: "wm-list",
        method: "GET",
        path: "/workspaces/members/{workspaceId}",
        desc: "List members (admin or member only)",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
      },
      {
        id: "wm-add",
        method: "POST",
        path: "/workspaces/members/{workspaceId}/add",
        desc: "Invite member — admin only, sets status PENDING. Hedef e-posta sistemde kayıtlı olmalı.",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
        body: () => ({ userEmail: "friend@example.com", role: "MEMBER" }),
      },
      {
        id: "wm-accept",
        method: "PUT",
        path: "/workspaces/members/{workspaceId}/accept-invite",
        desc: "Accept invite for current (authenticated) user",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
      },
      {
        id: "wm-remove",
        method: "DELETE",
        path: "/workspaces/members/{workspaceId}/remove/{email}",
        desc: "Remove member — admin only",
        authRequired: true,
        params: [
          { name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" },
          { name: "email", label: "Member email (gerçek, kayıtlı bir e-posta gir)", placeholder: "friend@example.com" },
        ],
      },
      {
        id: "wm-role",
        method: "PUT",
        path: "/workspaces/members/{workspaceId}/update-role/{email}",
        desc: "Update member role — admin only",
        authRequired: true,
        params: [
          { name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" },
          { name: "email", label: "Member email (gerçek, kayıtlı bir e-posta gir)", placeholder: "friend@example.com" },
        ],
        body: () => ({ role: "ADMIN" }),
      },
    ],
  },
  {
    title: "Projects",
    endpoints: [
      {
        id: "proj-create",
        method: "POST",
        path: "/projects/create",
        desc: "Create project — Project ID otomatik yakalanır. Üstteki Workspace ID'de ADMIN/member olmalısın.",
        authRequired: true,
        body: (env) => ({ name: "New Project", workspaceId: num(env.workspaceId) }),
        captureFrom: { envKey: "projectId", jsonPath: "id" },
      },
      {
        id: "proj-by-ws",
        method: "GET",
        path: "/projects/workspace/{workspaceId}",
        desc: "List projects in a workspace",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
      },
      {
        id: "proj-get",
        method: "GET",
        path: "/projects/{id}",
        desc: "Get project by id",
        authRequired: true,
        params: [{ name: "id", label: "Project ID", defaultFrom: "projectId" }],
      },
      {
        id: "proj-delete",
        method: "DELETE",
        path: "/projects/{id}",
        desc: "Delete project",
        authRequired: true,
        params: [{ name: "id", label: "Project ID", defaultFrom: "projectId" }],
      },
    ],
  },
  {
    title: "Issues",
    endpoints: [
      {
        id: "issue-create",
        method: "POST",
        path: "/issues/create",
        desc: "Create issue — Issue ID otomatik yakalanır",
        authRequired: true,
        body: (env) => ({ title: "My first issue", description: "", projectId: num(env.projectId), assigneeEmail: "" }),
        captureFrom: { envKey: "issueId", jsonPath: "id" },
      },
      {
        id: "issue-by-project",
        method: "GET",
        path: "/issues/project/{projectId}",
        desc: "List issues for a project",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
      },
      {
        id: "issue-get",
        method: "GET",
        path: "/issues/{id}",
        desc: "Get issue by id",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
      },
      {
        id: "issue-update",
        method: "PUT",
        path: "/issues/{id}",
        desc: "Update issue fields (partial)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: () => ({ title: "Updated title", priority: "High" }),
      },
      {
        id: "issue-status",
        method: "PUT",
        path: "/issues/{id}/status",
        desc: "Update only the status (drag & drop on board)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: () => ({ status: "In Progress" }),
      },
      {
        id: "issue-delete",
        method: "DELETE",
        path: "/issues/{id}",
        desc: "Delete issue",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
      },
      {
        id: "issue-assignee",
        method: "GET",
        path: "/issues/assignee/{email}",
        desc: "Issues assigned to a user (dashboard)",
        authRequired: true,
        params: [{ name: "email", label: "Assignee email", defaultFrom: "userId" }],
      },
      {
        id: "issue-search",
        method: "GET",
        path: "/issues/search",
        desc: "Search issues by title/description text. projectId boşsa TÜM sistemde arar (yetki filtresi yok).",
        authRequired: true,
        query: [
          { name: "query", label: "query", placeholder: "payment" },
          { name: "projectId", label: "projectId (opsiyonel)", defaultFrom: "projectId" },
        ],
      },
      {
        id: "issue-assign-cycle",
        method: "PUT",
        path: "/issues/{id}/cycle",
        desc: "Assign issue to a cycle (cycleId: null → çıkarır)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: (env) => ({ cycleId: num(env.cycleId) }),
      },
      {
        id: "issue-by-cycle",
        method: "GET",
        path: "/issues/cycle/{cycleId}",
        desc: "List issues assigned to a cycle",
        authRequired: true,
        params: [{ name: "cycleId", label: "Cycle ID", defaultFrom: "cycleId" }],
      },
    ],
  },
  {
    title: "Comments",
    endpoints: [
      {
        id: "comment-create",
        method: "POST",
        path: "/comments/create",
        desc: "Add a comment to an issue (author = giriş yapan kullanıcı)",
        authRequired: true,
        body: (env) => ({ issueId: num(env.issueId), content: "tested after deploy" }),
      },
      {
        id: "comment-by-issue",
        method: "GET",
        path: "/comments/issue/{issueId}",
        desc: "List comments for an issue (oldest first)",
        authRequired: true,
        params: [{ name: "issueId", label: "Issue ID", defaultFrom: "issueId" }],
      },
    ],
  },
  {
    title: "Cycles",
    endpoints: [
      {
        id: "cycle-create",
        method: "POST",
        path: "/cycles/create",
        desc: "Create cycle (status defaults \"Planning\") — Cycle ID otomatik yakalanır. ⚠️ name/startDate/endDate alanları tahmin, Cycle.java'yı paylaşırsan kesinleştiririm.",
        authRequired: true,
        body: (env) => ({ name: "Sprint 1", projectId: num(env.projectId), status: "Planning", startDate: "2026-08-10", endDate: "2026-08-24" }),
        captureFrom: { envKey: "cycleId", jsonPath: "id" },
      },
      {
        id: "cycle-by-project",
        method: "GET",
        path: "/cycles/project/{projectId}",
        desc: "List cycles for a project",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
      },
      {
        id: "cycle-status",
        method: "PUT",
        path: "/cycles/{id}/status",
        desc: "Update cycle status — activate için \"Active\", close için \"Done\" gönder (ayrı endpoint yok, bu yeterli)",
        authRequired: true,
        params: [{ name: "id", label: "Cycle ID", defaultFrom: "cycleId" }],
        body: () => ({ status: "Active" }),
      },
    ],
  },
  {
    title: "Board",
    endpoints: [
      {
        id: "board-by-project",
        method: "GET",
        path: "/boards/project/{projectId}",
        desc: "Kanban board — issue'lar status'e göre gruplu ({ \"To Do\": [...], \"In Progress\": [...], ... })",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
      },
    ],
  },
  {
    title: "Dashboard",
    endpoints: [
      {
        id: "dash-stats",
        method: "GET",
        path: "/dashboard/stats",
        desc: "Proje özet istatistikleri (toplam, status/priority dağılımı)",
        authRequired: true,
        query: [{ name: "projectId", label: "projectId", defaultFrom: "projectId" }],
      },
      {
        id: "dash-activity",
        method: "GET",
        path: "/dashboard/activity",
        desc: "Workspace'teki en yeni 20 issue (son aktivite)",
        authRequired: true,
        query: [{ name: "workspaceId", label: "workspaceId", defaultFrom: "workspaceId" }],
      },
    ],
  },
  {
    title: "Notifications",
    endpoints: [
      {
        id: "notif-list",
        method: "GET",
        path: "/notifications/user/{email}",
        desc: "List notifications for a user",
        authRequired: true,
        params: [{ name: "email", label: "Email", defaultFrom: "userId" }],
      },
      {
        id: "notif-read",
        method: "PUT",
        path: "/notifications/{id}/read",
        desc: "Mark one notification as read",
        authRequired: true,
        params: [{ name: "id", label: "Notification ID", defaultFrom: "notificationId" }],
      },
      {
        id: "notif-read-all",
        method: "PUT",
        path: "/notifications/user/{email}/read-all",
        desc: "Mark all notifications as read for a user",
        authRequired: true,
        params: [{ name: "email", label: "Email", defaultFrom: "userId" }],
      },
    ],
  },
];

/* ──────────────────────────── MCP VERİSİ ──────────────────────────── */
/* flowbit-mcp/index.ts şu an bir stub — bu tablo neyin bugün gerçek bir
   REST endpoint'e bağlanabileceğini ("Hazır"), neyin backend'de karşılığı
   olmadığını ("Planlanan") gösteriyor. "Hazır" olanlar flowbit-mcp içinde
   sadece mevcut REST endpoint'i çağıran bir wrapper yazmak kadar basit;
   "Planlanan" olanlar önce backend'de yeni endpoint/alan ister. */
interface McpTool {
  name: string;
  desc: string;
  params: string; // örn: "userId, projectId, title, description?"
  example: string;
  status: "ready" | "planned";
  maps?: string;
}

const mcpTools: McpTool[] = [
  { name: "create_issue", desc: "Create a new issue in a project", params: "userId, projectId, title, description?, assigneeEmail?, priority?", example: '"Create a HIGH priority issue for the login bug"', status: "ready", maps: "POST /issues/create" },
  { name: "create_issues", desc: "Bulk-create many issues in one call", params: "userId, projectId, issues[] (1–100)", example: '"Create issues from this PRD all at once"', status: "ready", maps: "POST /issues/create × N (backend'de ayrı bulk endpoint yok, flowbit-mcp döngüyle oluşturur)" },
  { name: "update_issue", desc: "Update an existing issue", params: "userId, issueId, title?, description?, priority?, assigneeEmail?", example: '"Set this issue\'s priority to High"', status: "ready", maps: "PUT /issues/{id}" },
  { name: "move_issue", desc: "Change an issue's status (board sütunu)", params: "userId, issueId, status", example: '"Move this issue to In Progress"', status: "ready", maps: "PUT /issues/{id}/status" },
  { name: "add_comment", desc: "Add a comment to an issue", params: "userId, issueId, content", example: '"Add the comment \'tested after deploy\'"', status: "ready", maps: "POST /comments/create" },
  { name: "create_project", desc: "Create a new project in a workspace", params: "userId, workspaceId, name", example: '"Create a project named Mobile App"', status: "ready", maps: "POST /projects/create" },
  { name: "invite_member", desc: "Invite a user to workspace by email", params: "userId, workspaceId, email, role?", example: '"Invite ali@company.com as a member"', status: "ready", maps: "POST /workspaces/members/{id}/add" },
  { name: "create_cycle", desc: "Create a sprint/cycle in a project", params: "userId, projectId, name, startDate?, endDate?", example: '"Create a 2-week Sprint 3 cycle"', status: "ready", maps: "POST /cycles/create (name/startDate/endDate alanları teyitli değil)" },
  { name: "start_cycle", desc: "Activate a planned cycle", params: "userId, cycleId", example: '"Start planned Sprint 3"', status: "ready", maps: 'PUT /cycles/{id}/status { "status": "Active" }' },
  { name: "close_cycle", desc: "Close an active cycle", params: "userId, cycleId", example: '"Close the active cycle"', status: "ready", maps: 'PUT /cycles/{id}/status { "status": "Done" }' },
  { name: "assign_issue_to_cycle", desc: "Add an issue to a cycle", params: "userId, cycleId, issueId", example: '"Add this issue to the current sprint"', status: "ready", maps: "PUT /issues/{id}/cycle" },
  { name: "search_issues", desc: "Search issues by text", params: "userId, query, projectId?", example: '"Find all issues that mention payment"', status: "ready", maps: "GET /issues/search" },
  { name: "get_notifications", desc: "Get recent notifications", params: "userId", example: '"Show my recent notifications"', status: "ready", maps: "GET /notifications/user/{email}" },
  { name: "get_board", desc: "Get a project's Kanban board grouped by status", params: "userId, projectId", example: '"Show me the board for this project"', status: "ready", maps: "GET /boards/project/{projectId}" },
  { name: "get_project_stats", desc: "Get issue counts and status breakdown for a project", params: "userId, projectId", example: '"Summarize this project\'s status"', status: "ready", maps: "GET /dashboard/stats?projectId=" },
];

const mcpPrompts: { name: string; desc: string; args: string }[] = [
  { name: "break_prd_into_issues", desc: "Break down a PRD into actionable issues (create_issues ile birlikte kullanılır)", args: "prd, projectKey?" },
  { name: "summarize_cycle_risk", desc: "Analyze cycle risks and recommendations", args: "cycleSummary, issueList" },
  { name: "summarize_project_status", desc: "Generate project status summary", args: "projectSummary" },
  { name: "daily_standup", desc: "Generate daily standup update", args: "userId, projectSummary" },
  { name: "sprint_retrospective", desc: "Generate retrospective talking points", args: "cycleReport" },
];

const mcpResources: { uri: string; desc: string; status: "ready" | "planned"; maps?: string }[] = [
  { uri: "project://{projectId}/summary", desc: "Project summary with issue counts and workload", status: "ready", maps: "GET /dashboard/stats?projectId=" },
  { uri: "board://{projectId}", desc: "Board snapshot with status columns", status: "ready", maps: "GET /boards/project/{projectId}" },
  { uri: "cycle://{cycleId}/summary", desc: "Cycle summary with issue count and days remaining", status: "planned", maps: "backend'de cycle-özet endpoint'i yok" },
];

/* ──────────────────────────── UI HELPERS ──────────────────────────── */

function CopyButton({ text, id, active, onCopy }: { text: string; id: string; active: boolean; onCopy: (id: string) => void }) {
  return (
    <button
      onClick={(ev) => {
        ev.stopPropagation();
        navigator.clipboard.writeText(text);
        onCopy(id);
      }}
      className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1e232d]"
      title="Kopyala"
    >
      {active ? (
        <>
          <FiCheck className="text-green-500" /> Copied
        </>
      ) : (
        <>
          <FiCopy /> Copy
        </>
      )}
    </button>
  );
}

function MethodBadge({ method }: { method: Method }) {
  return (
    <span className={`w-14 shrink-0 text-center text-[11px] font-bold uppercase tracking-wide rounded-md py-1 ${methodStyles[method]}`}>
      {method === "DELETE" ? "DEL" : method}
    </span>
  );
}

function resolveValue(overrides: Record<string, string>, name: string, env: EnvData, defaultFrom?: EnvKey) {
  if (overrides[name] !== undefined) return overrides[name];
  return defaultFrom ? env[defaultFrom] : "";
}

function buildUrl(baseUrl: string, ep: Endpoint, pathValues: Record<string, string>, queryValues: Record<string, string>, env: EnvData) {
  let path = ep.path;
  (ep.params || []).forEach((p) => {
    const val = resolveValue(pathValues, p.name, env, p.defaultFrom);
    path = path.replace(`{${p.name}}`, encodeURIComponent(val || `{${p.name}}`));
  });
  const qs = (ep.query || [])
    .map((q) => ({ q, val: resolveValue(queryValues, q.name, env, q.defaultFrom) }))
    .filter(({ val }) => val)
    .map(({ q, val }) => `${q.name}=${encodeURIComponent(val)}`)
    .join("&");
  return `${baseUrl}${API_PREFIX}${path}${qs ? `?${qs}` : ""}`;
}

function missingParams(ep: Endpoint, pathValues: Record<string, string>, env: EnvData) {
  return (ep.params || []).filter((p) => !resolveValue(pathValues, p.name, env, p.defaultFrom)).map((p) => p.label);
}

function buildCurl(baseUrl: string, ep: Endpoint, pathValues: Record<string, string>, queryValues: Record<string, string>, bodyText: string, env: EnvData) {
  const url = buildUrl(baseUrl, ep, pathValues, queryValues, env);
  let cmd = `curl${ep.method !== "GET" ? ` -X ${ep.method}` : ""} "${url}"`;
  if (ep.authRequired) cmd += ` \\\n  -H "Authorization: Bearer ${env.token || "$TOKEN"}"`;
  if (ep.body) {
    cmd += ` \\\n  -H "Content-Type: application/json"`;
    cmd += ` \\\n  -d '${bodyText}'`;
  }
  return cmd;
}

function EndpointRow({
  endpoint,
  env,
  copiedId,
  onCopy,
  onCapture,
}: {
  endpoint: Endpoint;
  env: EnvData;
  copiedId: string | null;
  onCopy: (id: string) => void;
  onCapture: (envKey: EnvKey | "token", value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyOverride, setBodyOverride] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number | null; ok: boolean; body: string; error?: string } | null>(null);

  const defaultBody = endpoint.body ? JSON.stringify(endpoint.body(env), null, 2) : "";
  const bodyText = bodyOverride ?? defaultBody;

  const curl = buildCurl(env.baseUrl, endpoint, pathValues, queryValues, bodyText, env);

  const send = async () => {
    const missing = missingParams(endpoint, pathValues, env);
    if (missing.length > 0) {
      setResult({ status: null, ok: false, body: "", error: `Doldurulması gereken alan(lar): ${missing.join(", ")}` });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = buildUrl(env.baseUrl, endpoint, pathValues, queryValues, env);
    try {
      const headers: Record<string, string> = {};
      if (endpoint.authRequired) headers["Authorization"] = `Bearer ${env.token}`;
      if (endpoint.body) headers["Content-Type"] = "application/json";
      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.body ? bodyText : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        const parsed = JSON.parse(text);
        pretty = JSON.stringify(parsed, null, 2);
        if (res.ok) {
          if (endpoint.id === "auth-login" && parsed?.token) {
            onCapture("token", parsed.token);
          } else if (endpoint.captureFrom && parsed?.[endpoint.captureFrom.jsonPath] != null) {
            onCapture(endpoint.captureFrom.envKey, String(parsed[endpoint.captureFrom.jsonPath]));
          }
        }
      } catch {
        /* json değil, olduğu gibi göster */
      }
      setResult({ status: res.status, ok: res.ok, body: pretty });
    } catch (err) {
      setResult({
        status: null,
        ok: false,
        body: "",
        error:
          "İstek gönderilemedi. Backend (localhost:8081) çalışıyor mu, CORS bu origin'e izinli mi kontrol edin. (Detay: " +
          (err instanceof Error ? err.message : String(err)) +
          ")",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gray-100 dark:border-[#1e232d] last:border-b-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-4 py-3 text-left group">
        <MethodBadge method={endpoint.method} />
        <span className="font-mono text-[13px] text-slate-700 dark:text-[#e2e8f0]">{endpoint.path}</span>
        <span className="text-[13px] text-gray-500 dark:text-[#848d9c] ml-auto hidden sm:block">{endpoint.desc}</span>
        <FiChevronDown className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mb-4 -mt-1 flex flex-col gap-3">
          {(endpoint.params?.length || endpoint.query?.length || endpoint.body) && (
            <div className="bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 flex flex-col gap-3">
              {endpoint.params?.map((p) => (
                <label key={p.name} className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{p.label}</span>
                  <input
                    className="text-[13px] font-mono bg-white dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-lg px-3 py-2 text-slate-900 dark:text-[#e2e8f0]"
                    value={resolveValue(pathValues, p.name, env, p.defaultFrom)}
                    placeholder={p.placeholder}
                    onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </label>
              ))}
              {endpoint.query?.map((q) => (
                <label key={q.name} className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{q.label} (query)</span>
                  <input
                    className="text-[13px] font-mono bg-white dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-lg px-3 py-2 text-slate-900 dark:text-[#e2e8f0]"
                    value={resolveValue(queryValues, q.name, env, q.defaultFrom)}
                    placeholder={q.placeholder}
                    onChange={(e) => setQueryValues((v) => ({ ...v, [q.name]: e.target.value }))}
                  />
                </label>
              ))}
              {endpoint.body && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Body (JSON)</span>
                  <textarea
                    className="text-[12.5px] font-mono bg-white dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-lg px-3 py-2 text-slate-900 dark:text-[#e2e8f0] min-h-[100px]"
                    value={bodyText}
                    onChange={(e) => setBodyOverride(e.target.value)}
                  />
                </label>
              )}
              {endpoint.authRequired && !env.token && (
                <p className="text-[12px] text-amber-600 dark:text-[#f59e0b]">
                  Bu endpoint token gerektiriyor. Önce /auth/login'i deneyin — başarılı olursa token otomatik doldurulur.
                </p>
              )}
              <button
                onClick={send}
                disabled={loading}
                className="self-start flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
                {loading ? "Gönderiliyor..." : "Try it"}
              </button>
            </div>
          )}
          {!endpoint.params?.length && !endpoint.query?.length && !endpoint.body && (
            <button
              onClick={send}
              disabled={loading}
              className="self-start flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiPlay />}
              {loading ? "Gönderiliyor..." : "Try it"}
            </button>
          )}

          <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d]">
              <span className="text-[11px] font-mono text-gray-400">curl</span>
              <CopyButton text={curl} id={endpoint.id} active={copiedId === endpoint.id} onCopy={onCopy} />
            </div>
            <pre className="p-4 text-[12.5px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{curl}</pre>
          </div>

          {result && (
            <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d]">
                <span className="text-[11px] font-mono text-gray-400">response</span>
                {result.status !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      result.ok ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"
                    }`}
                  >
                    {result.status}
                  </span>
                )}
              </div>
              <pre className="p-4 text-[12.5px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {result.error || result.body || "(boş cevap)"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── SAYFA ──────────────────────────── */

export default function ApiReferencePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"rest" | "mcp-tools" | "mcp-setup">("rest");
  const [envData, setEnvData] = useState<EnvData>({
    baseUrl: "http://localhost:8081",
    userId: "test@example.com",
    workspaceId: "1",
    projectId: "1",
    issueId: "1",
    notificationId: "1",
    cycleId: "1",
    token: "",
  });

  useEffect(() => {
    const email = localStorage.getItem("email") || "test@example.com";
    const wsId = localStorage.getItem("currentWorkspaceId") || "1";
    const projId = localStorage.getItem("currentProjectId") || "1";
    const savedToken = localStorage.getItem("token") || "";
    setEnvData((e) => ({ ...e, userId: email, workspaceId: wsId, projectId: projId, token: savedToken }));
  }, []);

  const flash = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
  };

  const handleCapture = (envKey: EnvKey | "token", value: string) => {
    setEnvData((d) => {
      const updated = { ...d, [envKey]: value };
      // Token her güncellendiğinde (login'den otomatik ya da elle), User/Email'i de
      // token'ın gerçek sahibiyle senkron tut — mismatch uyarısının kalıcı olmasını önler.
      if (envKey === "token") {
        const email = decodeJwtEmail(value);
        if (email) updated.userId = email;
      }
      return updated;
    });
  };

  const envCards: { label: string; key: keyof EnvData }[] = [
    { label: "Base URL", key: "baseUrl" },
    { label: "User / Email", key: "userId" },
    { label: "Workspace ID", key: "workspaceId" },
    { label: "Project ID", key: "projectId" },
    { label: "Issue ID", key: "issueId" },
    { label: "Cycle ID", key: "cycleId" },
    { label: "Notification ID", key: "notificationId" },
  ];

  return (
    <div className="p-8 max-w-[1000px] mx-auto w-full font-sans transition-colors duration-200 pb-24">
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">API Reference</h1>
        <p className="text-[14px] text-gray-500 dark:text-[#848d9c] mt-2">
          FlovBit backend (Spring Boot, {API_PREFIX}) — canlı test edilebilir.
        </p>
      </div>

      {/* YOUR ENVIRONMENT */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-1">Your Environment</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
          auto-filled · create/login istekleri buradaki ID'leri ve token'ı otomatik günceller
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {envCards.map((c) => (
            <div
              key={c.key}
              className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{c.label}</div>
                <input
                  className="text-[14px] font-mono text-slate-900 dark:text-[#e2e8f0] bg-transparent w-full outline-none"
                  value={envData[c.key]}
                  onChange={(e) => setEnvData((d) => ({ ...d, [c.key]: e.target.value }))}
                />
              </div>
              <CopyButton text={envData[c.key]} id={`env-${c.key}`} active={copiedId === `env-${c.key}`} onCopy={flash} />
            </div>
          ))}
          <div className="md:col-span-2 bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <span>Token (Bearer)</span>
                {(() => {
                  const owner = decodeJwtEmail(envData.token);
                  return owner ? (
                    <span
                      className={`normal-case font-normal text-[11px] px-2 py-0.5 rounded-full ${
                        owner === envData.userId
                          ? "bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]"
                          : "bg-amber-50 dark:bg-[#241d0f] text-amber-600 dark:text-[#f59e0b]"
                      }`}
                    >
                      bu token: {owner}
                      {owner !== envData.userId && " ⚠️ User/Email ile uyuşmuyor"}
                    </span>
                  ) : null;
                })()}
              </div>
              <input
                className="text-[13px] font-mono text-slate-900 dark:text-[#e2e8f0] bg-transparent w-full outline-none"
                value={envData.token}
                placeholder="POST /auth/login'i deneyin — başarılı olunca otomatik dolar"
                onChange={(e) => {
                  const newToken = e.target.value;
                  const email = decodeJwtEmail(newToken);
                  setEnvData((d) => ({ ...d, token: newToken, ...(email ? { userId: email } : {}) }));
                }}
              />
            </div>
            <CopyButton text={envData.token} id="env-token" active={copiedId === "env-token"} onCopy={flash} />
          </div>
        </div>
      </div>

      {/* FULL REFERENCE */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">Full Reference</h2>

        <div className="flex gap-2 mb-6">
          {[
            { key: "rest", label: "REST API" },
            { key: "mcp-tools", label: "MCP Tools" },
            { key: "mcp-setup", label: "MCP Setup" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                tab === t.key
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-[#11141b] text-gray-600 dark:text-[#848d9c] border border-gray-200 dark:border-[#1e232d] hover:bg-gray-50 dark:hover:bg-[#1e232d]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "rest" && (
          <div className="flex flex-col gap-8">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">{cat.title}</h3>
                <div className="flex flex-col">
                  {cat.endpoints.map((ep) => (
                    <EndpointRow key={ep.id} endpoint={ep} env={envData} copiedId={copiedId} onCopy={flash} onCapture={handleCapture} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "mcp-tools" && (
          <div className="flex flex-col gap-8">
            <div className="bg-amber-50 dark:bg-[#241d0f] border border-amber-200 dark:border-[#3a2e14] rounded-xl p-4">
              <p className="text-[13px] text-amber-800 dark:text-[#f59e0b]">
                <strong>Not:</strong> <code className="font-mono">flowbit-mcp/index.ts</code> henüz gerçek bir MCP server
                implementasyonu değil (stub). Aşağıdaki tool'lar bir hedef/spesifikasyon listesi — <strong>Hazır</strong>{" "}
                etiketli olanlar mevcut REST endpoint'lerini saran basit bir wrapper ile bugün yazılabilir,{" "}
                <strong>Planlanan</strong> olanlar önce backend'de yeni bir endpoint ya da alan gerektirir.
              </p>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">MCP Tools</h3>
              <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
                All tools expect <code className="font-mono">userId</code> as their first parameter for identity. You can
                call them in natural language from an AI client.
              </p>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#1e232d]">
                {mcpTools.map((t) => (
                  <div key={t.name} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{t.name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          t.status === "ready"
                            ? "bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]"
                            : "bg-gray-100 dark:bg-[#1e232d] text-gray-500 dark:text-[#848d9c]"
                        }`}
                      >
                        {t.status === "ready" ? "Hazır" : "Planlanan"}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-600 dark:text-[#c7ccd4] mb-1">{t.desc}</p>
                    <p className="text-[11.5px] font-mono text-gray-400 mb-1">{t.params}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[#5b6472] italic mb-1">Example: {t.example}</p>
                    {t.maps && <p className="text-[11px] font-mono text-gray-400">→ {t.maps}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">MCP Prompts</h3>
              <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
                Hazır prompt şablonları — backend gerektirmez, doğrudan mevcut verilerle LLM'e yazdırılır. Artık{" "}
                <code className="font-mono">flowbit-mcp/index.ts</code> içinde tanımlı, Hazır.
              </p>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#1e232d]">
                {mcpPrompts.map((p) => (
                  <div key={p.name} className="py-3 first:pt-0 last:pb-0">
                    <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{p.name}</span>
                    <p className="text-[13px] text-gray-500 dark:text-[#848d9c]">{p.desc}</p>
                    <p className="text-[11.5px] font-mono text-gray-400">args: {p.args}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">MCP Resources</h3>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#1e232d]">
                {mcpResources.map((r) => (
                  <div key={r.uri} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{r.uri}</span>
                      <p className="text-[13px] text-gray-500 dark:text-[#848d9c]">{r.desc}</p>
                      {r.maps && <p className="text-[11px] font-mono text-gray-400">→ {r.maps}</p>}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        r.status === "ready"
                          ? "bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]"
                          : "bg-gray-100 dark:bg-[#1e232d] text-gray-500 dark:text-[#848d9c]"
                      }`}
                    >
                      {r.status === "ready" ? "Hazır" : "Planlanan"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "mcp-setup" && <McpSetupTab copiedId={copiedId} onCopy={flash} />}
      </div>
    </div>
  );
}

/* ──────────────────────────── MCP SETUP TAB ──────────────────────────── */

function CodeBlock({ label, code, id, copiedId, onCopy }: { label: string; code: string; id: string; copiedId: string | null; onCopy: (id: string) => void }) {
  return (
    <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d]">
        <span className="text-[11px] font-mono text-gray-400">{label}</span>
        <CopyButton text={code} id={id} active={copiedId === id} onCopy={onCopy} />
      </div>
      <pre className="p-4 text-[12.5px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function McpSetupTab({ copiedId, onCopy }: { copiedId: string | null; onCopy: (id: string) => void }) {
  const localConfig = `{\n  "mcpServers": {\n    "flowbit": {\n      "command": "npx",\n      "args": ["tsx", "flowbit-mcp/index.ts"],\n      "env": {\n        "FLOWBIT_TOKEN": "<POST /auth/login'den aldığın JWT>"\n      }\n    }\n  }\n}`;
  const stdioRun = `npx tsx flowbit-mcp/index.ts`;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-red-50 dark:bg-[#240f0f] border border-red-200 dark:border-[#3a1414] rounded-xl p-4">
        <p className="text-[13px] text-red-700 dark:text-[#ef4444]">
          <strong>Şu an yok:</strong> Uzak (hosted) MCP sunucusu — referans sitedeki{" "}
          <code className="font-mono">https://mcp.flowbit.codifya.com/mcp</code> gibi bir adres. Backend'de API key
          oluşturma/doğrulama sistemi (<code className="font-mono">/api/v1/api-keys</code>) artık var, ama{" "}
          <code className="font-mono">flowbit-mcp/index.ts</code> henüz sadece stdio (yerel) modunu destekliyor —
          uzaktan/http ile çalışması için ayrıca host edilmesi gerekiyor.
        </p>
      </div>

      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Yerel (stdio) — bugün çalışıyor</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
          Bu bloğu Claude Desktop / Cursor'ın MCP ayarlar dosyasına ekle, sonra client'ı yeniden başlat. Token olarak{" "}
          <code className="font-mono">/auth/login</code>'dan aldığın JWT'yi ya da yeni oluşturduğun bir{" "}
          <code className="font-mono">fb_...</code> API key'ini kullanabilirsin (ikisi de{" "}
          <code className="font-mono">FLOWBIT_TOKEN</code> için geçerli).
        </p>
        <CodeBlock label="config.json" code={localConfig} id="mcp-local-config" copiedId={copiedId} onCopy={onCopy} />
      </div>

      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Run with command</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-3">
          Terminalden elle çalıştırmak istersen (Claude Desktop olmadan test için):
        </p>
        <CodeBlock label="stdio" code={stdioRun} id="mcp-stdio-run" copiedId={copiedId} onCopy={onCopy} />
      </div>
    </div>
  );
}