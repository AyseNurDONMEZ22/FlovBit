"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { FiCopy, FiCheck, FiChevronDown, FiPlay, FiLoader, FiSearch } from "react-icons/fi";

/* ────────────────────────────────────────────────────────────────
   Backend: Spring Boot, prefix /api/v1, port 8081 (Railway'de public).
   CORS sadece http://localhost:3000'e izinli. Metotlar: GET/POST/PUT/DELETE.
──────────────────────────────────────────────────────────────── */
const API_PREFIX = "/api/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type EnvKey = "workspaceId" | "projectId" | "userId" | "issueId" | "notificationId" | "cycleId" | "apiKeyId";
type Lang = "curl" | "js" | "python";

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
  body?: (env: EnvData) => Record<string, unknown>;
  captureFrom?: { envKey: EnvKey; jsonPath: string };
  exampleResponse?: unknown;
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
        exampleResponse: {
          id: 4, username: "testuser", email: "test@example.com", avatarUrl: null,
          provider: "LOCAL", role: "USER", createdAt: "2026-08-12T10:41:24.824908",
        },
      },
      {
        id: "auth-login",
        method: "POST",
        path: "/auth/login",
        desc: "Login with email/password — returns { message, token }",
        authRequired: false,
        body: (env) => ({ email: env.userId, password: "password123" }),
        exampleResponse: { message: "Giriş başarılı! Hoş geldin, testuser", token: "eyJhbGciOiJIUzI1NiJ9..." },
      },
    ],
  },
  {
    title: "Users",
    endpoints: [
      {
        id: "user-me",
        method: "GET",
        path: "/users/me",
        desc: "Get the currently authenticated user",
        authRequired: true,
        exampleResponse: {
          id: 4, username: "testuser", email: "test@example.com", avatarUrl: null,
          provider: "LOCAL", role: "USER", createdAt: "2026-08-12T10:41:24.824908",
        },
      },
      {
        id: "user-update-profile",
        method: "POST",
        path: "/users/update-profile",
        desc: "Update display name / avatar",
        authRequired: true,
        body: (env) => ({ email: env.userId, name: "New Name", avatarUrl: "" }),
        exampleResponse: { message: "Profil başarıyla güncellendi.", avatarUrl: "" },
      },
      {
        id: "user-change-password",
        method: "POST",
        path: "/users/change-password",
        desc: "Change password (fails for Google/OAuth users)",
        authRequired: true,
        body: (env) => ({ email: env.userId, currentPassword: "password123", newPassword: "newpassword456" }),
        exampleResponse: { message: "Şifre başarıyla değiştirildi." },
      },
    ],
  },
  {
    title: "API Keys",
    endpoints: [
      {
        id: "apikey-create",
        method: "POST",
        path: "/api-keys/create",
        desc: "Create a new API key — \"key\" alanı SADECE bu response'ta gösterilir, bir daha geri getirilemez",
        authRequired: true,
        body: () => ({ name: "Claude Desktop", expiresInDays: 30 }),
        captureFrom: { envKey: "token", jsonPath: "key" },
        exampleResponse: {
          id: 1, name: "Claude Desktop", key: "fb_9sQ2k...redacted...xT4", prefix: "fb_9sQ2k7a",
          expiresAt: "2026-09-18T10:00:00", createdAt: "2026-08-19T10:00:00",
        },
      },
      {
        id: "apikey-list",
        method: "GET",
        path: "/api-keys",
        desc: "List your API keys (prefix only, hash/plaintext gizli)",
        authRequired: true,
        exampleResponse: [
          { id: 1, name: "Claude Desktop", prefix: "fb_9sQ2k7a", createdAt: "2026-08-19T10:00:00", expiresAt: "2026-09-18T10:00:00", revoked: false, lastUsedAt: "2026-08-19T11:30:00" },
        ],
      },
      {
        id: "apikey-revoke",
        method: "DELETE",
        path: "/api-keys/{id}",
        desc: "Revoke (delete) an API key",
        authRequired: true,
        params: [{ name: "id", label: "API Key ID", defaultFrom: "apiKeyId", placeholder: "1" }],
        exampleResponse: { message: "API key silindi." },
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
        exampleResponse: { id: 12, name: "My Workspace", createdAt: "2026-08-12T10:42:12.984411" },
      },
      {
        id: "ws-list",
        method: "GET",
        path: "/workspaces/user/{email}",
        desc: "List workspaces the user belongs to",
        authRequired: true,
        params: [{ name: "email", label: "Email", defaultFrom: "userId" }],
        exampleResponse: [
          { id: 9, name: "Moon", createdAt: "2026-07-28T12:45:15.996591" },
          { id: 12, name: "My Workspace", createdAt: "2026-08-12T10:42:12.984411" },
        ],
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
        exampleResponse: [{ id: 10, role: "ADMIN", status: "ACCEPTED", userEmail: "test@example.com", workspaceId: 11 }],
      },
      {
        id: "wm-add",
        method: "POST",
        path: "/workspaces/members/{workspaceId}/add",
        desc: "Invite member — admin only, sets status PENDING. Hedef e-posta sistemde kayıtlı olmalı.",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
        body: () => ({ userEmail: "friend@example.com", role: "MEMBER" }),
        exampleResponse: { id: 15, role: "MEMBER", status: "PENDING", userEmail: "friend@example.com", workspaceId: 12 },
      },
      {
        id: "wm-accept",
        method: "PUT",
        path: "/workspaces/members/{workspaceId}/accept-invite",
        desc: "Accept invite for current (authenticated) user",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
        exampleResponse: { id: 15, role: "MEMBER", status: "ACCEPTED", userEmail: "friend@example.com", workspaceId: 12 },
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
        exampleResponse: { message: "Üye başarıyla çıkarıldı." },
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
        exampleResponse: { id: 15, role: "ADMIN", status: "ACCEPTED", userEmail: "friend@example.com", workspaceId: 12 },
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
        exampleResponse: { id: 5, name: "New Project", projectKey: "NEW", workspaceId: 12 },
      },
      {
        id: "proj-by-ws",
        method: "GET",
        path: "/projects/workspace/{workspaceId}",
        desc: "List projects in a workspace",
        authRequired: true,
        params: [{ name: "workspaceId", label: "Workspace ID", defaultFrom: "workspaceId" }],
        exampleResponse: [{ id: 4, name: "Astronote", projectKey: "AST", workspaceId: 9 }],
      },
      {
        id: "proj-get",
        method: "GET",
        path: "/projects/{id}",
        desc: "Get project by id",
        authRequired: true,
        params: [{ name: "id", label: "Project ID", defaultFrom: "projectId" }],
        exampleResponse: { id: 4, name: "Astronote", projectKey: "AST", workspaceId: 9 },
      },
      {
        id: "proj-delete",
        method: "DELETE",
        path: "/projects/{id}",
        desc: "Delete project",
        authRequired: true,
        params: [{ name: "id", label: "Project ID", defaultFrom: "projectId" }],
        exampleResponse: { message: "Proje başarıyla silindi." },
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
        exampleResponse: {
          id: 12, title: "My first issue", description: "", status: "To Do", priority: "Medium",
          projectId: 4, assigneeEmail: "", cycleId: null, createdAt: "2026-08-12T10:44:01.088653",
        },
      },
      {
        id: "issue-by-project",
        method: "GET",
        path: "/issues/project/{projectId}",
        desc: "List issues for a project",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
        exampleResponse: [
          { id: 6, title: "Run", status: "In Progress", priority: "Medium", projectId: 4, assigneeEmail: "test@example.com", cycleId: null, createdAt: "2026-07-28T15:08:12.32106" },
          { id: 7, title: "jump", status: "In Progress", priority: "High", projectId: 4, assigneeEmail: null, cycleId: null, createdAt: "2026-07-28T15:08:27.432524" },
        ],
      },
      {
        id: "issue-get",
        method: "GET",
        path: "/issues/{id}",
        desc: "Get issue by id",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        exampleResponse: {
          id: 12, title: "My first issue", description: "", status: "To Do", priority: "Medium",
          projectId: 4, assigneeEmail: "", cycleId: null, createdAt: "2026-08-12T10:44:01.088653",
        },
      },
      {
        id: "issue-update",
        method: "PUT",
        path: "/issues/{id}",
        desc: "Update issue fields (partial)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: () => ({ title: "Updated title", priority: "High" }),
        exampleResponse: {
          id: 12, title: "Updated title", description: "", status: "To Do", priority: "High",
          projectId: 4, assigneeEmail: "", cycleId: null, createdAt: "2026-08-12T10:44:01.088653",
        },
      },
      {
        id: "issue-status",
        method: "PUT",
        path: "/issues/{id}/status",
        desc: "Update only the status (drag & drop on board)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: () => ({ status: "In Progress" }),
        exampleResponse: {
          id: 12, title: "Updated title", status: "In Progress", priority: "High",
          projectId: 4, assigneeEmail: "", cycleId: null, createdAt: "2026-08-12T10:44:01.088653",
        },
      },
      {
        id: "issue-delete",
        method: "DELETE",
        path: "/issues/{id}",
        desc: "Delete issue",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        exampleResponse: { message: "Görev başarıyla silindi." },
      },
      {
        id: "issue-assignee",
        method: "GET",
        path: "/issues/assignee/{email}",
        desc: "Issues assigned to a user (dashboard)",
        authRequired: true,
        params: [{ name: "email", label: "Assignee email", defaultFrom: "userId" }],
        exampleResponse: [{ id: 6, title: "Run", status: "In Progress", priority: "Medium", projectId: 4, assigneeEmail: "test@example.com" }],
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
        exampleResponse: [{ id: 6, title: "Run", status: "In Progress", priority: "Medium", projectId: 4 }],
      },
      {
        id: "issue-assign-cycle",
        method: "PUT",
        path: "/issues/{id}/cycle",
        desc: "Assign issue to a cycle (cycleId: null → çıkarır)",
        authRequired: true,
        params: [{ name: "id", label: "Issue ID", defaultFrom: "issueId" }],
        body: (env) => ({ cycleId: num(env.cycleId) }),
        exampleResponse: { id: 12, title: "Updated title", status: "In Progress", cycleId: 4 },
      },
      {
        id: "issue-by-cycle",
        method: "GET",
        path: "/issues/cycle/{cycleId}",
        desc: "List issues assigned to a cycle",
        authRequired: true,
        params: [{ name: "cycleId", label: "Cycle ID", defaultFrom: "cycleId" }],
        exampleResponse: [{ id: 12, title: "Updated title", status: "In Progress", cycleId: 4 }],
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
        exampleResponse: { id: 1, issueId: 12, authorEmail: "test@example.com", content: "tested after deploy", createdAt: "2026-08-19T10:00:00" },
      },
      {
        id: "comment-by-issue",
        method: "GET",
        path: "/comments/issue/{issueId}",
        desc: "List comments for an issue (oldest first)",
        authRequired: true,
        params: [{ name: "issueId", label: "Issue ID", defaultFrom: "issueId" }],
        exampleResponse: [{ id: 1, issueId: 12, authorEmail: "test@example.com", content: "tested after deploy", createdAt: "2026-08-19T10:00:00" }],
      },
      {
        id: "comment-delete",
        method: "DELETE",
        path: "/comments/{id}",
        desc: "Delete your own comment",
        authRequired: true,
        params: [{ name: "id", label: "Comment ID", placeholder: "1" }],
        exampleResponse: { message: "Yorum silindi." },
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
        desc: "Create cycle (status defaults \"Planning\") — Cycle ID otomatik yakalanır",
        authRequired: true,
        body: (env) => ({ name: "Sprint 1", projectId: num(env.projectId), status: "Planning", startDate: "2026-08-10", endDate: "2026-08-24" }),
        captureFrom: { envKey: "cycleId", jsonPath: "id" },
        exampleResponse: { id: 4, name: "Sprint 1", goal: null, status: "Planning", startDate: "2026-08-10", endDate: "2026-08-24", projectId: 4 },
      },
      {
        id: "cycle-get",
        method: "GET",
        path: "/cycles/{id}",
        desc: "Get cycle by id",
        authRequired: true,
        params: [{ name: "id", label: "Cycle ID", defaultFrom: "cycleId" }],
        exampleResponse: { id: 4, name: "Sprint 1", goal: null, status: "Active", startDate: "2026-08-10", endDate: "2026-08-24", projectId: 4 },
      },
      {
        id: "cycle-by-project",
        method: "GET",
        path: "/cycles/project/{projectId}",
        desc: "List cycles for a project",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
        exampleResponse: [
          { id: 2, name: "Sprintt", goal: "", status: "Closed", startDate: "2026-07-17", endDate: "2026-07-28", projectId: 4 },
          { id: 4, name: "Sprint 1", goal: null, status: "Active", startDate: "2026-08-10", endDate: "2026-08-24", projectId: 4 },
        ],
      },
      {
        id: "cycle-status",
        method: "PUT",
        path: "/cycles/{id}/status",
        desc: "Update cycle status — activate için \"Active\", close için \"Done\" gönder (ayrı endpoint yok, bu yeterli)",
        authRequired: true,
        params: [{ name: "id", label: "Cycle ID", defaultFrom: "cycleId" }],
        body: () => ({ status: "Active" }),
        exampleResponse: { id: 4, name: "Sprint 1", goal: null, status: "Active", startDate: "2026-08-10", endDate: "2026-08-24", projectId: 4 },
      },
      {
        id: "cycle-summary",
        method: "GET",
        path: "/cycles/{id}/summary",
        desc: "Cycle summary — issue count, done count, days remaining",
        authRequired: true,
        params: [{ name: "id", label: "Cycle ID", defaultFrom: "cycleId" }],
        exampleResponse: { id: 4, name: "Sprint 1", goal: null, status: "Active", startDate: "2026-08-10", endDate: "2026-08-24", issueCount: 3, doneCount: 1, daysRemaining: 5 },
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
        desc: "Kanban board — issue'lar status'e göre gruplu",
        authRequired: true,
        params: [{ name: "projectId", label: "Project ID", defaultFrom: "projectId" }],
        exampleResponse: {
          "To Do": [{ id: 5, title: "Walk", priority: "Low" }],
          "In Progress": [{ id: 6, title: "Run", priority: "Medium" }],
          "in review": [],
          Done: [{ id: 8, title: "talk", priority: "Low" }],
        },
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
        exampleResponse: { projectId: 4, totalIssues: 6, byStatus: { "To Do": 3, "In Progress": 2, Done: 1 }, byPriority: { Medium: 2, High: 2, Low: 2 }, doneCount: 1 },
      },
      {
        id: "dash-activity",
        method: "GET",
        path: "/dashboard/activity",
        desc: "Workspace'teki en yeni 20 issue (son aktivite)",
        authRequired: true,
        query: [{ name: "workspaceId", label: "workspaceId", defaultFrom: "workspaceId" }],
        exampleResponse: [{ id: 12, title: "My first issue", status: "To Do", projectId: 4, createdAt: "2026-08-12T10:44:01.088653" }],
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
        exampleResponse: [{ id: 1, title: "Yeni Çalışma Alanı Daveti", message: "... sizi \"Moon\" çalışma alanına davet etti.", read: false, createdAt: "2026-07-28T15:27:03.361969" }],
      },
      {
        id: "notif-read",
        method: "PUT",
        path: "/notifications/{id}/read",
        desc: "Mark one notification as read",
        authRequired: true,
        params: [{ name: "id", label: "Notification ID", defaultFrom: "notificationId" }],
        exampleResponse: { id: 1, title: "Yeni Çalışma Alanı Daveti", message: "...", read: true, createdAt: "2026-07-28T15:27:03.361969" },
      },
      {
        id: "notif-read-all",
        method: "PUT",
        path: "/notifications/user/{email}/read-all",
        desc: "Mark all notifications as read for a user",
        authRequired: true,
        params: [{ name: "email", label: "Email", defaultFrom: "userId" }],
        exampleResponse: { message: "Tüm bildirimler okundu." },
      },
    ],
  },
];

const mcpTools = [
  { name: "create_issue", desc: "Create a new issue in a project", params: "userId, projectId, title, description?, assigneeEmail?, priority?", example: '"Create a HIGH priority issue for the login bug"', status: "ready", maps: "POST /issues/create" },
  { name: "create_issues", desc: "Bulk-create many issues in one call", params: "userId, projectId, issues[] (1–100)", example: '"Create issues from this PRD all at once"', status: "ready", maps: "POST /issues/create × N" },
  { name: "update_issue", desc: "Update an existing issue", params: "userId, issueId, title?, description?, priority?, assigneeEmail?", example: '"Set this issue\'s priority to High"', status: "ready", maps: "PUT /issues/{id}" },
  { name: "move_issue", desc: "Change an issue's status (board sütunu)", params: "userId, issueId, status", example: '"Move this issue to In Progress"', status: "ready", maps: "PUT /issues/{id}/status" },
  { name: "add_comment", desc: "Add a comment to an issue", params: "userId, issueId, content", example: '"Add the comment \'tested after deploy\'"', status: "ready", maps: "POST /comments/create" },
  { name: "create_project", desc: "Create a new project in a workspace", params: "userId, workspaceId, name", example: '"Create a project named Mobile App"', status: "ready", maps: "POST /projects/create" },
  { name: "invite_member", desc: "Invite a user to workspace by email", params: "userId, workspaceId, email, role?", example: '"Invite ali@company.com as a member"', status: "ready", maps: "POST /workspaces/members/{id}/add" },
  { name: "create_cycle", desc: "Create a sprint/cycle in a project", params: "userId, projectId, name, startDate?, endDate?", example: '"Create a 2-week Sprint 3 cycle"', status: "ready", maps: "POST /cycles/create" },
  { name: "start_cycle", desc: "Activate a planned cycle", params: "userId, cycleId", example: '"Start planned Sprint 3"', status: "ready", maps: 'PUT /cycles/{id}/status { "status": "Active" }' },
  { name: "close_cycle", desc: "Close an active cycle", params: "userId, cycleId", example: '"Close the active cycle"', status: "ready", maps: 'PUT /cycles/{id}/status { "status": "Done" }' },
  { name: "assign_issue_to_cycle", desc: "Add an issue to a cycle", params: "userId, cycleId, issueId", example: '"Add this issue to the current sprint"', status: "ready", maps: "PUT /issues/{id}/cycle" },
  { name: "search_issues", desc: "Search issues by text", params: "userId, query, projectId?", example: '"Find all issues that mention payment"', status: "ready", maps: "GET /issues/search" },
  { name: "get_notifications", desc: "Get recent notifications", params: "userId", example: '"Show my recent notifications"', status: "ready", maps: "GET /notifications/user/{email}" },
  { name: "get_board", desc: "Get a project's Kanban board grouped by status", params: "userId, projectId", example: '"Show me the board for this project"', status: "ready", maps: "GET /boards/project/{projectId}" },
  { name: "get_project_stats", desc: "Get issue counts and status breakdown for a project", params: "userId, projectId", example: '"Summarize this project\'s status"', status: "ready", maps: "GET /dashboard/stats?projectId=" },
  { name: "get_cycle_summary", desc: "Get a cycle's issue count and days remaining", params: "userId, cycleId", example: '"How is Sprint 3 doing?"', status: "ready", maps: "GET /cycles/{id}/summary" },
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
  { uri: "cycle://{cycleId}/summary", desc: "Cycle summary with issue count and days remaining", status: "ready", maps: "GET /cycles/{id}/summary" },
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
      {active ? (<><FiCheck className="text-green-500" /> Copied</>) : (<><FiCopy /> Copy</>)}
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
  return defaultFrom ? (env as any)[defaultFrom] ?? "" : "";
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

function buildJs(baseUrl: string, ep: Endpoint, pathValues: Record<string, string>, queryValues: Record<string, string>, bodyText: string, env: EnvData) {
  const url = buildUrl(baseUrl, ep, pathValues, queryValues, env);
  const headerLines: string[] = [];
  if (ep.authRequired) headerLines.push(`    "Authorization": "Bearer ${env.token || "$TOKEN"}",`);
  if (ep.body) headerLines.push(`    "Content-Type": "application/json",`);
  const headersBlock = headerLines.length ? `\n  headers: {\n${headerLines.join("\n")}\n  },` : "";
  const bodyBlock = ep.body ? `\n  body: JSON.stringify(${bodyText}),` : "";
  return `const res = await fetch("${url}", {\n  method: "${ep.method}",${headersBlock}${bodyBlock}\n});\nconst data = await res.json();\nconsole.log(data);`;
}

function toPythonLiteral(jsonText: string): string {
  try {
    const obj = JSON.parse(jsonText);
    return JSON.stringify(obj, null, 4).replace(/: null/g, ": None").replace(/: true/g, ": True").replace(/: false/g, ": False");
  } catch {
    return jsonText;
  }
}

function buildPython(baseUrl: string, ep: Endpoint, pathValues: Record<string, string>, queryValues: Record<string, string>, bodyText: string, env: EnvData) {
  const url = buildUrl(baseUrl, ep, pathValues, queryValues, env);
  const headerParts: string[] = [];
  if (ep.authRequired) headerParts.push(`"Authorization": "Bearer ${env.token || "$TOKEN"}"`);
  const headersArg = headerParts.length ? `headers={${headerParts.join(", ")}}` : "";
  const jsonArg = ep.body ? `json=${toPythonLiteral(bodyText)}` : "";
  const args = [headersArg, jsonArg].filter(Boolean).join(",\n    ");
  const methodLower = ep.method.toLowerCase();
  return `import requests\n\nresponse = requests.${methodLower}(\n    "${url}"${args ? `,\n    ${args}` : ""}\n)\nprint(response.json())`;
}

function EndpointRow({
  endpoint, env, copiedId, onCopy, onCapture,
}: {
  endpoint: Endpoint; env: EnvData; copiedId: string | null;
  onCopy: (id: string) => void; onCapture: (envKey: EnvKey | "token", value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("curl");
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyOverride, setBodyOverride] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number | null; ok: boolean; body: string; error?: string } | null>(null);

  const defaultBody = endpoint.body ? JSON.stringify(endpoint.body(env), null, 2) : "";
  const bodyText = bodyOverride ?? defaultBody;

  const snippets: Record<Lang, string> = {
    curl: buildCurl(env.baseUrl, endpoint, pathValues, queryValues, bodyText, env),
    js: buildJs(env.baseUrl, endpoint, pathValues, queryValues, bodyText, env),
    python: buildPython(env.baseUrl, endpoint, pathValues, queryValues, bodyText, env),
  };

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
      const res = await fetch(url, { method: endpoint.method, headers, body: endpoint.body ? bodyText : undefined });
      const text = await res.text();
      let pretty = text;
      try {
        const parsed = JSON.parse(text);
        pretty = JSON.stringify(parsed, null, 2);
        if (res.ok) {
          if (endpoint.id === "auth-login" && parsed?.token) onCapture("token", parsed.token);
          else if (endpoint.captureFrom && parsed?.[endpoint.captureFrom.jsonPath] != null) {
            onCapture(endpoint.captureFrom.envKey, String(parsed[endpoint.captureFrom.jsonPath]));
          }
        }
      } catch { /* json değil */ }
      setResult({ status: res.status, ok: res.ok, body: pretty });
    } catch (err) {
      setResult({
        status: null, ok: false, body: "",
        error: "İstek gönderilemedi. Backend çalışıyor mu, CORS bu origin'e izinli mi kontrol edin. (Detay: " + (err instanceof Error ? err.message : String(err)) + ")",
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
          {endpoint.exampleResponse !== undefined && (
            <details className="bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#1e232d] rounded-xl">
              <summary className="cursor-pointer px-4 py-2 text-[12px] font-semibold text-gray-500 dark:text-[#848d9c]">
                Example response ({endpoint.exampleResponse && Array.isArray(endpoint.exampleResponse) ? "200, array" : "200"})
              </summary>
              <pre className="p-4 pt-0 text-[12px] font-mono text-gray-500 dark:text-[#848d9c] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(endpoint.exampleResponse, null, 2)}
              </pre>
            </details>
          )}

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
            <div className="flex justify-between items-center px-2 pt-2 bg-slate-800 dark:bg-[#1e232d]">
              <div className="flex gap-1">
                {(["curl", "js", "python"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-[11px] font-mono rounded-t-md transition-colors ${
                      lang === l ? "bg-slate-900 dark:bg-[#0b0d12] text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {l === "curl" ? "cURL" : l === "js" ? "JavaScript" : "Python"}
                  </button>
                ))}
              </div>
              <CopyButton text={snippets[lang]} id={`${endpoint.id}-${lang}`} active={copiedId === `${endpoint.id}-${lang}`} onCopy={onCopy} />
            </div>
            <pre className="p-4 text-[12.5px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{snippets[lang]}</pre>
          </div>

          {result && (
            <div className="bg-slate-900 dark:bg-[#0b0d12] rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 bg-slate-800 dark:bg-[#1e232d]">
                <span className="text-[11px] font-mono text-gray-400">response</span>
                {result.status !== null && (
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${result.ok ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"}`}>
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
  const [search, setSearch] = useState("");
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
      const updated = { ...d, [envKey]: value } as EnvData;
      if (envKey === "token") {
        const email = decodeJwtEmail(value);
        if (email) updated.userId = email;
      }
      return updated;
    });
  };

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        endpoints: cat.endpoints.filter(
          (ep) => ep.path.toLowerCase().includes(q) || ep.desc.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.endpoints.length > 0);
  }, [search]);

  const scrollToCategory = (title: string) => {
    const el = document.getElementById(`cat-${title.replace(/\s+/g, "-")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <div key={c.key} className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl p-4 shadow-sm flex items-center justify-between gap-2">
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
                    <span className={`normal-case font-normal text-[11px] px-2 py-0.5 rounded-full ${owner === envData.userId ? "bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]" : "bg-amber-50 dark:bg-[#241d0f] text-amber-600 dark:text-[#f59e0b]"}`}>
                      bu token: {owner}{owner !== envData.userId && " ⚠️ User/Email ile uyuşmuyor"}
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
                tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-[#11141b] text-gray-600 dark:text-[#848d9c] border border-gray-200 dark:border-[#1e232d] hover:bg-gray-50 dark:hover:bg-[#1e232d]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "rest" && (
          <div className="flex flex-col gap-6">
            {/* Arama + hızlı atlama */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2.5 text-[14px] bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-xl text-slate-900 dark:text-[#e2e8f0] outline-none focus:border-blue-400"
                  placeholder="Endpoint ara... (örn. issue, workspace, cycle)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {!search && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.title}
                      onClick={() => scrollToCategory(cat.title)}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] text-gray-600 dark:text-[#848d9c] hover:bg-gray-50 dark:hover:bg-[#1e232d] transition-colors"
                    >
                      {cat.title} <span className="text-gray-400">({cat.endpoints.length})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredCategories.length === 0 && (
              <p className="text-[13px] text-gray-400 text-center py-8">"{search}" ile eşleşen endpoint bulunamadı.</p>
            )}

            {filteredCategories.map((cat) => (
              <div key={cat.title} id={`cat-${cat.title.replace(/\s+/g, "-")}`} className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm scroll-mt-4">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">{cat.title}</h3>
                <div className="flex flex-col">
                  {cat.endpoints.map((ep) => (
                    <EndpointRow key={ep.id} endpoint={ep} env={envData} copiedId={copiedId} onCopy={flash} onCapture={handleCapture} />
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white dark:bg-[#11141b] border border-dashed border-gray-300 dark:border-[#2a303c] rounded-2xl p-6">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Henüz backend'de yok</h3>
              <p className="text-[13px] text-gray-500 dark:text-[#848d9c]">
                Boards, Cycles, Dashboard/Activity tamamlandı. Tek eksik: issue↔cycle bağlantısını değiştiren bulk/otomatik
                işlemler (örn. bir cycle kapanınca içindeki açık issue'ları otomatik bir sonraki cycle'a taşıma gibi
                "akıllı" özellikler) — istenirse eklenir.
              </p>
            </div>
          </div>
        )}

        {tab === "mcp-tools" && (
          <div className="flex flex-col gap-8">
            <div className="bg-amber-50 dark:bg-[#241d0f] border border-amber-200 dark:border-[#3a2e14] rounded-xl p-4">
              <p className="text-[13px] text-amber-800 dark:text-[#f59e0b]">
                <code className="font-mono">flowbit-mcp/index.ts</code> artık gerçek bir MCP server — aşağıdaki tool'ların
                tamamı Hazır ve REST endpoint'lerine bağlı.
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
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]">Hazır</span>
                    </div>
                    <p className="text-[13px] text-gray-600 dark:text-[#c7ccd4] mb-1">{t.desc}</p>
                    <p className="text-[11.5px] font-mono text-gray-400 mb-1">{t.params}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[#5b6472] italic mb-1">Example: {t.example}</p>
                    <p className="text-[11px] font-mono text-gray-400">→ {t.maps}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">MCP Prompts</h3>
              <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">Hazır — flowbit-mcp/index.ts içinde tanımlı, backend gerektirmez.</p>
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
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-50 dark:bg-[#122019] text-green-600 dark:text-[#22c55e]">Hazır</span>
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
  const localConfig = `{\n  "mcpServers": {\n    "flowbit": {\n      "command": "npx",\n      "args": ["tsx", "flowbit-mcp/index.ts"],\n      "env": {\n        "FLOWBIT_TOKEN": "<POST /auth/login veya /api-keys/create'den aldığın token>"\n      }\n    }\n  }\n}`;
  const remoteConfig = `{\n  "mcpServers": {\n    "flowbit": {\n      "url": "https://<mcp-servisinin-railway-url>/mcp",\n      "headers": {\n        "Authorization": "Bearer <fb_... API key>"\n      }\n    }\n  }\n}`;
  const stdioRun = `npx tsx flowbit-mcp/index.ts`;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Yerel (stdio)</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
          Add this block to the client's MCP settings file (Claude Desktop / Cursor), then restart the client.
        </p>
        <CodeBlock label="config.json" code={localConfig} id="mcp-local-config" copiedId={copiedId} onCopy={onCopy} />
      </div>

      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Uzak (hosted) — Railway</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-4">
          Backend ve MCP sunucusu Railway'de yayında. "API Keys" bölümünden bir key oluştur, aşağıdaki bloğu kullan.
        </p>
        <CodeBlock label="config.json" code={remoteConfig} id="mcp-remote-config" copiedId={copiedId} onCopy={onCopy} />
      </div>

      <div className="bg-white dark:bg-[#11141b] border border-gray-200 dark:border-[#1e232d] rounded-2xl p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Run with command</h3>
        <p className="text-[13px] text-gray-500 dark:text-[#848d9c] mb-3">Terminalden elle çalıştırmak için:</p>
        <CodeBlock label="stdio" code={stdioRun} id="mcp-stdio-run" copiedId={copiedId} onCopy={onCopy} />
      </div>
    </div>
  );
}