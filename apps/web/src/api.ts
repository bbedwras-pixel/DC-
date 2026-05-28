import { BalanceRecord, DashboardAccountRole, DashboardStats, GiveawayRecord, GuildSettings, PartnershipApplication, PartnershipServer, ReviewRecord, StoreOrderRecord } from "@dc/shared";

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "/api";

export type DashboardSessionAccount = {
  id: string;
  username: string;
  displayName: string;
  role: DashboardAccountRole;
  enabled: boolean;
  authMode: "local" | "discord" | "both";
  allowedGuildIds: string[];
  provider: "local" | "discord" | "legacy";
  discordUserId?: string;
};

const readDashboardToken = () => (window.localStorage.getItem("dc_dashboard_token") ?? "").trim();
const readLegacyAdminKey = () => (window.localStorage.getItem("dc_admin_key") ?? "").trim();
const readSelectedGuildId = () => (window.localStorage.getItem("dc_dashboard_selected_guild") ?? "").trim();

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const dashboardToken = readDashboardToken();
  const legacyAdminKey = readLegacyAdminKey();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(dashboardToken ? { "x-dashboard-token": dashboardToken } : {}),
      ...(!dashboardToken && legacyAdminKey ? { "x-admin-key": legacyAdminKey } : {}),
      ...(readSelectedGuildId() ? { "x-dashboard-guild-id": readSelectedGuildId() } : {}),
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      message = parsed.message || raw;
    } catch {
      message = raw;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const loginDashboard = (payload: { username: string; password: string }) =>
  request<{ ok: true; token: string; account: DashboardSessionAccount }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
export const fetchDashboardSession = () =>
  request<{ ok: true; account: DashboardSessionAccount; legacy: boolean }>("/auth/session");
export const logoutDashboard = () => request<{ ok: true }>("/auth/logout", { method: "POST" });
export const fetchDiscordDashboardLogin = () => request<{ ok: true; url: string }>("/auth/discord/start");
export const fetchSettings = () => request<GuildSettings>("/settings");
export const saveSettings = (settings: GuildSettings) =>
  request<GuildSettings>("/settings", { method: "PUT", body: JSON.stringify(settings) });
export const fetchBotGuilds = () => request<{ ready: boolean; guilds: Array<{ id: string; name: string; iconUrl?: string | null; memberCount?: number; approved: boolean; isPrimary: boolean; label: string }> }>("/bot/guilds");
export const fetchBotGuildChannels = (guildId: string) =>
  request<{ channels: Array<{ id: string; name: string; type: number }>; roles: Array<{ id: string; name: string }> }>(`/bot/guilds/${guildId}/channels`);
export const setBotGuildApproval = (guildId: string, approved: boolean) =>
  request<{ ok: true; linkedGuilds: GuildSettings["linkedGuilds"] }>(`/bot/guilds/${guildId}/approval`, {
    method: "POST",
    body: JSON.stringify({ approved })
  });
export const sendBotMessageFromDashboard = (payload: { guildId: string; channelId: string; content: string }) =>
  request<{ ok: true; messageId: string }>("/bot/messages", {
    method: "POST",
    body: JSON.stringify(payload)
  });
export const fetchStats = () => request<DashboardStats>("/stats");
export const fetchReviews = () => request<ReviewRecord[]>("/reviews");
export const fetchTickets = () => request<any[]>("/tickets");
export const fetchGiveaways = () => request<GiveawayRecord[]>("/giveaways");
export const createGiveawayFromDashboard = (payload: { guildId: string; channelId: string; prize: string; minutes: number; winnersCount: number }) =>
  request<GiveawayRecord>("/giveaways", { method: "POST", body: JSON.stringify(payload) });
export const drawGiveawayFromDashboard = (id: string) => request<GiveawayRecord>(`/giveaways/${id}/draw`, { method: "POST" });
export const closeGiveawayFromDashboard = (id: string) => request<GiveawayRecord>(`/giveaways/${id}/close`, { method: "POST" });
export const fetchPartnerships = () => request<PartnershipServer[]>("/partnerships");
export const savePartnershipFromDashboard = (payload: PartnershipServer) =>
  request<PartnershipServer>(`/partnerships/${payload.id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deletePartnershipFromDashboard = (id: string) => request<{ ok: true }>(`/partnerships/${id}`, { method: "DELETE" });
export const fetchPartnershipApplications = () => request<PartnershipApplication[]>("/partnership-applications");
export const reviewPartnershipApplicationFromDashboard = (payload: { id: string; status: "approved" | "rejected"; reviewNote?: string }) =>
  request<PartnershipApplication>(`/partnership-applications/${payload.id}/review`, {
    method: "POST",
    body: JSON.stringify({ status: payload.status, reviewNote: payload.reviewNote ?? "" })
  });
export const approvePartnershipAndCreateFromDashboard = (payload: {
  id: string;
  reviewNote?: string;
  featured?: boolean;
  enabled?: boolean;
  mutualPromotion?: boolean;
  bannerUrl?: string;
  tags?: string[];
}) =>
  request<{ application: PartnershipApplication; partnership: PartnershipServer }>(`/partnership-applications/${payload.id}/approve-and-create`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
export const fetchBalances = () => request<BalanceRecord[]>("/balances");
export const saveBalance = (payload: { userId: string; username: string; balance: number; note?: string }) =>
  request<BalanceRecord>(`/balances/${payload.userId}`, {
    method: "PUT",
    body: JSON.stringify({ username: payload.username, balance: payload.balance, note: payload.note ?? "" })
  });
export const adjustBalanceFromDashboard = (payload: { userId: string; username: string; amount: number; note?: string }) =>
  request<BalanceRecord>(`/balances/${payload.userId}/adjust`, {
    method: "POST",
    body: JSON.stringify({ username: payload.username, amount: payload.amount, note: payload.note ?? "" })
  });
export const deleteBalanceFromDashboard = (userId: string) => request<{ ok: true }>(`/balances/${userId}`, { method: "DELETE" });
export const closeTicketFromDashboard = (id: string) => request<{ ok: true }>(`/tickets/${id}/close`, { method: "POST" });
export const fetchOpayStatus = () => request<{ configured: boolean; stage: boolean }>("/opay/status");
export const fetchPayuniStatus = () => request<{ configured: boolean; stage: boolean }>("/payuni/status");
export const fetchStoreOrdersForDashboard = () => request<StoreOrderRecord[]>("/storefront/admin/orders");
export const updateStoreOrderStatusFromDashboard = (id: string, status: StoreOrderRecord["status"]) =>
  request<StoreOrderRecord>(`/storefront/admin/orders/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status })
  });
export const sendStoreOrderMessageFromDashboard = (id: string, message: string) =>
  request<StoreOrderRecord>(`/storefront/admin/orders/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
export const createOpayCheckout = (payload: {
  amount: number;
  itemName: string;
  tradeDesc: string;
  subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
}) => request<{ action: string; fields: Record<string, string> }>("/opay/cvs-checkout", { method: "POST", body: JSON.stringify(payload) });
export const createPayuniDirectCodeFromDashboard = (payload: {
  amount: number;
  itemName: string;
  tradeDesc: string;
  subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
}) => request<{ ok: true; paymentCode?: string; expireAt?: string; message?: string }>("/payuni/direct-code", {
  method: "POST",
  body: JSON.stringify(payload)
});
