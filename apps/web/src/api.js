const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() ||
    "/api";
const readDashboardToken = () => (window.localStorage.getItem("dc_dashboard_token") ?? "").trim();
const readLegacyAdminKey = () => (window.localStorage.getItem("dc_admin_key") ?? "").trim();
const readSelectedGuildId = () => (window.localStorage.getItem("dc_dashboard_selected_guild") ?? "").trim();
const request = async (path, options) => {
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
            const parsed = JSON.parse(raw);
            message = parsed.message || raw;
        }
        catch {
            message = raw;
        }
        throw new Error(message);
    }
    return response.json();
};
export const loginDashboard = (payload) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
});
export const fetchDashboardSession = () => request("/auth/session");
export const logoutDashboard = () => request("/auth/logout", { method: "POST" });
export const fetchDiscordDashboardLogin = () => request("/auth/discord/start");
export const fetchSettings = () => request("/settings");
export const saveSettings = (settings) => request("/settings", { method: "PUT", body: JSON.stringify(settings) });
export const fetchBotGuilds = () => request("/bot/guilds");
export const fetchBotGuildChannels = (guildId) => request(`/bot/guilds/${guildId}/channels`);
export const setBotGuildApproval = (guildId, approved) => request(`/bot/guilds/${guildId}/approval`, {
    method: "POST",
    body: JSON.stringify({ approved })
});
export const sendBotMessageFromDashboard = (payload) => request("/bot/messages", {
    method: "POST",
    body: JSON.stringify(payload)
});
export const fetchStats = () => request("/stats");
export const fetchReviews = () => request("/reviews");
export const fetchTickets = () => request("/tickets");
export const fetchGiveaways = () => request("/giveaways");
export const createGiveawayFromDashboard = (payload) => request("/giveaways", { method: "POST", body: JSON.stringify(payload) });
export const drawGiveawayFromDashboard = (id) => request(`/giveaways/${id}/draw`, { method: "POST" });
export const closeGiveawayFromDashboard = (id) => request(`/giveaways/${id}/close`, { method: "POST" });
export const fetchPartnerships = () => request("/partnerships");
export const savePartnershipFromDashboard = (payload) => request(`/partnerships/${payload.id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deletePartnershipFromDashboard = (id) => request(`/partnerships/${id}`, { method: "DELETE" });
export const fetchPartnershipApplications = () => request("/partnership-applications");
export const reviewPartnershipApplicationFromDashboard = (payload) => request(`/partnership-applications/${payload.id}/review`, {
    method: "POST",
    body: JSON.stringify({ status: payload.status, reviewNote: payload.reviewNote ?? "" })
});
export const approvePartnershipAndCreateFromDashboard = (payload) => request(`/partnership-applications/${payload.id}/approve-and-create`, {
    method: "POST",
    body: JSON.stringify(payload)
});
export const fetchBalances = () => request("/balances");
export const saveBalance = (payload) => request(`/balances/${payload.userId}`, {
    method: "PUT",
    body: JSON.stringify({ username: payload.username, balance: payload.balance, note: payload.note ?? "" })
});
export const adjustBalanceFromDashboard = (payload) => request(`/balances/${payload.userId}/adjust`, {
    method: "POST",
    body: JSON.stringify({ username: payload.username, amount: payload.amount, note: payload.note ?? "" })
});
export const deleteBalanceFromDashboard = (userId) => request(`/balances/${userId}`, { method: "DELETE" });
export const closeTicketFromDashboard = (id) => request(`/tickets/${id}/close`, { method: "POST" });
export const fetchOpayStatus = () => request("/opay/status");
export const fetchPayuniStatus = () => request("/payuni/status");
export const fetchStoreOrdersForDashboard = () => request("/storefront/admin/orders");
export const updateStoreOrderStatusFromDashboard = (id, status) => request(`/storefront/admin/orders/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status })
});
export const sendStoreOrderMessageFromDashboard = (id, message) => request(`/storefront/admin/orders/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message })
});
export const createOpayCheckout = (payload) => request("/opay/cvs-checkout", { method: "POST", body: JSON.stringify(payload) });
export const createPayuniDirectCodeFromDashboard = (payload) => request("/payuni/direct-code", {
    method: "POST",
    body: JSON.stringify(payload)
});
//# sourceMappingURL=api.js.map