"use client";
import { useState, useEffect } from "react";
import { FiCopy, FiCheck, FiChevronDown, FiPlay, FiLoader } from "react-icons/fi";

/* ────────────────────────────────────────────────────────────────
   Backend: Spring Boot, prefix /api/v1, port 8081.
   CORS (SecurityConfig.java) sadece http://localhost:3000'e izinli.
   İzinli metotlar: GET, POST, PUT, DELETE (PATCH yok).
   Login cevabı: { message, token }.
   Boards / Cycles / Dashboard / Activity: backend'de controller henüz yok.
   NOT: /issues/project/{projectId} endpoint'inde workspace yetki kontrolü
   yok (diğer Project/WorkspaceMember endpoint'lerinde var) — istersen
   backend tarafında bunu da eklemek isteyebilirsin.
──────────────────────────────────────────────────────────────── */
const API_PREFIX = "/api/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type EnvKey = "workspaceId" | "projectId" | "userId" | "issueId" | "notificationId";

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
  bodyExample?: Record<string, unknown> | null;
  captureFrom?: { envKey: EnvKey; jsonPath: string }; // response.jsonPath -> env[envKey]
}

interface EnvData {
  baseUrl: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  issueId: string;
  notificationId: string;
  token: string;
}

const methodStyles: Record<Method, string> = {
  GET: "text-blue-600 dark:text-[#5c9dff] bg-blue-50 dark:bg-[#1c2436]",
  POST: "text-green-600 dark:text-[#22c55e] bg-green-50 dark:bg-[#122019]",
  PUT: "text-amber-600 dark:text-[#f59e0b] bg-amber-50 dark:bg-[#241d0f]",
  DELETE: "text-red-600 dark:text-[#ef4444] bg-red-50 dark:bg-[#240f0f]",
};

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
        bodyExample: { username: "testuser", email: "test@example.com", password: "password123" },
      },
      {
        id: "auth-login",
        method: "POST",
        path: "/auth/login",
        desc: "Login with email/password — returns { message, token }",
        authRequired: false,
        bodyExample: { email: "test@example.com", password: "password123" },
        captureFrom: { envKey: "userId", jsonPath: "" }, // özel işlenir (token için ayrı kod var)
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
        bodyExample: { email: "test@example.com", name: "New Name", avatarUrl: "" },
      },
      {
        id: "user-change-password",
        method: "POST",
        path: "/users/change-password",
        desc: "Change password (fails for Google/OAuth users)",
        authRequired: true,
        bodyExample: { email: "test@example.com", currentPassword: "password123", newPassword: "newpassword456" },
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
        bodyExample: { name: "My Workspace", email: "test@example.com" },
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
        desc: "Invite member — admin only, sets status PENDING",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
        bodyExample: { userEmail: "friend@example.com", role: "MEMBER" },
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
          { name: "email", label: "Member email", placeholder: "friend@example.com" },
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
          { name: "email", label: "Member email", placeholder: "friend@example.com" },
        ],
        bodyExample: { role: "ADMIN" },
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
        desc: "Create project — Project ID otomatik yakalanır. workspaceId'de ADMIN/member olmalısın.",
        authRequired: true,
        bodyExample: { name: "New Project", workspaceId: 1 },
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
        bodyExample: { title: "My first issue", description: "", projectId: 1, assigneeEmail: "" },
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
        bodyExample: { title: "Updated title", priority: "High" },
      },
      {
        id: "issue-status",
        method: "PUT",
        path: "/issues/{id}/status",
        desc: "Update only the status (drag & drop on board)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        bodyExample: { status: "In Progress" },
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
  if (ep.bodyExample) {
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
  onCapture: (envKey: EnvKey, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(endpoint.bodyExample ? JSON.stringify(endpoint.bodyExample, null, 2) : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number | null; ok: boolean; body: string; error?: string } | null>(null);

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
      if (endpoint.bodyExample) headers["Content-Type"] = "application/json";
      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.bodyExample ? bodyText : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        const parsed = JSON.parse(text);
        pretty = JSON.stringify(parsed, null, 2);
        if (res.ok) {
          if (endpoint.id === "auth-login" && parsed?.token) {
            onCapture("token" as EnvKey, parsed.token);
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
          {(endpoint.params?.length || endpoint.query?.length || endpoint.bodyExample) && (
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
              {endpoint.bodyExample && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Body (JSON)</span>
                  <textarea
                    className="text-[12.5px] font-mono bg-white dark:bg-[#0b0d12] border border-gray-200 dark:border-[#1e232d] rounded-lg px-3 py-2 text-slate-900 dark:text-[#e2e8f0] min-h-[100px]"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
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
          {!endpoint.params?.length && !endpoint.query?.length && !endpoint.bodyExample && (
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
  const [envData, setEnvData] = useState<EnvData>({
    baseUrl: "http://localhost:8081",
    userId: "test@example.com",
    workspaceId: "1",
    projectId: "1",
    issueId: "1",
    notificationId: "1",
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
    setEnvData((d) => ({ ...d, [envKey]: value }));
  };

  const envCards: { label: string; key: keyof EnvData }[] = [
    { label: "Base URL", key: "baseUrl" },
    { label: "User / Email", key: "userId" },
    { label: "Workspace ID", key: "workspaceId" },
    { label: "Project ID", key: "projectId" },
    { label: "Issue ID", key: "issueId" },
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
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Token (Bearer)</div>
              <input
                className="text-[13px] font-mono text-slate-900 dark:text-[#e2e8f0] bg-transparent w-full outline-none"
                value={envData.token}
                placeholder="POST /auth/login'i deneyin — başarılı olunca otomatik dolar"
                onChange={(e) => setEnvData((d) => ({ ...d, token: e.target.value }))}
              />
            </div>
            <CopyButton text={envData.token} id="env-token" active={copiedId === "env-token"} onCopy={flash} />
          </div>
        </div>
      </div>

      {/* ENDPOINTS */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">Endpoints</h2>
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
      </div>

      <div className="bg-white dark:bg-[#11141b] border border-dashed border-gray-300 dark:border-[#2a303c] rounded-2xl p-6">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Henüz backend'de yok</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c]">
          Boards, Cycles, Dashboard/Activity için frontend'de klasör var ama backend'de karşılık gelen bir Controller henüz
          yazılmamış (<code className="font-mono">CycleService</code> var, <code className="font-mono">CycleController</code>{" "}
          yok).
        </p>
      </div>
    </div>
  );
}