import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Component, useEffect, useState } from "react";
import { adjustBalanceFromDashboard, approvePartnershipAndCreateFromDashboard, closeGiveawayFromDashboard, closeTicketFromDashboard, createGiveawayFromDashboard, createOpayCheckout, createPayuniDirectCodeFromDashboard, deleteBalanceFromDashboard, deletePartnershipFromDashboard, fetchBalances, fetchBotGuildChannels, fetchBotGuilds, fetchDashboardSession, fetchDiscordDashboardLogin, fetchGiveaways, fetchOpayStatus, fetchPayuniStatus, fetchPartnershipApplications, fetchPartnerships, fetchReviews, fetchSettings, fetchStoreOrdersForDashboard, fetchStats, fetchTickets, drawGiveawayFromDashboard, loginDashboard, logoutDashboard, reviewPartnershipApplicationFromDashboard, saveBalance, savePartnershipFromDashboard, saveSettings, sendStoreOrderMessageFromDashboard, sendBotMessageFromDashboard, setBotGuildApproval, updateStoreOrderStatusFromDashboard } from "./api";
const readStoredSelectedGuild = () => (window.localStorage.getItem("dc_dashboard_selected_guild") ?? "").trim();
const emptyStats = {
    totalReviews: 0,
    averageRating: 0,
    openTickets: 0,
    completedTickets: 0,
    autoReplyRules: 0,
    blacklistedUsers: 0,
    balanceUsers: 0,
    totalStoredBalance: 0,
    storefrontTotalOrders: 0,
    storefrontPendingOrders: 0,
    storefrontPaidOrders: 0,
    storefrontRevenue: 0,
    storefrontTodayRevenue: 0,
    storefrontWeekRevenue: 0,
    storefrontMonthRevenue: 0,
    storefrontTodayOrders: 0,
    storefrontWeekOrders: 0,
    storefrontMonthOrders: 0
};
const sectionIds = {
    overview: "overview",
    brand: "brand-settings",
    storefront: "storefront-settings",
    accounts: "account-settings",
    serverControl: "server-control",
    multiGuild: "multi-guild-settings",
    ticket: "ticket-settings",
    moderation: "moderation-settings",
    products: "products-settings",
    blacklist: "blacklist-settings",
    balance: "balance-settings",
    giveaways: "giveaway-settings",
    partnerships: "partnership-settings",
    applications: "partnership-applications",
    reply: "reply-settings",
    tickets: "ticket-operations",
    faq: "faq-settings",
    payment: "payment-tools"
};
const readStoredSectionView = () => {
    const hash = window.location.hash.replace(/^#/, "").trim();
    return Object.values(sectionIds).includes(hash) ? hash : sectionIds.brand;
};
const categoryViews = [
    { id: "store", label: "商城設定", icon: "🛍️", description: "品牌、商品、FAQ、付款與前台", target: sectionIds.brand, sections: [sectionIds.brand, sectionIds.storefront, sectionIds.products, sectionIds.faq, sectionIds.payment] },
    { id: "server", label: "伺服器設定", icon: "🛰️", description: "群組、工單、抽獎、防刷頻與多群組", target: sectionIds.serverControl, sections: [sectionIds.serverControl, sectionIds.multiGuild, sectionIds.ticket, sectionIds.giveaways, sectionIds.moderation, sectionIds.reply] },
    { id: "orders", label: "訂單與客服", icon: "💬", description: "商城訂單、餘額、黑名單與工單操作", target: sectionIds.storefront, sections: [sectionIds.storefront, sectionIds.balance, sectionIds.blacklist, sectionIds.tickets] },
    { id: "business", label: "營運管理", icon: "📈", description: "合作名單、合作申請與帳號權限", target: sectionIds.partnerships, sections: [sectionIds.partnerships, sectionIds.applications, sectionIds.accounts] }
];
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const newReply = () => ({
    id: createId("reply"),
    enabled: true,
    trigger: "",
    response: "",
    matchMode: "includes",
    ignoreCase: true,
    cooldownSeconds: 10
});
const newProduct = () => ({
    id: createId("product"),
    name: "",
    category: "",
    priceLabel: "",
    description: "",
    imageUrl: "",
    stockStatus: "in_stock",
    stockNote: "",
    featured: false,
    enabled: true
});
const newBlacklist = () => ({
    id: createId("blacklist"),
    userId: "",
    note: ""
});
const newLinkedGuild = () => ({
    guildId: "",
    label: "",
    enabled: true,
    reviewChannelId: "",
    ticketCategoryId: "",
    paidTicketCategoryId: "",
    supportRoleId: "",
    autoRoleId: "",
    ticketLogChannelId: "",
    transcriptChannelId: "",
    completedCountChannelId: "",
    completedCountLabel: "📊｜完成的票單數",
    moderationLogChannelId: "",
    productAnnouncementChannelId: ""
});
const newBalanceDraft = () => ({
    userId: "",
    username: "",
    amount: 0,
    note: ""
});
const newDashboardAccount = (role = "admin") => ({
    id: createId("account"),
    username: "",
    password: "",
    role,
    enabled: true,
    displayName: "",
    authMode: "both",
    discordUserId: "",
    allowedGuildIds: role === "developer" || role === "owner" ? ["*"] : []
});
const newPartnershipDraft = () => ({
    id: createId("partner"),
    serverName: "",
    description: "",
    inviteUrl: "",
    bannerUrl: "",
    contact: "",
    tags: [],
    mutualPromotion: true,
    featured: false,
    enabled: true,
    createdAt: "",
    updatedAt: ""
});
const prettyDate = (value) => {
    if (!value)
        return "尚未更新";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString("zh-TW");
};
const guildInitials = (name) => name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DC";
const splitImageGallery = (value) => (value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
const productStockLabel = (value) => {
    if (value === "out_of_stock")
        return "缺貨中";
    if (value === "restocking")
        return "補貨中";
    return "現貨供應";
};
const productStockTone = (value) => {
    if (value === "out_of_stock")
        return "tone-warn";
    if (value === "restocking")
        return "tone-info";
    return "tone-ok";
};
const ticketTone = (status) => {
    if (status === "completed")
        return "ok";
    if (status === "processing")
        return "info";
    if (status === "paid")
        return "brand";
    if (status === "cancelled" || status === "closed")
        return "muted";
    return "warn";
};
const accountRoleLabel = (role) => {
    if (role === "developer")
        return "開發者";
    if (role === "owner")
        return "老闆";
    return "管理員";
};
const storeOrderStatusLabel = (status) => {
    switch (status) {
        case "pending_payment":
            return "待付款";
        case "payment_code_ready":
            return "付款代碼已建立";
        case "paid":
            return "已付款";
        case "processing":
            return "處理中";
        case "completed":
            return "已完成";
        case "cancelled":
            return "已取消";
        default:
            return status;
    }
};
const Section = ({ id, title, subtitle, meta, children }) => (_jsxs("section", { className: "card section-card", id: id, children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow section-kicker", children: "Workspace Page" }), _jsx("h2", { children: title }), _jsx("p", { className: "section-summary", children: subtitle })] }), meta ? _jsx("span", { className: "section-meta", children: meta }) : null] }), _jsx("div", { className: "section-body", children: children })] }));
const Stat = ({ label, value, tone, hint }) => (_jsxs("article", { className: `stat-tile tone-${tone}`, children: [_jsx("span", { children: label }), _jsx("strong", { children: value }), _jsx("small", { children: hint })] }));
const MetricBar = ({ label, value, percent, tone }) => (_jsxs("div", { className: `metric-bar-card tone-${tone}`, children: [_jsxs("div", { className: "metric-bar-head", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }), _jsx("div", { className: "metric-bar-track", children: _jsx("div", { className: `metric-bar-fill tone-${tone}`, style: { width: `${Math.max(8, Math.min(100, percent))}%` } }) })] }));
class DashboardErrorBoundary extends Component {
    state = {
        hasError: false,
        message: ""
    };
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: error.message
        };
    }
    componentDidCatch(error, info) {
        console.error("Dashboard crashed:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("main", { className: "dashboard login-dashboard", style: {
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "32px 20px",
                    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                    color: "#0f172a"
                }, children: _jsx("section", { className: "login-shell", style: { width: "100%", maxWidth: "980px", position: "relative", zIndex: 2, display: "grid", placeItems: "center" }, children: _jsxs("div", { className: "card login-card", style: {
                            width: "min(100%, 760px)",
                            display: "grid",
                            gap: "18px",
                            padding: "32px",
                            borderRadius: "28px",
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)"
                        }, children: [_jsx("p", { className: "eyebrow", children: "Dashboard Error" }), _jsx("h1", { children: "\u5F8C\u53F0\u8B80\u53D6\u5931\u6557" }), _jsx("p", { children: "\u524D\u7AEF\u5728\u8F09\u5165\u63A7\u5236\u53F0\u6642\u9047\u5230\u4F8B\u5916\uFF0C\u5DF2\u5148\u5207\u5230\u9019\u500B\u4FDD\u5E95\u9801\u9762\uFF0C\u907F\u514D\u6574\u9801\u767D\u756B\u9762\u3002" }), _jsxs("div", { className: "login-note compact-note", children: [_jsx("strong", { children: "\u932F\u8AA4\u8A0A\u606F\uFF1A" }), _jsx("span", { children: this.state.message || "未知錯誤" })] }), _jsxs("div", { className: "login-note", children: [_jsx("strong", { children: "\u4E0B\u4E00\u6B65\uFF1A" }), _jsx("span", { children: "\u6211\u5011\u5148\u628A\u9019\u500B\u932F\u8AA4\u908A\u754C\u7559\u8457\uFF0C\u63A5\u8457\u6211\u6703\u5E6B\u4F60\u628A\u5546\u54C1\u8207\u767B\u5165\u756B\u9762\u6574\u7406\u6210\u53EF\u6B63\u5E38\u986F\u793A\u7684\u7248\u672C\u3002" })] })] }) }) }));
        }
        return this.props.children;
    }
}
function DashboardApp() {
    const [settings, setSettings] = useState(null);
    const [stats, setStats] = useState(emptyStats);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("讀取中...");
    const [authLoading, setAuthLoading] = useState(true);
    const [authAccount, setAuthAccount] = useState(() => {
        const raw = window.localStorage.getItem("dc_dashboard_account");
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    });
    const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
    const [opayReady, setOpayReady] = useState(false);
    const [payuniReady, setPayuniReady] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [storeOrders, setStoreOrders] = useState([]);
    const [giveaways, setGiveaways] = useState([]);
    const [balances, setBalances] = useState([]);
    const [partnerships, setPartnerships] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [applications, setApplications] = useState([]);
    const [partnershipDraft, setPartnershipDraft] = useState(newPartnershipDraft());
    const [balanceDraft, setBalanceDraft] = useState(newBalanceDraft());
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [partnershipLoading, setPartnershipLoading] = useState(false);
    const [storefrontLoading, setStorefrontLoading] = useState(false);
    const [botGuilds, setBotGuilds] = useState([]);
    const [selectedGuildId, setSelectedGuildId] = useState(() => readStoredSelectedGuild());
    const [guildResources, setGuildResources] = useState({ channels: [], roles: [] });
    const [guildLoading, setGuildLoading] = useState(false);
    const [giveawayLoading, setGiveawayLoading] = useState(false);
    const [messageDraft, setMessageDraft] = useState({ channelId: "", content: "" });
    const [giveawayDraft, setGiveawayDraft] = useState({ channelId: "", prize: "", minutes: 30, winnersCount: 1 });
    const [orderReplyDrafts, setOrderReplyDrafts] = useState({});
    const [activeCategoryView, setActiveCategoryView] = useState("store");
    const [activeSectionView, setActiveSectionView] = useState(() => readStoredSectionView());
    const [insightRange, setInsightRange] = useState("day");
    const [productSearch, setProductSearch] = useState("");
    const [productStatusFilter, setProductStatusFilter] = useState("all");
    const [baseline, setBaseline] = useState("");
    const [paymentForm, setPaymentForm] = useState({
        amount: 100,
        itemName: "",
        tradeDesc: "商城快速收款",
        subPayment: "CVS"
    });
    const [paymentToolStatus, setPaymentToolStatus] = useState(null);
    const makeBaseline = (nextSettings) => JSON.stringify({ settings: nextSettings });
    const storeSession = (token, account) => {
        window.localStorage.setItem("dc_dashboard_token", token);
        window.localStorage.setItem("dc_dashboard_account", JSON.stringify(account));
        window.localStorage.removeItem("dc_admin_key");
        if (!readStoredSelectedGuild() && account.allowedGuildIds.length) {
            const nextGuildId = account.allowedGuildIds.includes("*") ? "" : account.allowedGuildIds[0];
            if (nextGuildId) {
                window.localStorage.setItem("dc_dashboard_selected_guild", nextGuildId);
                setSelectedGuildId(nextGuildId);
            }
        }
        setAuthAccount(account);
    };
    const clearSession = () => {
        window.localStorage.removeItem("dc_dashboard_token");
        window.localStorage.removeItem("dc_dashboard_account");
        window.localStorage.removeItem("dc_admin_key");
        window.localStorage.removeItem("dc_dashboard_selected_guild");
        setSelectedGuildId("");
        setAuthAccount(null);
    };
    const reloadDashboard = async (message = "資料同步完成", scopedAccount) => {
        const [settingsData, statsData] = await Promise.all([fetchSettings(), fetchStats()]);
        const [ticketData, storeOrderData, giveawayData, balanceData, partnershipData, applicationData, reviewData, opay, payuni, guildState] = await Promise.all([
            fetchTickets().catch(() => []),
            fetchStoreOrdersForDashboard().catch(() => []),
            fetchGiveaways().catch(() => []),
            fetchBalances().catch(() => []),
            fetchPartnerships().catch(() => []),
            fetchPartnershipApplications().catch(() => []),
            fetchReviews().catch(() => []),
            fetchOpayStatus().catch(() => ({ configured: false, stage: true })),
            fetchPayuniStatus().catch(() => ({ configured: false, stage: true })),
            fetchBotGuilds().catch(() => ({ ready: false, guilds: [] }))
        ]);
        setSettings(settingsData);
        setStats(statsData);
        setTickets(ticketData);
        setStoreOrders(storeOrderData);
        setGiveaways(giveawayData);
        setBalances(balanceData);
        setPartnerships(partnershipData);
        setApplications(applicationData);
        setReviews(reviewData);
        setOpayReady(opay.configured);
        setPayuniReady(payuni.configured);
        const activeAccount = scopedAccount ?? authAccount;
        const allowedGuildIds = activeAccount?.allowedGuildIds.includes("*")
            ? guildState.guilds.map((item) => item.id)
            : (activeAccount?.allowedGuildIds ?? []);
        const scopedGuilds = allowedGuildIds.length
            ? guildState.guilds.filter((item) => allowedGuildIds.includes(item.id))
            : guildState.guilds;
        setBotGuilds(scopedGuilds);
        setSelectedGuildId((current) => {
            const next = current && scopedGuilds.some((item) => item.id === current)
                ? current
                : scopedGuilds[0]?.id || settingsData.guildId;
            if (next) {
                window.localStorage.setItem("dc_dashboard_selected_guild", next);
            }
            return next;
        });
        setBaseline(makeBaseline(settingsData));
        setStatus(message);
    };
    useEffect(() => {
        const load = async () => {
            const hasStoredToken = Boolean(window.localStorage.getItem("dc_dashboard_token")?.trim());
            const hasLegacyAdminKey = Boolean(window.localStorage.getItem("dc_admin_key")?.trim());
            if (!hasStoredToken && !hasLegacyAdminKey) {
                setStatus("請先登入後台");
                setAuthLoading(false);
                return;
            }
            try {
                const session = await fetchDashboardSession();
                setAuthAccount(session.account);
                window.localStorage.setItem("dc_dashboard_account", JSON.stringify(session.account));
                await reloadDashboard(session.legacy ? "已使用舊版管理金鑰登入" : "資料同步完成", session.account);
            }
            catch (error) {
                clearSession();
                setStatus(`請先登入後台：${error instanceof Error ? error.message : "未知錯誤"}`);
            }
            finally {
                setAuthLoading(false);
            }
        };
        void load();
    }, []);
    const settingsReady = settings !== null;
    const updateBlacklist = (index, next) => {
        if (!settings)
            return;
        const blacklist = [...settings.ticket.blacklist];
        blacklist[index] = next;
        setSettings({ ...settings, ticket: { ...settings.ticket, blacklist } });
    };
    const persist = async () => {
        setSaving(true);
        try {
            if (!settings)
                return;
            const next = await saveSettings(settings);
            setSettings(next);
            try {
                await reloadDashboard("儲存成功");
            }
            catch (reloadError) {
                console.warn("[dashboard] reload after save failed", reloadError);
                setStatus("儲存成功，但部分資料同步失敗，請稍後再重新整理一次");
            }
        }
        catch (error) {
            setStatus(`儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setSaving(false);
        }
    };
    const login = async () => {
        setAuthLoading(true);
        try {
            const session = await loginDashboard(loginForm);
            storeSession(session.token, session.account);
            await reloadDashboard(`已登入為${accountRoleLabel(session.account.role)}`, session.account);
        }
        catch (error) {
            setStatus(`登入失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setAuthLoading(false);
        }
    };
    const loginWithDiscord = async () => {
        setAuthLoading(true);
        try {
            const result = await fetchDiscordDashboardLogin();
            window.location.href = result.url;
        }
        catch (error) {
            setStatus(`Discord 登入啟動失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
            setAuthLoading(false);
        }
    };
    const signOut = async () => {
        try {
            await logoutDashboard();
        }
        catch {
            // Ignore logout failures and clear local state anyway.
        }
        finally {
            clearSession();
            setSettings(null);
            setStatus("已登出後台");
        }
    };
    const refreshAll = async () => {
        try {
            await reloadDashboard("已重新整理全部資料");
        }
        catch (error) {
            setStatus(`重新整理失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
    };
    useEffect(() => {
        const loadGuildResources = async () => {
            if (!selectedGuildId)
                return;
            setGuildLoading(true);
            try {
                const resources = await fetchBotGuildChannels(selectedGuildId);
                setGuildResources(resources);
                setMessageDraft((current) => ({
                    channelId: current.channelId || resources.channels.find((item) => item.type === 0 || item.type === 5)?.id || "",
                    content: current.content
                }));
                setGiveawayDraft((current) => ({
                    ...current,
                    channelId: current.channelId || resources.channels.find((item) => item.type === 0 || item.type === 5)?.id || ""
                }));
            }
            catch {
                setGuildResources({ channels: [], roles: [] });
            }
            finally {
                setGuildLoading(false);
            }
        };
        void loadGuildResources();
    }, [selectedGuildId]);
    useEffect(() => {
        if (selectedGuildId) {
            window.localStorage.setItem("dc_dashboard_selected_guild", selectedGuildId);
        }
    }, [selectedGuildId]);
    if (!settingsReady || !settings) {
        return (_jsxs("main", { className: "dashboard login-dashboard", style: {
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 20px",
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                color: "#0f172a"
            }, children: [_jsx("div", { className: "mesh mesh-a" }), _jsx("div", { className: "mesh mesh-b" }), _jsx("section", { className: "login-shell", style: {
                        width: "100%",
                        maxWidth: "980px",
                        position: "relative",
                        zIndex: 2,
                        display: "grid",
                        placeItems: "center"
                    }, children: _jsxs("div", { className: "card login-card", style: {
                            width: "min(100%, 760px)",
                            display: "grid",
                            gap: "18px",
                            padding: "32px",
                            borderRadius: "28px",
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)"
                        }, children: [_jsx("p", { className: "eyebrow", children: "Dashboard Access" }), _jsx("h1", { children: "\u767B\u5165\u5546\u57CE\u63A7\u5236\u53F0" }), _jsx("p", { children: "\u4F60\u53EF\u4EE5\u7528\u5546\u57CE\u5C08\u5C6C\u5E33\u865F\u767B\u5165\uFF0C\u4E5F\u53EF\u4EE5\u7528 Discord \u767B\u5165\u5F8C\u53EA\u770B\u5230\u4F60\u6709\u7BA1\u7406\u6B0A\u9650\u7684\u5546\u57CE\u4F3A\u670D\u5668\u3002" }), _jsxs("div", { className: "field-grid two", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }, children: [_jsxs("label", { style: { display: "grid", gap: "8px" }, children: [_jsx("span", { children: "\u5E33\u865F" }), _jsx("input", { value: loginForm.username, onChange: (event) => setLoginForm({ ...loginForm, username: event.target.value }), placeholder: "admin", style: {
                                                    minHeight: "50px",
                                                    borderRadius: "16px",
                                                    border: "1px solid #cbd5e1",
                                                    padding: "0 14px",
                                                    background: "#fff"
                                                } })] }), _jsxs("label", { style: { display: "grid", gap: "8px" }, children: [_jsx("span", { children: "\u5BC6\u78BC" }), _jsx("input", { type: "password", value: loginForm.password, onChange: (event) => setLoginForm({ ...loginForm, password: event.target.value }), placeholder: "\u8F38\u5165\u5F8C\u53F0\u5BC6\u78BC", style: {
                                                    minHeight: "50px",
                                                    borderRadius: "16px",
                                                    border: "1px solid #cbd5e1",
                                                    padding: "0 14px",
                                                    background: "#fff"
                                                } })] })] }), _jsxs("div", { className: "status-line", children: [_jsx("small", { children: status }), _jsxs("div", { className: "button-row", style: { display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px" }, children: [_jsx("button", { type: "button", className: "primary-button", onClick: login, disabled: authLoading, style: { minHeight: "50px", padding: "0 22px", borderRadius: "16px" }, children: authLoading ? "驗證中..." : "登入後台" }), _jsx("button", { type: "button", className: "ghost-button", onClick: loginWithDiscord, disabled: authLoading, style: { minHeight: "50px", padding: "0 22px", borderRadius: "16px" }, children: "\u7528 Discord \u767B\u5165" })] })] }), _jsx("div", { className: "login-note", children: "\u5546\u57CE\u5C08\u5C6C\u5E33\u865F\u4E4B\u5F8C\u6703\u7D81\u53EF\u7BA1\u7406\u7684\u5546\u57CE\u7BC4\u570D\uFF1BDiscord \u767B\u5165\u5247\u6703\u81EA\u52D5\u4F9D\u7167\u4F60\u5728 Discord \u7684\u7BA1\u7406\u6B0A\u9650\u986F\u793A\u53EF\u9078\u5546\u57CE\u3002" })] }) })] }));
    }
    const hasUnsavedChanges = makeBaseline(settings) !== baseline;
    const canManageGlobal = authAccount?.role === "developer" || authAccount?.role === "owner";
    const guildScopeChoices = [
        {
            id: settings.guildId,
            name: settings.brand.serverName || "主商城",
            approved: true,
            isPrimary: true
        },
        ...settings.linkedGuilds.map((guild) => {
            const meta = botGuilds.find((item) => item.id === guild.guildId);
            return {
                id: guild.guildId,
                name: meta?.name || guild.label || guild.guildId,
                approved: meta?.approved ?? guild.enabled,
                isPrimary: false
            };
        })
    ].filter((item, index, array) => array.findIndex((target) => target.id === item.id) === index);
    const enabledProducts = settings.ticket.products.filter((item) => item.enabled).length;
    const featuredProductImages = settings.ticket.products.filter((item) => item.enabled && item.imageUrl?.trim()).slice(0, 6);
    const enabledReplies = settings.autoReplies.filter((item) => item.enabled).length;
    const activeTickets = tickets.filter((item) => !["completed", "cancelled", "closed"].includes(item.status));
    const activeGiveaways = giveaways.filter((item) => !item.ended);
    const recentBalances = balances.slice(0, 5);
    const recentReviews = reviews.slice(0, 4);
    const pendingApplications = applications.filter((item) => item.status === "pending");
    const visualPartners = partnerships.filter((item) => item.enabled && item.bannerUrl?.trim()).slice(0, 3);
    const configuredFields = [
        settings.review.channelId,
        settings.ticket.categoryId,
        settings.ticket.supportRoleId,
        settings.ticket.logChannelId,
        settings.ticket.transcriptChannelId,
        settings.moderation.logChannelId
    ].filter(Boolean).length;
    const configurationScore = Math.round((configuredFields / 6) * 100);
    const featuredPartners = partnerships.filter((item) => item.featured && item.enabled).length;
    const riskItems = (() => {
        const next = [];
        if (!settings.review.channelId)
            next.push("評價頻道 ID 尚未設定");
        if (!settings.ticket.categoryId)
            next.push("工單分類區 ID 尚未設定");
        if (!settings.ticket.supportRoleId)
            next.push("客服身分組 ID 尚未設定");
        if (!settings.ticket.logChannelId)
            next.push("工單紀錄頻道 ID 尚未設定");
        if (!settings.accounts.some((item) => item.enabled && item.role === "admin"))
            next.push("至少需要保留一個啟用中的管理員帳號");
        if (!settings.accounts.some((item) => item.enabled && item.role === "developer"))
            next.push("至少需要保留一個啟用中的開發者帳號");
        if (settings.accounts.some((item) => item.enabled && item.password.trim().length < 8))
            next.push("部分後台帳號密碼長度過短，建議至少 8 碼");
        if (settings.accounts.some((item) => item.enabled && item.password === settings.adminKey))
            next.push("部分帳號仍沿用舊管理金鑰作為密碼，建議立即更換");
        if (settings.accounts.some((item) => item.enabled && !item.allowedGuildIds?.length))
            next.push("部分後台帳號尚未綁定可管理商城，登入後可能看不到任何伺服器");
        return next;
    })();
    const updateReply = (index, next) => {
        const autoReplies = [...settings.autoReplies];
        autoReplies[index] = next;
        setSettings({ ...settings, autoReplies });
    };
    const updateProduct = (index, next) => {
        const products = [...settings.ticket.products];
        products[index] = next;
        setSettings({ ...settings, ticket: { ...settings.ticket, products } });
    };
    const updateLinkedGuild = (index, next) => {
        const linkedGuilds = [...settings.linkedGuilds];
        linkedGuilds[index] = next;
        setSettings({ ...settings, linkedGuilds });
    };
    const updateAccount = (index, next) => {
        const accounts = [...settings.accounts];
        accounts[index] = next;
        setSettings({ ...settings, accounts });
    };
    const toggleAccountGuildScope = (index, guildId, checked) => {
        const account = settings.accounts[index];
        const current = account.allowedGuildIds?.filter((item) => item !== "*") ?? [];
        const allowedGuildIds = checked
            ? [...current, guildId].filter((item, position, array) => array.indexOf(item) === position)
            : current.filter((item) => item !== guildId);
        updateAccount(index, { ...account, allowedGuildIds });
    };
    const toggleAccountAllGuilds = (index, checked) => {
        const account = settings.accounts[index];
        updateAccount(index, {
            ...account,
            allowedGuildIds: checked ? ["*"] : (guildScopeChoices[0] ? [guildScopeChoices[0].id] : [])
        });
    };
    const selectedGuildMeta = botGuilds.find((item) => item.id === selectedGuildId);
    const selectedLinkedIndex = settings.linkedGuilds.findIndex((item) => item.guildId === selectedGuildId);
    const selectedGuildConfig = selectedGuildId === settings.guildId
        ? {
            reviewChannelId: settings.review.channelId,
            ticketCategoryId: settings.ticket.categoryId,
            paidTicketCategoryId: settings.ticket.paidCategoryId,
            supportRoleId: settings.ticket.supportRoleId,
            autoRoleId: settings.ticket.autoRoleId,
            ticketLogChannelId: settings.ticket.logChannelId,
            transcriptChannelId: settings.ticket.transcriptChannelId,
            completedCountChannelId: settings.ticket.completedCountChannelId,
            completedCountLabel: settings.ticket.completedCountLabel,
            moderationLogChannelId: settings.moderation.logChannelId,
            productAnnouncementChannelId: settings.storefront.productAnnouncementChannelId,
            enabled: true,
            label: settings.brand.serverName
        }
        : selectedLinkedIndex >= 0
            ? settings.linkedGuilds[selectedLinkedIndex]
            : null;
    const updateSelectedGuildConfig = (patch) => {
        if (selectedGuildId === settings.guildId) {
            setSettings({
                ...settings,
                review: { ...settings.review, channelId: patch.reviewChannelId ?? settings.review.channelId },
                moderation: { ...settings.moderation, logChannelId: patch.moderationLogChannelId ?? settings.moderation.logChannelId },
                ticket: {
                    ...settings.ticket,
                    categoryId: patch.ticketCategoryId ?? settings.ticket.categoryId,
                    paidCategoryId: patch.paidTicketCategoryId ?? settings.ticket.paidCategoryId,
                    supportRoleId: patch.supportRoleId ?? settings.ticket.supportRoleId,
                    autoRoleId: patch.autoRoleId ?? settings.ticket.autoRoleId,
                    logChannelId: patch.ticketLogChannelId ?? settings.ticket.logChannelId,
                    transcriptChannelId: patch.transcriptChannelId ?? settings.ticket.transcriptChannelId,
                    completedCountChannelId: patch.completedCountChannelId ?? settings.ticket.completedCountChannelId,
                    completedCountLabel: patch.completedCountLabel ?? settings.ticket.completedCountLabel
                },
                storefront: {
                    ...settings.storefront,
                    productAnnouncementChannelId: patch.productAnnouncementChannelId ?? settings.storefront.productAnnouncementChannelId
                }
            });
            return;
        }
        if (selectedLinkedIndex < 0)
            return;
        updateLinkedGuild(selectedLinkedIndex, { ...settings.linkedGuilds[selectedLinkedIndex], ...patch });
    };
    const toggleGuildApproval = async (approved) => {
        if (!selectedGuildId || selectedGuildId === settings.guildId)
            return;
        setGuildLoading(true);
        try {
            await setBotGuildApproval(selectedGuildId, approved);
            setSettings({
                ...settings,
                linkedGuilds: settings.linkedGuilds.map((item) => item.guildId === selectedGuildId ? { ...item, enabled: approved } : item)
            });
            setBotGuilds((current) => current.map((item) => item.id === selectedGuildId ? { ...item, approved } : item));
            setStatus(approved ? "已批准這個群組使用機器人功能" : "已停用這個群組的機器人功能");
        }
        catch (error) {
            setStatus(`群組批准更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setGuildLoading(false);
        }
    };
    const sendDashboardMessage = async () => {
        if (!selectedGuildId || !messageDraft.channelId || !messageDraft.content.trim()) {
            setStatus("請先選擇群組、頻道並輸入訊息內容");
            return;
        }
        setGuildLoading(true);
        try {
            await sendBotMessageFromDashboard({
                guildId: selectedGuildId,
                channelId: messageDraft.channelId,
                content: messageDraft.content
            });
            setMessageDraft((current) => ({ ...current, content: "" }));
            setStatus("訊息已從後台送出");
        }
        catch (error) {
            setStatus(`後台發送訊息失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setGuildLoading(false);
        }
    };
    const createGiveaway = async () => {
        if (!selectedGuildId || !giveawayDraft.channelId || !giveawayDraft.prize.trim()) {
            setStatus("請先選擇群組、頻道並填入抽獎獎品");
            return;
        }
        setGiveawayLoading(true);
        try {
            await createGiveawayFromDashboard({
                guildId: selectedGuildId,
                channelId: giveawayDraft.channelId,
                prize: giveawayDraft.prize.trim(),
                minutes: giveawayDraft.minutes,
                winnersCount: giveawayDraft.winnersCount
            });
            setGiveaways(await fetchGiveaways());
            setGiveawayDraft((current) => ({ ...current, prize: "", minutes: 30, winnersCount: 1 }));
            setStatus("抽獎已從後台建立");
        }
        catch (error) {
            setStatus(`建立抽獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setGiveawayLoading(false);
        }
    };
    const drawGiveaway = async (id) => {
        setGiveawayLoading(true);
        try {
            await drawGiveawayFromDashboard(id);
            setGiveaways(await fetchGiveaways());
            setStatus("抽獎已手動開獎");
        }
        catch (error) {
            setStatus(`手動開獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setGiveawayLoading(false);
        }
    };
    const closeGiveaway = async (id) => {
        setGiveawayLoading(true);
        try {
            await closeGiveawayFromDashboard(id);
            setGiveaways(await fetchGiveaways());
            setStatus("抽獎已手動關閉");
        }
        catch (error) {
            setStatus(`手動關獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setGiveawayLoading(false);
        }
    };
    const openOpayCheckout = async () => {
        try {
            setPaymentToolStatus({ tone: "info", message: "正在開啟歐付寶超商代碼付款頁..." });
            const checkout = await createOpayCheckout(paymentForm);
            const form = document.createElement("form");
            form.method = "POST";
            form.action = checkout.action;
            form.target = "_blank";
            Object.entries(checkout.fields).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();
            form.remove();
            setStatus("已開啟歐付寶超商代碼頁面");
            setPaymentToolStatus({ tone: "success", message: "歐付寶付款頁已開啟，請在新視窗繼續完成流程。" });
        }
        catch (error) {
            const message = `歐付寶送單失敗：${error instanceof Error ? error.message : "未知錯誤"}`;
            setStatus(message);
            setPaymentToolStatus({ tone: "error", message });
        }
    };
    const openPayuniDirectCode = async () => {
        try {
            setPaymentToolStatus({ tone: "info", message: "正在向 PAYUNi 建立超商代碼..." });
            const result = await createPayuniDirectCodeFromDashboard(paymentForm);
            const message = result.paymentCode
                ? `PAYUNi 代碼已建立：${result.paymentCode}${result.expireAt ? `｜期限 ${result.expireAt}` : ""}`
                : (result.message || "PAYUNi 後台入口已準備完成");
            setStatus(message);
            setPaymentToolStatus({ tone: result.paymentCode ? "success" : "info", message });
        }
        catch (error) {
            const message = `PAYUNi 入口提醒：${error instanceof Error ? error.message : "未知錯誤"}`;
            setStatus(message);
            setPaymentToolStatus({ tone: "error", message });
        }
    };
    const closeTicket = async (ticketId) => {
        try {
            await closeTicketFromDashboard(ticketId);
            setTickets(await fetchTickets());
            setStats(await fetchStats());
            setStatus("已從後台關閉工單");
        }
        catch (error) {
            setStatus(`後台關單失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
    };
    const updateStoreOrderStatus = async (orderId, nextStatus) => {
        setStorefrontLoading(true);
        try {
            const nextOrder = await updateStoreOrderStatusFromDashboard(orderId, nextStatus);
            setStoreOrders((current) => current.map((item) => item.id === nextOrder.id ? nextOrder : item));
            setStatus(`商城訂單狀態已更新為${storeOrderStatusLabel(nextStatus)}`);
        }
        catch (error) {
            setStatus(`商城訂單更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setStorefrontLoading(false);
        }
    };
    const sendStoreOrderReply = async (orderId) => {
        const message = (orderReplyDrafts[orderId] ?? "").trim();
        if (!message) {
            setStatus("請先輸入要回覆給顧客的訊息");
            return;
        }
        setStorefrontLoading(true);
        try {
            const nextOrder = await sendStoreOrderMessageFromDashboard(orderId, message);
            setStoreOrders((current) => current.map((item) => item.id === nextOrder.id ? nextOrder : item));
            setOrderReplyDrafts((current) => ({ ...current, [orderId]: "" }));
            setStatus("已在網站訂單對話中回覆顧客");
        }
        catch (error) {
            setStatus(`訂單對話回覆失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setStorefrontLoading(false);
        }
    };
    const reloadBalances = async () => {
        setBalanceLoading(true);
        try {
            setBalances(await fetchBalances());
            setStats(await fetchStats());
            setStatus("餘額資料已更新");
        }
        catch (error) {
            setStatus(`餘額讀取失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setBalanceLoading(false);
        }
    };
    const submitBalanceDraft = async () => {
        if (!balanceDraft.userId.trim() || !balanceDraft.username.trim()) {
            setStatus("請先填入餘額使用者 ID 與名稱");
            return;
        }
        setBalanceLoading(true);
        try {
            await saveBalance({
                userId: balanceDraft.userId.trim(),
                username: balanceDraft.username.trim(),
                balance: Number(balanceDraft.amount) || 0,
                note: balanceDraft.note
            });
            setBalances(await fetchBalances());
            setStats(await fetchStats());
            setBalanceDraft(newBalanceDraft());
            setStatus("餘額已儲存");
        }
        catch (error) {
            setStatus(`餘額儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setBalanceLoading(false);
        }
    };
    const adjustBalance = async (record, amount) => {
        setBalanceLoading(true);
        try {
            await adjustBalanceFromDashboard({
                userId: record.userId,
                username: record.username,
                amount,
                note: record.note
            });
            setBalances(await fetchBalances());
            setStats(await fetchStats());
            setStatus(`已${amount >= 0 ? "增加" : "扣除"} ${record.username} 的餘額`);
        }
        catch (error) {
            setStatus(`餘額調整失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setBalanceLoading(false);
        }
    };
    const removeBalance = async (userId) => {
        setBalanceLoading(true);
        try {
            await deleteBalanceFromDashboard(userId);
            setBalances(await fetchBalances());
            setStats(await fetchStats());
            setStatus("餘額帳戶已刪除");
        }
        catch (error) {
            setStatus(`刪除餘額失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setBalanceLoading(false);
        }
    };
    const reloadPartnerships = async () => {
        setPartnershipLoading(true);
        try {
            setPartnerships(await fetchPartnerships());
            setApplications(await fetchPartnershipApplications());
            setStatus("合作資料已更新");
        }
        catch (error) {
            setStatus(`合作資料讀取失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setPartnershipLoading(false);
        }
    };
    const savePartnershipDraft = async () => {
        if (!partnershipDraft.serverName.trim() || !partnershipDraft.inviteUrl.trim()) {
            setStatus("合作伺服器名稱與邀請連結為必填");
            return;
        }
        setPartnershipLoading(true);
        try {
            const now = new Date().toISOString();
            await savePartnershipFromDashboard({
                ...partnershipDraft,
                createdAt: partnershipDraft.createdAt || now,
                updatedAt: now,
                tags: partnershipDraft.tags
            });
            setPartnerships(await fetchPartnerships());
            setPartnershipDraft(newPartnershipDraft());
            setStatus("合作伺服器已儲存");
        }
        catch (error) {
            setStatus(`合作伺服器儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setPartnershipLoading(false);
        }
    };
    const removePartnership = async (id) => {
        setPartnershipLoading(true);
        try {
            await deletePartnershipFromDashboard(id);
            setPartnerships(await fetchPartnerships());
            setStatus("合作伺服器已刪除");
        }
        catch (error) {
            setStatus(`刪除合作伺服器失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setPartnershipLoading(false);
        }
    };
    const approveApplication = async (application) => {
        setPartnershipLoading(true);
        try {
            await approvePartnershipAndCreateFromDashboard({
                id: application.id,
                reviewNote: "由網站後台核准",
                enabled: true,
                mutualPromotion: true
            });
            setPartnerships(await fetchPartnerships());
            setApplications(await fetchPartnershipApplications());
            setStatus(`已核准 ${application.serverName} 的合作申請`);
        }
        catch (error) {
            setStatus(`合作申請核准失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setPartnershipLoading(false);
        }
    };
    const rejectApplication = async (application) => {
        setPartnershipLoading(true);
        try {
            await reviewPartnershipApplicationFromDashboard({
                id: application.id,
                status: "rejected",
                reviewNote: "由網站後台拒絕"
            });
            setApplications(await fetchPartnershipApplications());
            setStatus(`已拒絕 ${application.serverName} 的合作申請`);
        }
        catch (error) {
            setStatus(`合作申請拒絕失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
        }
        finally {
            setPartnershipLoading(false);
        }
    };
    const navItems = [
        { id: sectionIds.overview, label: "總覽", icon: "🏠" },
        { id: sectionIds.brand, label: "品牌", icon: "🎨" },
        { id: sectionIds.storefront, label: "商城前台", icon: "🛒" },
        ...(canManageGlobal ? [{ id: sectionIds.accounts, label: "帳號", icon: "👤" }] : []),
        { id: sectionIds.serverControl, label: "群組控制", icon: "🛰️" },
        { id: sectionIds.giveaways, label: "抽獎", icon: "🎁" },
        { id: sectionIds.multiGuild, label: "多群組", icon: "🌐" },
        { id: sectionIds.ticket, label: "工單", icon: "🎫" },
        { id: sectionIds.moderation, label: "防刷頻", icon: "🛡️" },
        { id: sectionIds.products, label: "商品", icon: "📦" },
        { id: sectionIds.blacklist, label: "黑名單", icon: "⛔" },
        { id: sectionIds.balance, label: "餘額", icon: "💳" },
        { id: sectionIds.partnerships, label: "合作名單", icon: "🤝" },
        { id: sectionIds.applications, label: "合作申請", icon: "📨" },
        { id: sectionIds.reply, label: "自動回覆", icon: "⚡" },
        { id: sectionIds.tickets, label: "工單操作", icon: "💬" },
        { id: sectionIds.faq, label: "FAQ", icon: "❓" },
        { id: sectionIds.payment, label: "付款工具", icon: "💰" }
    ];
    const activeCategoryConfig = categoryViews.find((item) => item.id === activeCategoryView) ?? categoryViews[0];
    const visibleNavItems = navItems.filter((item) => item.id === sectionIds.overview || activeCategoryConfig.sections.includes(item.id));
    const currentCategoryItems = visibleNavItems.filter((item) => item.id !== sectionIds.overview);
    const visibleSectionIds = new Set(activeCategoryConfig.sections);
    const currentSection = currentCategoryItems.find((item) => item.id === activeSectionView) ?? currentCategoryItems[0];
    const showSection = (id) => visibleSectionIds.has(id) && currentSection?.id === id;
    const currentGuildLabel = botGuilds.find((guild) => guild.id === selectedGuildId)?.label || settings.brand.serverName;
    const productCategoryCount = new Set(settings.ticket.products.map((item) => item.category.trim()).filter(Boolean)).size;
    const outOfStockProducts = settings.ticket.products.filter((item) => item.stockStatus === "out_of_stock").length;
    const restockingProducts = settings.ticket.products.filter((item) => item.stockStatus === "restocking").length;
    const filteredProducts = settings.ticket.products.filter((product) => {
        const keyword = productSearch.trim().toLowerCase();
        const matchesKeyword = !keyword || [product.name, product.category, product.priceLabel, product.description ?? ""].some((value) => value.toLowerCase().includes(keyword));
        const matchesStatus = productStatusFilter === "all"
            ? true
            : productStatusFilter === "enabled"
                ? product.enabled
                : Boolean(product.featured);
        return matchesKeyword && matchesStatus;
    });
    const rangeLabels = {
        day: "本日",
        week: "本週",
        month: "本月"
    };
    const rangedRevenue = insightRange === "day"
        ? stats.storefrontTodayRevenue
        : insightRange === "week"
            ? stats.storefrontWeekRevenue
            : stats.storefrontMonthRevenue;
    const rangedOrders = insightRange === "day"
        ? stats.storefrontTodayOrders
        : insightRange === "week"
            ? stats.storefrontWeekOrders
            : stats.storefrontMonthOrders;
    const revenueDenominator = Math.max(stats.storefrontRevenue, stats.storefrontMonthRevenue, stats.totalStoredBalance, 1);
    const orderDenominator = Math.max(stats.storefrontTotalOrders, stats.storefrontMonthOrders, stats.openTickets, stats.completedTickets, 1);
    return (_jsxs("main", { className: "dashboard", style: {
            "--primary": settings.brand.primaryColor,
            "--secondary": settings.brand.secondaryColor
        }, children: [_jsx("div", { className: "mesh mesh-a" }), _jsx("div", { className: "mesh mesh-b" }), _jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "hero-shell card", children: [_jsxs("div", { className: "hero-copy", children: [_jsx("p", { className: "eyebrow", children: "Commerce Control Center" }), _jsx("h1", { children: settings.brand.serverName }), _jsx("p", { children: settings.brand.tagline }), _jsxs("div", { className: "hero-pills", children: [_jsx("span", { className: `pill ${hasUnsavedChanges ? "is-live" : ""}`, children: hasUnsavedChanges ? "有未儲存變更" : "目前已同步" }), _jsx("span", { className: "pill", children: settings.moderation.antiSpamEnabled ? "防刷頻啟用" : "防刷頻停用" }), _jsxs("span", { className: "pill", children: [enabledReplies, " \u689D\u555F\u7528\u4E2D\u7684\u81EA\u52D5\u56DE\u8986"] }), _jsxs("span", { className: "pill", children: [enabledProducts, " \u9805\u4E0A\u67B6\u5546\u54C1"] })] })] }), _jsxs("div", { className: "hero-feature-grid", children: [_jsxs("article", { className: "hero-feature-card", children: [_jsx("span", { children: "\u8A2D\u5B9A\u5B8C\u6210\u5EA6" }), _jsxs("strong", { children: [configurationScore, "%"] }), _jsx("small", { children: "\u6838\u5FC3\u6D41\u7A0B\u8207\u8A18\u9304\u983B\u9053\u7684\u57FA\u790E\u914D\u7F6E\u8986\u84CB\u7387" })] }), _jsxs("article", { className: "hero-feature-card", children: [_jsx("span", { children: "\u71DF\u904B\u5354\u4F5C" }), _jsx("strong", { children: pendingApplications.length + featuredPartners }), _jsx("small", { children: "\u5F85\u5BE9\u5408\u4F5C\u8207\u7CBE\u9078\u5408\u4F5C\u4F3A\u670D\u5668\u7684\u5408\u8A08\u6578\u91CF" })] }), _jsxs("article", { className: "hero-feature-card", children: [_jsx("span", { children: "\u5BA2\u670D\u7BC0\u594F" }), _jsx("strong", { children: activeTickets.length }), _jsx("small", { children: "\u76EE\u524D\u9700\u8981\u8FFD\u8E64\u7684\u5DE5\u55AE\u8207\u4ED8\u6B3E\u8655\u7406\u7BC0\u9EDE" })] })] })] }), _jsxs("div", { className: "hero-side", children: [_jsxs("div", { className: "card action-card action-card-strong", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Dashboard Access" }), _jsx("h3", { children: "\u767B\u5165\u72C0\u614B" })] }), _jsx("span", { className: `signal-dot ${hasUnsavedChanges ? "signal-live" : ""}` })] }), _jsxs("div", { className: "account-summary-grid", children: [_jsxs("div", { className: "summary-box", children: [_jsx("span", { children: "\u76EE\u524D\u5E33\u865F" }), _jsx("strong", { children: authAccount?.displayName ?? authAccount?.username ?? "未登入" })] }), _jsxs("div", { className: "summary-box", children: [_jsx("span", { children: "\u76EE\u524D\u89D2\u8272" }), _jsx("strong", { children: authAccount ? accountRoleLabel(authAccount.role) : "未登入" })] })] }), authAccount ? _jsx("div", { className: "login-note compact-note", children: authAccount.role === "developer" ? "目前帳號可進行後台維護與流程設定。" : "目前帳號可管理日常設定與營運流程。" }) : null, _jsxs("div", { className: "status-line", children: [_jsx("small", { children: status }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: refreshAll, children: "\u91CD\u65B0\u6574\u7406" }), _jsx("button", { type: "button", className: "primary-button", onClick: persist, disabled: saving, children: saving ? "儲存中..." : "儲存全部設定" }), _jsx("button", { type: "button", className: "ghost-button", onClick: signOut, children: "\u767B\u51FA" })] })] })] }), _jsxs("div", { className: "card executive-card", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Operation Signal" }), _jsx("h3", { children: "\u672C\u65E5\u91CD\u9EDE" })] }) }), _jsxs("div", { className: "executive-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u5F85\u5BE9\u5408\u4F5C" }), _jsxs("strong", { children: [pendingApplications.length, " \u7B46"] })] }), _jsxs("div", { children: [_jsx("span", { children: "\u6B50\u4ED8\u5BF6\u8A2D\u5B9A" }), _jsx("strong", { children: opayReady ? "已就緒" : "待補設定" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u7E3D\u89BD\u72C0\u614B" }), _jsx("strong", { children: riskItems.length === 0 ? "健康" : `需處理 ${riskItems.length} 項` })] })] })] })] })] }), _jsxs("section", { className: "card section-card", id: "store-switcher", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Store Switcher" }), _jsx("h2", { children: "\u9078\u64C7\u4F60\u8981\u7BA1\u7406\u7684\u5546\u57CE" })] }), _jsxs("span", { className: "section-meta", children: [botGuilds.length, " \u500B\u53EF\u7528\u5546\u57CE"] })] }), _jsx("div", { className: "hero-feature-grid", children: botGuilds.map((guild) => (_jsxs("button", { type: "button", className: "hero-feature-card", onClick: () => setSelectedGuildId(guild.id), style: {
                                textAlign: "left",
                                border: selectedGuildId === guild.id ? "1px solid rgba(140, 232, 255, 0.7)" : undefined,
                                boxShadow: selectedGuildId === guild.id ? "0 0 0 2px rgba(140,232,255,0.16)" : undefined
                            }, children: [_jsx("span", { children: guild.isPrimary ? "主商城" : "商城伺服器" }), _jsx("strong", { children: guild.label || guild.name }), _jsx("small", { children: guild.id })] }, guild.id))) })] }), _jsxs("section", { className: "card section-card", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Category View" }), _jsx("h2", { children: "\u5206\u985E\u8996\u7A97" })] }), _jsx("span", { className: "section-meta", children: "\u628A\u4F3A\u670D\u5668\u8A2D\u5B9A\u3001\u5546\u57CE\u8A2D\u5B9A\u548C\u8A02\u55AE\u8655\u7406\u5206\u958B\u770B" })] }), _jsx("div", { className: "hero-feature-grid", children: categoryViews.map((category) => (_jsxs("button", { type: "button", className: "hero-feature-card", onClick: () => {
                                setActiveCategoryView(category.id);
                                setActiveSectionView(category.target);
                                window.location.hash = category.target;
                            }, style: {
                                textAlign: "left",
                                border: activeCategoryView === category.id ? "1px solid rgba(255, 122, 51, 0.65)" : undefined,
                                boxShadow: activeCategoryView === category.id ? "0 0 0 2px rgba(255,106,43,0.14)" : undefined
                            }, children: [_jsx("span", { children: category.label }), _jsx("strong", { children: category.description }), _jsx("small", { children: "\u5207\u5230\u9019\u985E\u5F8C\uFF0C\u5DE6\u5074\u5FEB\u6377\u6703\u53EA\u986F\u793A\u76F8\u95DC\u9805\u76EE" })] }, category.id))) })] }), _jsxs("section", { className: "card section-card section-switcher-panel", children: [_jsxs("div", { className: "section-head section-switcher-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Workspace" }), _jsx("h2", { children: activeCategoryConfig.label })] }), _jsxs("div", { className: "section-switcher-summary", children: [_jsxs("span", { className: "section-meta", children: [currentCategoryItems.length, " \u500B\u5DE5\u4F5C\u8996\u7A97"] }), _jsx("strong", { children: currentSection?.label })] })] }), _jsx("div", { className: "section-switcher-note", children: "\u76F4\u63A5\u5207\u63DB\u76EE\u524D\u5DE5\u4F5C\u9762\u677F\uFF0C\u4E0B\u9762\u6703\u53EA\u986F\u793A\u4F60\u6B63\u5728\u64CD\u4F5C\u7684\u90A3\u4E00\u9801\u3002" }), _jsx("div", { className: "section-switcher-grid", children: currentCategoryItems.map((item) => (_jsxs("button", { type: "button", className: `section-switcher-tab ${currentSection?.id === item.id ? "is-active" : ""}`, onClick: () => {
                                setActiveSectionView(item.id);
                                window.location.hash = item.id;
                            }, children: [_jsx("span", { className: "section-switcher-icon", "aria-hidden": "true", children: item.icon }), _jsxs("div", { className: "section-switcher-copy", children: [_jsx("strong", { children: item.label }), _jsx("small", { children: currentSection?.id === item.id ? "目前顯示中" : "點擊切換" })] })] }, item.id))) })] }), _jsxs("section", { className: "overview-grid", id: sectionIds.overview, children: [_jsxs("div", { className: "overview-main", children: [_jsxs("section", { className: "card spotlight-card", children: [_jsxs("div", { className: "spotlight-copy", children: [_jsx("p", { className: "eyebrow", children: "Executive Summary" }), _jsx("h2", { children: "\u628A\u5546\u57CE\u3001\u5BA2\u670D\u3001\u5408\u4F5C\u548C\u4ED8\u6B3E\u6D41\u7A0B\u653E\u9032\u540C\u4E00\u500B\u71DF\u904B\u9762\u677F\u3002" }), _jsx("p", { children: "\u9019\u500B\u5F8C\u53F0\u73FE\u5728\u6703\u628A\u6700\u5E38\u7528\u7684\u64CD\u4F5C\u96C6\u4E2D\u5728\u540C\u4E00\u9801\uFF0C\u8B93\u4F60\u4E0D\u9700\u8981\u4F86\u56DE\u5207\u63DB\u591A\u500B\u756B\u9762\uFF0C\u4E5F\u80FD\u5FEB\u901F\u638C\u63E1\u8A02\u55AE\u3001\u5408\u4F5C\u7533\u8ACB\u548C\u4F3A\u670D\u5668\u71DF\u904B\u72C0\u6CC1\u3002" })] }), _jsxs("div", { className: "spotlight-metrics", children: [_jsxs("div", { children: [_jsx("span", { children: "\u54C1\u724C\u4E00\u81F4\u6027" }), _jsx("strong", { children: settings.brand.serverName })] }), _jsxs("div", { children: [_jsx("span", { children: "\u7CBE\u9078\u5408\u4F5C" }), _jsxs("strong", { children: [featuredPartners, " \u500B"] })] }), _jsxs("div", { children: [_jsx("span", { children: "FAQ \u689D\u76EE" }), _jsxs("strong", { children: [settings.faq.length, " \u7B46"] })] })] })] }), _jsxs("section", { className: "visual-insight-grid", children: [_jsxs("div", { className: "card insight-card", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Revenue View" }), _jsx("h2", { children: "\u71DF\u6536\u6BD4\u4F8B" })] }), _jsx("div", { className: "range-switch", children: ["day", "week", "month"].map((item) => (_jsx("button", { type: "button", className: `range-chip ${insightRange === item ? "is-active" : ""}`, onClick: () => setInsightRange(item), children: rangeLabels[item] }, item))) })] }), _jsxs("div", { className: "metric-bar-stack", children: [_jsx(MetricBar, { label: "\u5546\u57CE\u7D2F\u7A4D\u6536\u5165", value: `${stats.storefrontRevenue}`, percent: (stats.storefrontRevenue / revenueDenominator) * 100, tone: "warm" }), _jsx(MetricBar, { label: `商城${rangeLabels[insightRange]}收入`, value: `${rangedRevenue}`, percent: (rangedRevenue / revenueDenominator) * 100, tone: "sun" }), _jsx(MetricBar, { label: "\u5F8C\u53F0\u7E3D\u9918\u984D", value: `${stats.totalStoredBalance}`, percent: (stats.totalStoredBalance / revenueDenominator) * 100, tone: "cool" })] })] }), _jsxs("div", { className: "card insight-card", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Order Pulse" }), _jsx("h2", { children: "\u8A02\u55AE\u8207\u5BA2\u670D\u8108\u640F" })] }), _jsx("div", { className: "range-switch", children: ["day", "week", "month"].map((item) => (_jsx("button", { type: "button", className: `range-chip ${insightRange === item ? "is-active" : ""}`, onClick: () => setInsightRange(item), children: rangeLabels[item] }, item))) })] }), _jsxs("div", { className: "metric-bar-stack", children: [_jsx(MetricBar, { label: `商城${rangeLabels[insightRange]}訂單`, value: `${rangedOrders}`, percent: (rangedOrders / orderDenominator) * 100, tone: "cool" }), _jsx(MetricBar, { label: "\u5546\u57CE\u5F85\u4ED8\u6B3E", value: `${stats.storefrontPendingOrders}`, percent: (stats.storefrontPendingOrders / orderDenominator) * 100, tone: "alert" }), _jsx(MetricBar, { label: "\u9032\u884C\u4E2D\u5DE5\u55AE", value: `${stats.openTickets}`, percent: (stats.openTickets / orderDenominator) * 100, tone: "warm" }), _jsx(MetricBar, { label: "\u5B8C\u6210\u7968\u55AE", value: `${stats.completedTickets}`, percent: (stats.completedTickets / orderDenominator) * 100, tone: "sun" })] })] })] }), _jsxs("section", { className: "stats-category-grid", children: [_jsxs("div", { className: "card stats-category-card", children: [_jsxs("div", { className: "stats-category-head", children: [_jsx("p", { className: "eyebrow", children: "Store Revenue" }), _jsx("h3", { children: "\u7DB2\u7AD9\u71DF\u6536" })] }), _jsxs("div", { className: "stats-grid", children: [_jsx(Stat, { label: "\u5546\u57CE\u7D2F\u7A4D\u6536\u5165", value: `${stats.storefrontRevenue}`, tone: "warm", hint: "\u5DF2\u4ED8\u6B3E / \u8655\u7406\u4E2D / \u5DF2\u5B8C\u6210 \u8A02\u55AE\u6536\u5165" }), _jsx(Stat, { label: "\u5546\u57CE\u4ECA\u65E5\u6536\u5165", value: `${stats.storefrontTodayRevenue}`, tone: "sun", hint: "\u4EE5\u8A02\u55AE\u5EFA\u7ACB\u65E5\u671F\u8A08\u7B97\u7684\u4ECA\u65E5\u6536\u5165" }), _jsx(Stat, { label: "\u5DF2\u78BA\u8A8D\u8A02\u55AE", value: `${stats.storefrontPaidOrders}`, tone: "cool", hint: "\u5DF2\u4ED8\u6B3E\u3001\u8655\u7406\u4E2D\u8207\u5DF2\u5B8C\u6210\u7684\u6709\u6548\u8A02\u55AE" })] })] }), _jsxs("div", { className: "card stats-category-card", children: [_jsxs("div", { className: "stats-category-head", children: [_jsx("p", { className: "eyebrow", children: "Orders" }), _jsx("h3", { children: "\u8A02\u55AE\u7D71\u8A08" })] }), _jsxs("div", { className: "stats-grid", children: [_jsx(Stat, { label: "\u5546\u57CE\u7E3D\u8A02\u55AE", value: `${stats.storefrontTotalOrders}`, tone: "cool", hint: "\u5546\u57CE\u7DB2\u7AD9\u76EE\u524D\u7D2F\u7A4D\u7684\u8A02\u55AE\u6578\u91CF" }), _jsx(Stat, { label: "\u5546\u57CE\u5F85\u4ED8\u6B3E", value: `${stats.storefrontPendingOrders}`, tone: "alert", hint: "\u5C1A\u672A\u78BA\u8A8D\u6536\u6B3E\u7684\u7DB2\u7AD9\u8A02\u55AE" }), _jsx(Stat, { label: "\u9032\u884C\u4E2D\u5DE5\u55AE", value: `${stats.openTickets}`, tone: "warm", hint: "\u76EE\u524D\u7B49\u5F85\u8655\u7406\u6216\u9032\u884C\u4E2D\u7684\u6848\u4EF6" }), _jsx(Stat, { label: "\u5B8C\u6210\u7968\u55AE", value: `${stats.completedTickets}`, tone: "cool", hint: "\u5DF2\u5B8C\u6210\u7684\u5DE5\u55AE\u6578\u91CF" })] })] }), _jsxs("div", { className: "card stats-category-card", children: [_jsxs("div", { className: "stats-category-head", children: [_jsx("p", { className: "eyebrow", children: "Balance Center" }), _jsx("h3", { children: "\u5F8C\u53F0\u9918\u984D" })] }), _jsxs("div", { className: "stats-grid", children: [_jsx(Stat, { label: "\u9918\u984D\u5E33\u6236", value: `${stats.balanceUsers}`, tone: "cool", hint: "\u76EE\u524D\u5EFA\u7ACB\u7684\u9918\u984D\u5E33\u6236\u6578\u91CF" }), _jsx(Stat, { label: "\u7E3D\u9918\u984D", value: `${stats.totalStoredBalance}`, tone: "warm", hint: "\u6240\u6709\u5E33\u6236\u76EE\u524D\u7D2F\u7A4D\u7684\u5132\u503C\u9918\u984D" }), _jsx(Stat, { label: "\u9ED1\u540D\u55AE\u4EBA\u6578", value: `${stats.blacklistedUsers}`, tone: "alert", hint: "\u5DF2\u9650\u5236\u958B\u55AE\u7684\u4F7F\u7528\u8005\u6578\u91CF" }), _jsx(Stat, { label: "\u5E73\u5747\u8A55\u50F9", value: `${stats.averageRating} / 5`, tone: "sun", hint: "\u76EE\u524D\u7D2F\u7A4D\u8A55\u50F9\u5E73\u5747\u5206\u6578" }), _jsx(Stat, { label: "\u81EA\u52D5\u56DE\u8986\u555F\u7528", value: `${stats.autoReplyRules}`, tone: "cool", hint: "\u76EE\u524D\u555F\u7528\u4E2D\u7684\u81EA\u52D5\u56DE\u8986\u898F\u5247\u6578\u91CF" })] })] })] }), _jsxs("section", { className: "commerce-pulse-grid", children: [_jsxs("div", { className: "card commerce-pulse-card", children: [_jsx("p", { className: "eyebrow", children: "Revenue Pulse" }), _jsxs("strong", { children: [stats.storefrontRevenue, " NT"] }), _jsx("small", { children: "\u5546\u57CE\u7D2F\u7A4D\u6536\u5165" }), _jsx("div", { className: "pulse-meter", children: _jsx("span", { style: { width: `${Math.min(100, (stats.storefrontRevenue / revenueDenominator) * 100)}%` } }) })] }), _jsxs("div", { className: "card commerce-pulse-card", children: [_jsx("p", { className: "eyebrow", children: "Today Orders" }), _jsx("strong", { children: stats.storefrontTodayOrders }), _jsx("small", { children: "\u4ECA\u65E5\u65B0\u589E\u8A02\u55AE" }), _jsx("div", { className: "pulse-meter", children: _jsx("span", { style: { width: `${Math.min(100, (stats.storefrontTodayOrders / Math.max(stats.storefrontMonthOrders, 1)) * 100)}%` } }) })] }), _jsxs("div", { className: "card commerce-pulse-card", children: [_jsx("p", { className: "eyebrow", children: "Pending Queue" }), _jsx("strong", { children: stats.storefrontPendingOrders }), _jsx("small", { children: "\u5F85\u4ED8\u6B3E / \u5F85\u8FFD\u8E64" }), _jsx("div", { className: "pulse-meter", children: _jsx("span", { style: { width: `${Math.min(100, (stats.storefrontPendingOrders / orderDenominator) * 100)}%` } }) })] }), _jsxs("div", { className: "card commerce-pulse-card", children: [_jsx("p", { className: "eyebrow", children: "Customer Score" }), _jsxs("strong", { children: [stats.averageRating, " / 5"] }), _jsx("small", { children: "\u9867\u5BA2\u5E73\u5747\u8A55\u50F9" }), _jsx("div", { className: "pulse-meter", children: _jsx("span", { style: { width: `${Math.min(100, (stats.averageRating / 5) * 100)}%` } }) })] })] }), _jsxs("div", { className: "system-row", children: [_jsxs("section", { className: "card info-card", children: [_jsx("p", { className: "eyebrow", children: "\u7CFB\u7D71\u5FEB\u7167" }), _jsxs("div", { className: "info-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u5DE5\u55AE\u5F8C\u53F0\u95DC\u55AE" }), _jsx("strong", { children: settings.ticket.allowDashboardClose ? "已啟用" : "已停用" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u6B50\u4ED8\u5BF6\u72C0\u614B" }), _jsx("strong", { children: opayReady ? "已設定" : "尚未設定" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u6D3B\u8E8D\u9918\u984D\u5E33\u6236" }), _jsxs("strong", { children: [balances.length, " \u7B46"] })] })] })] }), _jsxs("section", { className: "card info-card", children: [_jsx("p", { className: "eyebrow", children: "\u5F85\u6CE8\u610F\u9805\u76EE" }), riskItems.length === 0 ? (_jsx("div", { className: "safe-box", children: "\u76EE\u524D\u6C92\u6709\u660E\u986F\u7F3A\u6F0F\uFF0C\u8A2D\u5B9A\u72C0\u614B\u826F\u597D\u3002" })) : (_jsx("div", { className: "alert-stack", children: riskItems.map((item) => _jsx("div", { className: "alert-item", children: item }, item)) }))] })] }), _jsxs("section", { className: "card overview-aux-panel", children: [_jsxs("div", { className: "section-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Workspace Assets" }), _jsx("h2", { children: "\u71DF\u904B\u5FEB\u89BD" })] }), _jsx("span", { className: "section-meta", children: "\u628A\u5E38\u7528\u8996\u89BA\u548C\u6E05\u55AE\u653E\u56DE\u4E3B\u5DE5\u4F5C\u5340" })] }), _jsxs("div", { className: "overview-aux-grid", children: [selectedGuildMeta ? (_jsxs("section", { className: "card preview-panel overview-aux-card", children: [_jsx("p", { className: "eyebrow", children: "\u76EE\u524D\u5546\u57CE\u8996\u89BA" }), _jsxs("div", { className: "image-spotlight-card", children: [selectedGuildMeta.iconUrl ? (_jsx("img", { className: "image-spotlight-avatar", src: selectedGuildMeta.iconUrl, alt: selectedGuildMeta.name })) : (_jsx("div", { className: "image-spotlight-fallback", children: guildInitials(selectedGuildMeta.name) })), _jsxs("div", { className: "image-spotlight-copy", children: [_jsx("strong", { children: selectedGuildMeta.name }), _jsx("small", { children: selectedGuildMeta.isPrimary ? "主商城伺服器" : selectedGuildMeta.approved ? "已批准可用" : "待批准" }), _jsx("p", { children: "\u5F8C\u53F0\u6703\u512A\u5148\u7528\u5546\u57CE\u76EE\u524D\u7684\u4F3A\u670D\u5668\u5716\u793A\u8207\u54C1\u724C\u8CC7\u6599\u505A\u8996\u89BA\u9810\u89BD\u3002" })] })] })] })) : null, featuredProductImages.length ? (_jsxs("section", { className: "card preview-panel overview-aux-card", children: [_jsx("p", { className: "eyebrow", children: "\u5546\u54C1\u5716\u7247\u7246" }), _jsx("div", { className: "visual-grid", children: featuredProductImages.map((item) => (_jsxs("div", { className: "visual-tile", children: [_jsx("img", { src: item.imageUrl, alt: item.name }), _jsx("span", { children: item.name })] }, item.id))) })] })) : null, _jsxs("section", { className: "card preview-panel overview-aux-card", children: [_jsx("p", { className: "eyebrow", children: "\u6700\u8FD1\u5DE5\u55AE" }), _jsxs("div", { className: "mini-list", children: [activeTickets.slice(0, 5).map((ticket) => _jsxs("div", { className: "mini-item", children: [_jsx("strong", { children: ticket.categoryLabel }), _jsx("span", { children: ticket.username })] }, ticket.id)), activeTickets.length === 0 ? _jsx("div", { className: "empty-note", children: "\u76EE\u524D\u6C92\u6709\u9032\u884C\u4E2D\u7684\u5DE5\u55AE\u3002" }) : null] })] }), _jsxs("section", { className: "card preview-panel overview-aux-card", children: [_jsx("p", { className: "eyebrow", children: "\u6700\u8FD1\u9918\u984D\u5E33\u6236" }), _jsxs("div", { className: "mini-list", children: [recentBalances.map((item) => _jsxs("div", { className: "mini-item", children: [_jsx("strong", { children: item.username }), _jsxs("span", { children: [item.balance, " \uFF5C ", prettyDate(item.updatedAt)] })] }, item.userId)), recentBalances.length === 0 ? _jsx("div", { className: "empty-note", children: "\u76EE\u524D\u6C92\u6709\u9918\u984D\u8CC7\u6599\u3002" }) : null] })] })] })] })] }), _jsxs("aside", { className: "control-rail", children: [_jsxs("section", { className: "card rail-card", children: [_jsx("p", { className: "eyebrow", children: "\u76EE\u524D\u5DE5\u4F5C\u5340" }), _jsxs("div", { className: "snapshot-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u5206\u985E" }), _jsx("strong", { children: activeCategoryConfig.label })] }), _jsxs("div", { children: [_jsx("span", { children: "\u9762\u677F" }), _jsx("strong", { children: currentSection?.label ?? "未選擇" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u5546\u57CE" }), _jsx("strong", { children: botGuilds.find((guild) => guild.id === selectedGuildId)?.label || settings.brand.serverName })] }), _jsxs("div", { children: [_jsx("span", { children: "\u8B8A\u66F4\u72C0\u614B" }), _jsx("strong", { children: hasUnsavedChanges ? "尚未儲存" : "已同步" })] })] })] }), _jsxs("section", { className: "card rail-card", children: [_jsx("p", { className: "eyebrow", children: "\u5206\u985E\u5207\u63DB" }), _jsx("div", { className: "nav-list", children: categoryViews.map((item) => (_jsxs("button", { type: "button", className: `nav-link ${activeCategoryView === item.id ? "is-active" : ""}`, onClick: () => {
                                                setActiveCategoryView(item.id);
                                                setActiveSectionView(item.target);
                                                window.location.hash = item.target;
                                            }, children: [_jsx("span", { className: "nav-link-icon", "aria-hidden": "true", children: item.icon }), _jsx("span", { children: item.label })] }, item.id))) })] })] })] }), _jsxs("section", { className: "workspace", children: [_jsxs("div", { className: "content-column", children: [showSection(sectionIds.brand) ? _jsx(Section, { id: sectionIds.brand, title: "\u54C1\u724C\u8A2D\u5B9A", subtitle: "\u63A7\u5236\u5546\u57CE\u6A5F\u5668\u4EBA\u8207\u7DB2\u7AD9\u7684\u4E3B\u8996\u89BA", meta: "\u4E3B\u8996\u89BA\u8207\u540D\u7A31", children: _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u54C1\u724C\u540D\u7A31" }), _jsx("input", { value: settings.brand.serverName, onChange: (e) => setSettings({ ...settings, brand: { ...settings.brand, serverName: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u54C1\u724C\u6A19\u8A9E" }), _jsx("input", { value: settings.brand.tagline, onChange: (e) => setSettings({ ...settings, brand: { ...settings.brand, tagline: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4E3B\u8272" }), _jsx("input", { type: "color", value: settings.brand.primaryColor, onChange: (e) => setSettings({ ...settings, brand: { ...settings.brand, primaryColor: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u526F\u8272" }), _jsx("input", { type: "color", value: settings.brand.secondaryColor, onChange: (e) => setSettings({ ...settings, brand: { ...settings.brand, secondaryColor: e.target.value } }) })] })] }) }) : null, showSection(sectionIds.storefront) ? _jsxs(Section, { id: sectionIds.storefront, title: "\u5546\u57CE\u524D\u53F0", subtitle: "\u8A2D\u5B9A HTML \u5546\u57CE\u7DB2\u7AD9\u7684\u5546\u54C1\u3001\u8A3B\u518A\u8207\u4ED8\u6B3E\u6D41\u7A0B", meta: `${settings.storefront.paymentMethods.filter((item) => item.enabled).length} 個付款方式啟用中`, children: [_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5546\u57CE\u4E3B\u6A19\u984C" }), _jsx("input", { value: settings.storefront.heroTitle, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, heroTitle: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "Google \u767B\u5165\u5165\u53E3" }), _jsx("input", { value: settings.storefront.googleLoginConfigured ? "已接上正式 Google OAuth" : "尚未接上，前台會顯示待設定", readOnly: true })] }), _jsxs("label", { children: [_jsx("span", { children: "Google Client ID" }), _jsx("input", { value: settings.storefront.googleClientId ?? "", onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, googleClientId: e.target.value } }), placeholder: "\u4E4B\u5F8C\u63A5\u6B63\u5F0F OAuth \u7528" })] }), _jsxs("label", { children: [_jsx("span", { children: "Google Redirect URL" }), _jsx("input", { value: settings.storefront.googleRedirectUrl ?? "", onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, googleRedirectUrl: e.target.value } }), placeholder: "\u4F8B\u5982\uFF1Ahttps://\u4F60\u7684\u7DB2\u57DF/api/storefront/google/callback" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5546\u57CE\u901A\u77E5\u983B\u9053 ID" }), _jsx("input", { value: settings.storefront.notificationChannelId, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, notificationChannelId: e.target.value } }), placeholder: "\u9867\u5BA2\u4E0B\u55AE\u5F8C\u81EA\u52D5\u901A\u77E5\u7684 Discord \u983B\u9053 ID" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u65B0\u8CA8\u901A\u77E5\u4F3A\u670D\u5668" }), _jsxs("select", { value: settings.storefront.productAnnouncementGuildId || settings.guildId, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, productAnnouncementGuildId: e.target.value } }), children: [botGuilds.map((guild) => (_jsx("option", { value: guild.id, children: guild.isPrimary ? `主群組｜${guild.name}` : guild.name }, guild.id))), !botGuilds.some((guild) => guild.id === settings.guildId) ? _jsx("option", { value: settings.guildId, children: "\u4E3B\u7FA4\u7D44" }) : null] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4E3B\u7FA4\u7D44\u65B0\u8CA8\u983B\u9053 ID" }), _jsx("input", { value: settings.storefront.productAnnouncementChannelId, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, productAnnouncementChannelId: e.target.value } }), placeholder: "\u5982\u679C\u65B0\u8CA8\u901A\u77E5\u4F3A\u670D\u5668\u662F\u4E3B\u7FA4\u7D44\uFF0C\u5C31\u7528\u9019\u500B\u983B\u9053 ID" })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u5546\u57CE\u4E3B\u63CF\u8FF0" }), _jsx("textarea", { value: settings.storefront.heroDescription, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, heroDescription: e.target.value } }) })] })] }), _jsxs("div", { className: "callout-card", children: [_jsx("strong", { children: "\u8D85\u5546\u4EE3\u78BC\u4ED8\u6B3E\u8DEF\u7DDA" }), _jsx("p", { children: "\u73FE\u5728\u524D\u53F0\u8207 Discord \u81EA\u52A9\u958B\u55AE\u90FD\u6703\u4FDD\u7559\u5169\u689D\u8D85\u5546\u4EE3\u78BC\u6D41\u7A0B\uFF1A`\u8D85\u5546\u4EE3\u78BC\u7E73\u8CBB\uFF08PAYUNi\u76F4\u51FA\uFF09` \u8D70\u76F4\u51FA\u6A21\u7D44\uFF1B`\u8D85\u5546\u4EE3\u78BC\u7E73\u8CBB\uFF08\u6B50\u4ED8\u5BF6\uFF09` \u4FDD\u7559\u539F\u672C\u6B50\u4ED8\u5BF6\u6D41\u7A0B\u3002" })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: settings.storefront.enabled, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, enabled: e.target.checked } }) }), _jsx("span", { children: "\u555F\u7528\u5546\u57CE\u524D\u53F0" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: settings.storefront.supportGoogleLogin, onChange: (e) => setSettings({ ...settings, storefront: { ...settings.storefront, supportGoogleLogin: e.target.checked } }) }), _jsx("span", { children: "\u986F\u793A Google \u8A3B\u518A/\u767B\u5165\u5165\u53E3" })] })] })] }), _jsx("div", { className: "stack", children: settings.storefront.paymentMethods.map((method, index) => (_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u4ED8\u6B3E\u65B9\u5F0F\u540D\u7A31" }), _jsx("input", { value: method.label, onChange: (e) => {
                                                                        const paymentMethods = [...settings.storefront.paymentMethods];
                                                                        paymentMethods[index] = { ...paymentMethods[index], label: e.target.value };
                                                                        setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                                                                    } })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4ED8\u6B3E\u65B9\u5F0F\u4EE3\u865F" }), _jsx("input", { value: method.id, onChange: (e) => {
                                                                        const paymentMethods = [...settings.storefront.paymentMethods];
                                                                        paymentMethods[index] = { ...paymentMethods[index], id: e.target.value };
                                                                        setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                                                                    } })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u524D\u53F0\u8AAA\u660E" }), _jsx("textarea", { value: method.instructions, onChange: (e) => {
                                                                        const paymentMethods = [...settings.storefront.paymentMethods];
                                                                        paymentMethods[index] = { ...paymentMethods[index], instructions: e.target.value };
                                                                        setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                                                                    } })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u7E73\u8CBB\u5E33\u6236 / \u6536\u6B3E\u8CC7\u8A0A" }), _jsx("textarea", { value: method.accountInfo ?? "", onChange: (e) => {
                                                                        const paymentMethods = [...settings.storefront.paymentMethods];
                                                                        paymentMethods[index] = { ...paymentMethods[index], accountInfo: e.target.value };
                                                                        setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                                                                    }, placeholder: "\u4F8B\u5982\uFF1A\u4E2D\u4FE1\u9280\u884C 822\uFF5C\u5E33\u865F 123456789012\uFF5C\u6236\u540D \u738B\u5C0F\u660E" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: method.enabled, onChange: (e) => {
                                                                        const paymentMethods = [...settings.storefront.paymentMethods];
                                                                        paymentMethods[index] = { ...paymentMethods[index], enabled: e.target.checked };
                                                                        setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                                                                    } }), _jsx("span", { children: "\u524D\u53F0\u53EF\u9078" })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods: settings.storefront.paymentMethods.filter((item) => item.id !== method.id) } }), children: "\u522A\u9664\u4ED8\u6B3E\u65B9\u5F0F" })] })] }, method.id))) }), _jsx("div", { className: "button-row", children: _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({
                                                ...settings,
                                                storefront: {
                                                    ...settings.storefront,
                                                    paymentMethods: [
                                                        ...settings.storefront.paymentMethods,
                                                        {
                                                            id: createId("payment"),
                                                            label: "",
                                                            instructions: "",
                                                            accountInfo: "",
                                                            enabled: true
                                                        }
                                                    ]
                                                }
                                            }), children: "\u65B0\u589E\u4ED8\u6B3E\u65B9\u5F0F" }) }), _jsxs("div", { className: "stack", children: [storeOrders.slice(0, 12).map((order) => (_jsxs("div", { className: "row-card store-order-shell", children: [_jsxs("div", { className: "store-order-top", children: [_jsxs("div", { className: "store-order-summary", children: [(() => {
                                                                        const previewProduct = settings.ticket.products.find((item) => item.name === order.items[0]?.name && item.imageUrl?.trim());
                                                                        return previewProduct?.imageUrl ? _jsx("img", { className: "store-order-preview", src: previewProduct.imageUrl, alt: order.items[0]?.name || "商品縮圖" }) : null;
                                                                    })(), _jsxs("div", { className: "store-order-headline", children: [_jsx("strong", { children: order.customerDisplayName }), _jsx("span", { className: "status-chip", children: storeOrderStatusLabel(order.status) })] }), _jsx("p", { className: "store-order-items", children: order.items.map((item) => `${item.name} x${item.quantity}`).join("、") }), _jsxs("div", { className: "store-order-meta-grid", children: [_jsxs("small", { children: ["\u4ED8\u6B3E\u65B9\u5F0F\uFF5C", order.paymentMethodLabel] }), _jsxs("small", { children: ["\u7E3D\u984D\uFF5C", order.totalAmount] }), _jsxs("small", { children: ["\u5EFA\u7ACB\u6642\u9593\uFF5C", prettyDate(order.createdAt)] }), _jsxs("small", { children: ["\u5C0D\u8A71\u7B46\u6578\uFF5C", order.messages?.length ?? 0] })] }), order.opayPaymentCode ? _jsxs("small", { className: "store-order-code", children: ["\u8D85\u5546\u4EE3\u78BC\uFF1A", order.opayPaymentCode, order.opayExpireAt ? ` ｜ 到期：${order.opayExpireAt}` : ""] }) : null] }), _jsxs("div", { className: "store-order-actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => updateStoreOrderStatus(order.id, "payment_code_ready"), disabled: storefrontLoading, children: "\u4ED8\u6B3E\u4EE3\u78BC\u5DF2\u5EFA\u7ACB" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => updateStoreOrderStatus(order.id, "paid"), disabled: storefrontLoading, children: "\u5DF2\u4ED8\u6B3E" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => updateStoreOrderStatus(order.id, "processing"), disabled: storefrontLoading, children: "\u8655\u7406\u4E2D" }), _jsx("button", { type: "button", className: "primary-button", onClick: () => updateStoreOrderStatus(order.id, "completed"), disabled: storefrontLoading, children: "\u5DF2\u5B8C\u6210" })] })] }), _jsxs("div", { className: "store-order-chat", children: [_jsxs("div", { className: "store-order-chat-head", children: [_jsx("strong", { children: "\u7DB2\u7AD9\u8A02\u55AE\u5C0D\u8A71" }), _jsx("small", { children: "\u9867\u5BA2\u9001\u51FA\u5F8C\u6703\u7ACB\u5373\u7559\u5728\u76EE\u524D\u756B\u9762\uFF0C\u4E0D\u6574\u9801\u91CD\u8F09\u3002" })] }), _jsx("div", { className: "dashboard-chat-list", children: (order.messages ?? []).map((message) => (_jsxs("div", { className: `dashboard-chat-bubble ${message.senderType === "staff" ? "from-staff" : message.senderType === "customer" ? "from-customer" : "from-system"}`, children: [_jsxs("div", { className: "dashboard-chat-meta", children: [_jsx("strong", { children: message.senderName }), _jsxs("small", { children: [message.senderType === "staff" ? "後台客服" : message.senderType === "customer" ? "顧客" : "系統", " \uFF5C ", prettyDate(message.createdAt)] })] }), _jsx("p", { children: message.message })] }, message.id))) }), _jsxs("div", { className: "reply-composer", children: [_jsxs("label", { children: [_jsx("span", { children: "\u56DE\u8986\u9867\u5BA2" }), _jsx("textarea", { value: orderReplyDrafts[order.id] ?? "", onChange: (e) => setOrderReplyDrafts((current) => ({ ...current, [order.id]: e.target.value })), placeholder: "\u9019\u88E1\u76F4\u63A5\u56DE\u8986\u9867\u5BA2\uFF0C\u9867\u5BA2\u6703\u5728\u7DB2\u7AD9\u7684\u6211\u7684\u8A02\u55AE\u770B\u5230\u3002" })] }), _jsx("button", { type: "button", className: "primary-button", onClick: () => sendStoreOrderReply(order.id), disabled: storefrontLoading, children: "\u9001\u51FA\u7DB2\u7AD9\u56DE\u8986" })] })] })] }, order.id))), storeOrders.length === 0 ? _jsx("div", { className: "row-card", children: "\u76EE\u524D\u9084\u6C92\u6709\u5546\u57CE\u7DB2\u7AD9\u9001\u9032\u4F86\u7684\u8A02\u55AE\u3002" }) : null] })] }) : null, showSection(sectionIds.accounts) ? _jsxs(Section, { id: sectionIds.accounts, title: "\u5F8C\u53F0\u5E33\u865F", subtitle: "\u5EFA\u7ACB\u5546\u57CE\u5C08\u5C6C\u5E33\u865F\u8207\u767B\u5165\u7BC4\u570D", meta: `${settings.accounts.filter((item) => item.enabled).length} 個啟用中`, children: [_jsx("div", { className: "stack", children: settings.accounts.map((account, index) => (_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "account-card-head", children: [_jsxs("div", { children: [_jsx("strong", { children: account.displayName?.trim() || account.username || `未命名帳號 ${index + 1}` }), _jsxs("p", { children: [account.enabled ? "目前可登入" : "目前停用中", " \u30FB ", account.allowedGuildIds?.includes("*") ? "可管理全部商城" : `${account.allowedGuildIds?.length ?? 0} 個商城權限`] })] }), _jsx("span", { className: `role-pill role-${account.role}`, children: accountRoleLabel(account.role) })] }), _jsxs("div", { className: "field-grid three", children: [_jsxs("label", { children: [_jsx("span", { children: "\u767B\u5165\u5E33\u865F" }), _jsx("input", { value: account.username, onChange: (e) => updateAccount(index, { ...account, username: e.target.value }), placeholder: "\u4F8B\u5982\uFF1Aadmin" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u986F\u793A\u540D\u7A31" }), _jsx("input", { value: account.displayName ?? "", onChange: (e) => updateAccount(index, { ...account, displayName: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u661F\u5149\u5546\u57CE\u4E00\u5E97" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u767B\u5165\u5BC6\u78BC" }), _jsx("input", { value: account.password, onChange: (e) => updateAccount(index, { ...account, password: e.target.value }), placeholder: "\u81F3\u5C11\u5EFA\u8B70 8 \u78BC" })] })] }), _jsxs("div", { className: "field-grid three", children: [_jsxs("label", { children: [_jsx("span", { children: "\u89D2\u8272" }), _jsxs("select", { value: account.role, onChange: (e) => updateAccount(index, { ...account, role: e.target.value }), children: [_jsx("option", { value: "admin", children: "\u7BA1\u7406\u54E1" }), _jsx("option", { value: "owner", children: "\u8001\u95C6" }), _jsx("option", { value: "developer", children: "\u958B\u767C\u8005" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u767B\u5165\u6A21\u5F0F" }), _jsxs("select", { value: account.authMode ?? "both", onChange: (e) => updateAccount(index, { ...account, authMode: e.target.value }), children: [_jsx("option", { value: "both", children: "\u672C\u5730\u5BC6\u78BC + Discord" }), _jsx("option", { value: "local", children: "\u53EA\u5141\u8A31\u672C\u5730\u5BC6\u78BC" }), _jsx("option", { value: "discord", children: "\u53EA\u5141\u8A31 Discord" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u7D81\u5B9A Discord \u4F7F\u7528\u8005 ID" }), _jsx("input", { value: account.discordUserId ?? "", onChange: (e) => updateAccount(index, { ...account, discordUserId: e.target.value }), placeholder: "\u8F38\u5165\u5F8C\u53EF\u9650\u5236 Discord \u767B\u5165\u5C0D\u61C9\u5E33\u865F" })] })] }), _jsxs("div", { className: "scope-panel", children: [_jsxs("div", { className: "scope-panel-head", children: [_jsxs("div", { children: [_jsx("strong", { children: "\u53EF\u7BA1\u7406\u5546\u57CE\u7BC4\u570D" }), _jsx("p", { children: "\u5546\u57CE\u5C08\u5C6C\u5E33\u865F\u5EFA\u8B70\u53EA\u52FE\u81EA\u5DF1\u7684\u5546\u57CE\uFF1B\u6B50\u4ED8\u5BF6\u4E5F\u6703\u4FDD\u7559\u5728\u9019\u4E9B\u88AB\u6388\u6B0A\u7684\u5546\u57CE\u6D41\u7A0B\u88E1\u3002" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: account.allowedGuildIds?.includes("*") ?? false, onChange: (e) => toggleAccountAllGuilds(index, e.target.checked) }), _jsx("span", { children: "\u5168\u90E8\u5546\u57CE" })] })] }), _jsx("div", { className: "scope-chip-grid", children: guildScopeChoices.map((guild) => {
                                                                const checked = account.allowedGuildIds?.includes("*") || account.allowedGuildIds?.includes(guild.id);
                                                                return (_jsxs("label", { className: `scope-chip ${checked ? "is-selected" : ""}`, children: [_jsx("input", { type: "checkbox", checked: checked, disabled: account.allowedGuildIds?.includes("*"), onChange: (e) => toggleAccountGuildScope(index, guild.id, e.target.checked) }), _jsx("span", { children: guild.name }), _jsx("small", { children: guild.isPrimary ? "主商城" : guild.approved ? "已批准" : "待批准" })] }, `${account.id}-${guild.id}`));
                                                            }) })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: account.enabled, onChange: (e) => updateAccount(index, { ...account, enabled: e.target.checked }) }), _jsx("span", { children: "\u5141\u8A31\u767B\u5165" })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, accounts: settings.accounts.filter((item) => item.id !== account.id) }), children: "\u522A\u9664\u5E33\u865F" })] })] }, account.id))) }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("admin")] }), children: "\u65B0\u589E\u7BA1\u7406\u54E1\u5E33\u865F" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("owner")] }), children: "\u65B0\u589E\u8001\u95C6\u5E33\u865F" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("developer")] }), children: "\u65B0\u589E\u958B\u767C\u8005\u5E33\u865F" })] })] }) : null, showSection(sectionIds.serverControl) ? _jsxs(Section, { id: sectionIds.serverControl, title: "\u7FA4\u7D44\u63A7\u5236\u53F0", subtitle: "\u9078\u64C7\u6A5F\u5668\u4EBA\u5DF2\u52A0\u5165\u7684\u7FA4\u7D44\u5F8C\u76F4\u63A5\u7BA1\u7406\u8207\u767C\u9001\u8A0A\u606F", meta: `${botGuilds.length} 個已加入群組`, children: [_jsxs("div", { className: "row-card discord-server-shell", children: [_jsxs("aside", { className: "discord-server-rail", children: [_jsx("div", { className: "discord-server-rail-head", children: _jsx("p", { className: "eyebrow", children: "Servers" }) }), _jsx("div", { className: "discord-server-list", children: botGuilds.map((guild) => {
                                                            const isSelected = guild.id === selectedGuildId;
                                                            return (_jsxs("button", { type: "button", className: `discord-server-node ${isSelected ? "is-selected" : ""}`, onClick: () => setSelectedGuildId(guild.id), title: guild.name, children: [guild.iconUrl ? (_jsx("img", { className: "discord-server-node-avatar", src: guild.iconUrl, alt: guild.name })) : (_jsx("div", { className: "discord-server-node-fallback", children: guildInitials(guild.name) })), _jsx("span", { className: `discord-server-node-marker ${isSelected ? "is-selected" : ""}` })] }, guild.id));
                                                        }) })] }), _jsxs("div", { className: "discord-server-panel", children: [_jsxs("div", { className: "discord-server-header", children: [_jsxs("div", { className: "discord-server-profile", children: [selectedGuildMeta?.iconUrl ? (_jsx("img", { className: "discord-server-profile-avatar", src: selectedGuildMeta.iconUrl, alt: selectedGuildMeta.name })) : (_jsx("div", { className: "discord-server-profile-fallback", children: guildInitials(selectedGuildMeta?.name || selectedGuildConfig?.label || "伺服器") })), _jsxs("div", { className: "discord-server-profile-copy", children: [_jsx("p", { className: "eyebrow", children: "\u76EE\u524D\u8A2D\u5B9A\u4F3A\u670D\u5668" }), _jsx("strong", { children: selectedGuildMeta?.name || selectedGuildConfig?.label || "未命名群組" }), _jsx("small", { children: selectedGuildMeta?.isPrimary
                                                                                    ? "主群組設定"
                                                                                    : selectedGuildMeta?.approved
                                                                                        ? "已批准，可直接啟用功能"
                                                                                        : "待批准，設定完成後還要手動批准" })] })] }), _jsxs("div", { className: "discord-server-header-actions", children: [!selectedGuildMeta?.isPrimary ? _jsx("button", { type: "button", className: "ghost-button", onClick: () => toggleGuildApproval(false), disabled: guildLoading, children: "\u505C\u7528\u529F\u80FD" }) : null, !selectedGuildMeta?.isPrimary ? _jsx("button", { type: "button", className: "primary-button", onClick: () => toggleGuildApproval(true), disabled: guildLoading, children: "\u6279\u51C6\u53EF\u7528" }) : null] })] }), _jsxs("div", { className: "discord-server-facts", children: [selectedGuildMeta ? _jsxs("span", { className: "chip", children: ["\u7FA4\u7D44 ID\uFF1A", selectedGuildMeta.id] }) : null, selectedGuildMeta?.memberCount ? _jsxs("span", { className: "chip", children: ["\u6210\u54E1\u6578\uFF1A", selectedGuildMeta.memberCount] }) : null, selectedGuildMeta ? _jsx("span", { className: "chip", children: selectedGuildMeta.isPrimary ? "這個群組永遠可用" : selectedGuildMeta.approved ? "已批准，可使用全部功能" : "尚未批准，功能鎖定" }) : null, _jsx("span", { className: "chip", children: guildLoading ? "資源讀取中" : `可用頻道 ${guildResources.channels.length} ｜ 身分組 ${guildResources.roles.length}` })] })] })] }), selectedGuildConfig ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "server-settings-workspace", children: [_jsxs("div", { className: "server-settings-main", children: [_jsxs("div", { className: "row-card discord-channel-header", children: [_jsx("div", { className: "discord-channel-hash", children: "#" }), _jsxs("div", { className: "discord-channel-copy", children: [_jsxs("strong", { children: [selectedGuildMeta?.name || selectedGuildConfig.label || "未命名群組", " \u8A2D\u5B9A"] }), _jsx("small", { children: "\u9EDE\u5DE6\u908A\u4F3A\u670D\u5668\u5217\u5207\u63DB\u7FA4\u7D44\uFF0C\u9019\u88E1\u6703\u53EA\u986F\u793A\u76EE\u524D\u7FA4\u7D44\u7684\u8A2D\u5B9A\u5167\u5BB9\u3002" })] })] }), _jsxs("div", { className: "row-card settings-category-card", children: [_jsxs("div", { className: "panel-heading settings-block-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Channels" }), _jsx("h3", { children: "\u983B\u9053\u8A2D\u5B9A" })] }), _jsx("span", { className: "settings-block-badge", children: "Channel" })] }), _jsx("p", { className: "reply-hint", children: "\u9664\u4E86\u672A\u4ED8\u6B3E / \u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID\uFF0C\u5176\u4ED6\u6B04\u4F4D\u7559\u7A7A\u6642\u90FD\u6703\u6CBF\u7528\u4E3B\u7FA4\u7D44\u8A2D\u5B9A\u3002" }), _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u8A55\u50F9\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.reviewChannelId, onChange: (e) => updateSelectedGuildConfig({ reviewChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u8A55\u50F9\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u672A\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: selectedGuildConfig.ticketCategoryId, onChange: (e) => updateSelectedGuildConfig({ ticketCategoryId: e.target.value }), placeholder: "\u9019\u500B\u7FA4\u5FC5\u586B" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: selectedGuildConfig.paidTicketCategoryId ?? "", onChange: (e) => updateSelectedGuildConfig({ paidTicketCategoryId: e.target.value }), placeholder: "\u9019\u500B\u7FA4\u5FC5\u586B" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DE5\u55AE\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.ticketLogChannelId, onChange: (e) => updateSelectedGuildConfig({ ticketLogChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5DE5\u55AE\u7D00\u9304\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B58\u6A94\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.transcriptChannelId, onChange: (e) => updateSelectedGuildConfig({ transcriptChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5B58\u6A94\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u9632\u5237\u983B\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.moderationLogChannelId, onChange: (e) => updateSelectedGuildConfig({ moderationLogChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u9632\u5237\u983B\u7D00\u9304\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u9019\u500B\u7FA4\u7684\u65B0\u8CA8\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.productAnnouncementChannelId ?? "", onChange: (e) => updateSelectedGuildConfig({ productAnnouncementChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u65B0\u8CA8\u983B\u9053" })] })] })] }), _jsxs("div", { className: "row-card settings-category-card", children: [_jsxs("div", { className: "panel-heading settings-block-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Roles & Counters" }), _jsx("h3", { children: "\u8EAB\u5206\u7D44\u8207\u7D71\u8A08" })] }), _jsx("span", { className: "settings-block-badge", children: "Role" })] }), _jsx("p", { className: "reply-hint", children: "\u5BA2\u670D\u8EAB\u5206\u7D44\u3001\u5B8C\u6210\u7968\u55AE\u7D71\u8A08\u8207\u81EA\u52D5\u8EAB\u5206\u7D44\u90FD\u53EF\u4EE5\u7559\u7A7A\uFF0C\u6703\u81EA\u52D5\u6CBF\u7528\u4E3B\u7FA4\u7D44\u8A2D\u5B9A\u3002" }), _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5BA2\u670D\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: selectedGuildConfig.supportRoleId, onChange: (e) => updateSelectedGuildConfig({ supportRoleId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5BA2\u670D\u8EAB\u5206\u7D44" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u81EA\u52D5\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: selectedGuildConfig.autoRoleId, onChange: (e) => updateSelectedGuildConfig({ autoRoleId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u81EA\u52D5\u8EAB\u5206\u7D44" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B8C\u6210\u7968\u55AE\u6578\u983B\u9053 ID" }), _jsx("input", { value: selectedGuildConfig.completedCountChannelId, onChange: (e) => updateSelectedGuildConfig({ completedCountChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5B8C\u6210\u7968\u55AE\u7D71\u8A08\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B8C\u6210\u7968\u55AE\u6578\u6A19\u984C" }), _jsx("input", { value: selectedGuildConfig.completedCountLabel, onChange: (e) => updateSelectedGuildConfig({ completedCountLabel: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u6A19\u984C" })] })] })] }), _jsxs("div", { className: "row-card settings-category-card", children: [_jsxs("div", { className: "panel-heading settings-block-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Broadcast" }), _jsx("h3", { children: "\u5F8C\u53F0\u767C\u9001\u8A0A\u606F" })] }), _jsx("span", { className: "settings-block-badge", children: "Send" })] }), _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5F8C\u53F0\u767C\u9001\u983B\u9053" }), _jsxs("select", { value: messageDraft.channelId, onChange: (e) => setMessageDraft({ ...messageDraft, channelId: e.target.value }), children: [_jsx("option", { value: "", children: "\u9078\u64C7\u8981\u767C\u9001\u7684\u6587\u5B57\u983B\u9053" }), guildResources.channels.filter((item) => item.type === 0 || item.type === 5).map((channel) => (_jsx("option", { value: channel.id, children: channel.name }, channel.id)))] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u53EF\u7528\u8CC7\u6E90" }), _jsx("input", { value: guildLoading ? "讀取中..." : `頻道 ${guildResources.channels.length} 個｜身分組 ${guildResources.roles.length} 個`, readOnly: true })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u5F8C\u53F0\u8A0A\u606F\u5167\u5BB9" }), _jsx("textarea", { value: messageDraft.content, onChange: (e) => setMessageDraft({ ...messageDraft, content: e.target.value }), placeholder: "\u5728\u9019\u88E1\u8F38\u5165\u8981\u7531\u6A5F\u5668\u4EBA\u9001\u5230\u9078\u5B9A\u983B\u9053\u7684\u5167\u5BB9" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("small", { className: "reply-hint", children: "\u65B0\u52A0\u5165\u7684\u7FA4\u7D44\u9810\u8A2D\u6703\u662F\u5F85\u6279\u51C6\uFF0C\u5FC5\u9808\u5148\u5728\u9019\u88E1\u6309\u300C\u6279\u51C6\u53EF\u7528\u300D\u624D\u6703\u958B\u653E slash \u6307\u4EE4\u8207\u81EA\u52D5\u529F\u80FD\u3002" }), _jsx("button", { type: "button", className: "primary-button", onClick: sendDashboardMessage, disabled: guildLoading || !selectedGuildMeta?.approved, children: "\u7528\u5F8C\u53F0\u767C\u9001\u8A0A\u606F" })] })] })] }), _jsxs("aside", { className: "server-settings-side", children: [_jsxs("div", { className: "row-card settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83D\uDCCC" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Overview" }), _jsx("strong", { children: "\u4F3A\u670D\u5668\u6458\u8981" })] })] }), _jsxs("div", { className: "snapshot-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u7FA4\u7D44\u540D\u7A31" }), _jsx("strong", { children: selectedGuildMeta?.name || selectedGuildConfig.label || "未命名" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u7FA4\u7D44 ID" }), _jsx("strong", { children: selectedGuildMeta?.id || selectedGuildId || "未同步" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u6210\u54E1\u6578" }), _jsx("strong", { children: selectedGuildMeta?.memberCount ?? "讀取中" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u555F\u7528\u72C0\u614B" }), _jsx("strong", { children: selectedGuildMeta?.isPrimary ? "主群組" : selectedGuildMeta?.approved ? "已批准" : "待批准" })] })] })] }), _jsxs("div", { className: "row-card settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83C\uDFAB" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Ticket Flow" }), _jsx("strong", { children: "\u5DE5\u55AE\u6D41\u7A0B" })] })] }), _jsxs("div", { className: "faq-stack", children: [_jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u672A\u4ED8\u6B3E\u6D41\u7A0B" }), _jsx("small", { children: "\u6703\u4F7F\u7528\u672A\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID \u5EFA\u7ACB\u8207\u7DAD\u6301\u7968\u55AE\u3002" })] }), _jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u5DF2\u4ED8\u6B3E\u6D41\u7A0B" }), _jsx("small", { children: "\u78BA\u8A8D\u4ED8\u6B3E\u5F8C\u6703\u81EA\u52D5\u79FB\u52D5\u5230\u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID\u3002" })] })] })] }), _jsxs("div", { className: "row-card settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83D\uDEE1\uFE0F" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Permission Notes" }), _jsx("strong", { children: "\u6B0A\u9650\u5099\u5FD8" })] })] }), _jsxs("div", { className: "faq-stack", children: [_jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u5BA2\u670D\u8EAB\u5206\u7D44" }), _jsx("small", { children: "\u5DE5\u55AE\u6309\u9215\u8207\u8655\u7406\u6D41\u7A0B\u6703\u512A\u5148\u4F9D\u7167\u5BA2\u670D\u8EAB\u5206\u7D44\u9650\u5236\u6B0A\u9650\u3002" })] }), _jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u6279\u51C6\u53EF\u7528" }), _jsx("small", { children: "\u7FA4\u7D44\u5FC5\u9808\u88AB\u6279\u51C6\u5F8C\uFF0Cslash \u6307\u4EE4\u548C\u81EA\u52D5\u529F\u80FD\u624D\u6703\u771F\u7684\u958B\u653E\u3002" })] })] })] })] })] }), _jsxs("div", { className: "row-card server-settings-bottom-grid", children: [_jsxs("div", { className: "settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83D\uDCCC" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Overview" }), _jsx("strong", { children: "\u4F3A\u670D\u5668\u6458\u8981" })] })] }), _jsxs("div", { className: "snapshot-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u7FA4\u7D44\u540D\u7A31" }), _jsx("strong", { children: selectedGuildMeta?.name || selectedGuildConfig.label || "未命名" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u7FA4\u7D44 ID" }), _jsx("strong", { children: selectedGuildMeta?.id || selectedGuildId || "未同步" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u6210\u54E1\u6578" }), _jsx("strong", { children: selectedGuildMeta?.memberCount ?? "讀取中" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u555F\u7528\u72C0\u614B" }), _jsx("strong", { children: selectedGuildMeta?.isPrimary ? "主群組" : selectedGuildMeta?.approved ? "已批准" : "待批准" })] })] })] }), _jsxs("div", { className: "settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83C\uDFAB" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Ticket Flow" }), _jsx("strong", { children: "\u5DE5\u55AE\u6D41\u7A0B" })] })] }), _jsxs("div", { className: "faq-stack", children: [_jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u672A\u4ED8\u6B3E\u6D41\u7A0B" }), _jsx("small", { children: "\u6703\u4F7F\u7528\u672A\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID \u5EFA\u7ACB\u8207\u7DAD\u6301\u7968\u55AE\u3002" })] }), _jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u5DF2\u4ED8\u6B3E\u6D41\u7A0B" }), _jsx("small", { children: "\u78BA\u8A8D\u4ED8\u6B3E\u5F8C\u6703\u81EA\u52D5\u79FB\u52D5\u5230\u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID\u3002" })] })] })] }), _jsxs("div", { className: "settings-side-card", children: [_jsxs("div", { className: "settings-side-head", children: [_jsx("span", { className: "settings-side-icon", children: "\uD83D\uDEE1\uFE0F" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Permission Notes" }), _jsx("strong", { children: "\u6B0A\u9650\u5099\u5FD8" })] })] }), _jsxs("div", { className: "faq-stack", children: [_jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u5BA2\u670D\u8EAB\u5206\u7D44" }), _jsx("small", { children: "\u5DE5\u55AE\u6309\u9215\u8207\u8655\u7406\u6D41\u7A0B\u6703\u512A\u5148\u4F9D\u7167\u5BA2\u670D\u8EAB\u5206\u7D44\u9650\u5236\u6B0A\u9650\u3002" })] }), _jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: "\u6279\u51C6\u53EF\u7528" }), _jsx("small", { children: "\u7FA4\u7D44\u5FC5\u9808\u88AB\u6279\u51C6\u5F8C\uFF0Cslash \u6307\u4EE4\u548C\u81EA\u52D5\u529F\u80FD\u624D\u6703\u771F\u7684\u958B\u653E\u3002" })] })] })] })] })] })) : (_jsx("div", { className: "row-card", children: "\u9019\u500B\u7FA4\u7D44\u5C1A\u672A\u5EFA\u7ACB\u53EF\u7DE8\u8F2F\u8A2D\u5B9A\u3002\u82E5\u662F\u65B0\u52A0\u5165\u7FA4\u7D44\uFF0C\u7B49\u6A5F\u5668\u4EBA\u540C\u6B65\u5F8C\u5C31\u6703\u51FA\u73FE\u5728\u591A\u7FA4\u7D44\u6E05\u55AE\u3002" }))] }) : null, showSection(sectionIds.giveaways) ? _jsxs(Section, { id: sectionIds.giveaways, title: "\u62BD\u734E\u7BA1\u7406", subtitle: "\u5F9E\u5F8C\u53F0\u76F4\u63A5\u5EFA\u7ACB\u62BD\u734E\u3001\u624B\u52D5\u958B\u734E\u8207\u624B\u52D5\u95DC\u734E", meta: `${activeGiveaways.length} 個進行中`, children: [_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid three", children: [_jsxs("label", { children: [_jsx("span", { children: "\u62BD\u734E\u983B\u9053" }), _jsxs("select", { value: giveawayDraft.channelId, onChange: (e) => setGiveawayDraft({ ...giveawayDraft, channelId: e.target.value }), children: [_jsx("option", { value: "", children: "\u9078\u64C7\u8981\u767C\u9001\u62BD\u734E\u7684\u6587\u5B57\u983B\u9053" }), guildResources.channels.filter((item) => item.type === 0 || item.type === 5).map((channel) => (_jsx("option", { value: channel.id, children: channel.name }, channel.id)))] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u6301\u7E8C\u5206\u9418\u6578" }), _jsx("input", { type: "number", min: 1, value: giveawayDraft.minutes, onChange: (e) => setGiveawayDraft({ ...giveawayDraft, minutes: Number(e.target.value) || 1 }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4E2D\u734E\u540D\u984D" }), _jsx("input", { type: "number", min: 1, value: giveawayDraft.winnersCount, onChange: (e) => setGiveawayDraft({ ...giveawayDraft, winnersCount: Number(e.target.value) || 1 }) })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u62BD\u734E\u734E\u54C1" }), _jsx("input", { value: giveawayDraft.prize, onChange: (e) => setGiveawayDraft({ ...giveawayDraft, prize: e.target.value }), placeholder: "\u4F8B\u5982\uFF1ANitro\u3001\u5546\u57CE\u6298\u6263\u5238\u300180 Robux" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("small", { className: "reply-hint", children: "\u9019\u88E1\u5EFA\u7ACB\u7684\u62BD\u734E\u6703\u76F4\u63A5\u767C\u5230\u4F60\u73FE\u5728\u9078\u5B9A\u7FA4\u7D44\u7684\u6307\u5B9A\u983B\u9053\uFF0C\u4E4B\u5F8C\u4E5F\u80FD\u5728\u4E0B\u65B9\u624B\u52D5\u958B\u734E\u6216\u95DC\u734E\u3002" }), _jsx("button", { type: "button", className: "primary-button", onClick: createGiveaway, disabled: giveawayLoading || !selectedGuildMeta?.approved, children: "\u5F9E\u5F8C\u53F0\u5EFA\u7ACB\u62BD\u734E" })] })] }), _jsxs("div", { className: "stack", children: [giveaways.filter((item) => item.guildId === selectedGuildId).slice(0, 8).map((giveaway) => (_jsx("div", { className: `row-card ticket-card tone-${giveaway.ended ? "muted" : "brand"}`, children: _jsxs("div", { className: "ticket-row", children: [_jsxs("div", { children: [_jsx("strong", { children: giveaway.prize }), _jsxs("p", { children: ["ID\uFF1A", giveaway.id] }), _jsxs("small", { children: [giveaway.ended ? "已結束" : "進行中", " \uFF5C \u53C3\u52A0 ", giveaway.participants.length, " \u4EBA \uFF5C \u540D\u984D ", giveaway.winnersCount, " \uFF5C \u7D50\u675F\u65BC ", prettyDate(giveaway.endAt)] })] }), _jsxs("div", { className: "button-row", children: [!giveaway.ended ? _jsx("button", { type: "button", className: "primary-button", onClick: () => drawGiveaway(giveaway.id), disabled: giveawayLoading, children: "\u624B\u52D5\u958B\u734E" }) : null, !giveaway.ended ? _jsx("button", { type: "button", className: "ghost-button", onClick: () => closeGiveaway(giveaway.id), disabled: giveawayLoading, children: "\u624B\u52D5\u95DC\u734E" }) : null] })] }) }, giveaway.id))), giveaways.filter((item) => item.guildId === selectedGuildId).length === 0 ? _jsx("div", { className: "row-card", children: "\u9019\u500B\u7FA4\u7D44\u76EE\u524D\u9084\u6C92\u6709\u62BD\u734E\u6D3B\u52D5\u3002" }) : null] })] }) : null, showSection(sectionIds.multiGuild) ? _jsxs(Section, { id: sectionIds.multiGuild, title: "\u591A\u7FA4\u7D44\u8A2D\u5B9A", subtitle: "\u8B93\u540C\u4E00\u5957\u6A5F\u5668\u4EBA\u5728\u5176\u4ED6\u7FA4\u7D44\u4E5F\u80FD\u4F7F\u7528", meta: `${settings.linkedGuilds.length} 個額外群組`, children: [_jsxs("div", { className: "stack", children: [settings.linkedGuilds.map((guild, index) => (_jsxs("div", { className: "row-card", children: [_jsx("p", { className: "reply-hint", children: "\u53EA\u8981\u7FA4\u7D44\u88AB\u6279\u51C6\uFF0C\u9664\u4E86\u672A\u4ED8\u6B3E / \u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID \u4EE5\u5916\uFF0C\u5176\u4ED6\u6B04\u4F4D\u90FD\u53EF\u4EE5\u7559\u7A7A\u4E26\u6CBF\u7528\u4E3B\u7FA4\u7D44\u3002" }), _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u7FA4\u7D44 ID" }), _jsx("input", { value: guild.guildId, onChange: (e) => updateLinkedGuild(index, { ...guild, guildId: e.target.value }), placeholder: "\u624B\u52D5\u8F38\u5165 Discord \u7FA4\u7D44 ID" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u986F\u793A\u540D\u7A31" }), _jsx("input", { value: guild.label, onChange: (e) => updateLinkedGuild(index, { ...guild, label: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u5206\u5E97\u7FA4\u3001\u5408\u4F5C\u7FA4" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u8A55\u50F9\u983B\u9053 ID" }), _jsx("input", { value: guild.reviewChannelId, onChange: (e) => updateLinkedGuild(index, { ...guild, reviewChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u8A55\u50F9\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u672A\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: guild.ticketCategoryId, onChange: (e) => updateLinkedGuild(index, { ...guild, ticketCategoryId: e.target.value }), placeholder: "\u9019\u500B\u7FA4\u5FC5\u586B" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: guild.paidTicketCategoryId ?? "", onChange: (e) => updateLinkedGuild(index, { ...guild, paidTicketCategoryId: e.target.value }), placeholder: "\u9019\u500B\u7FA4\u5FC5\u586B" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5BA2\u670D\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: guild.supportRoleId, onChange: (e) => updateLinkedGuild(index, { ...guild, supportRoleId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5BA2\u670D\u8EAB\u5206\u7D44" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u81EA\u52D5\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: guild.autoRoleId, onChange: (e) => updateLinkedGuild(index, { ...guild, autoRoleId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u81EA\u52D5\u8EAB\u5206\u7D44" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DE5\u55AE\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: guild.ticketLogChannelId, onChange: (e) => updateLinkedGuild(index, { ...guild, ticketLogChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5DE5\u55AE\u7D00\u9304\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B58\u6A94\u983B\u9053 ID" }), _jsx("input", { value: guild.transcriptChannelId, onChange: (e) => updateLinkedGuild(index, { ...guild, transcriptChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5B58\u6A94\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B8C\u6210\u7968\u55AE\u6578\u983B\u9053 ID" }), _jsx("input", { value: guild.completedCountChannelId, onChange: (e) => updateLinkedGuild(index, { ...guild, completedCountChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u5B8C\u6210\u7968\u55AE\u7D71\u8A08\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B8C\u6210\u7968\u55AE\u6578\u6A19\u984C" }), _jsx("input", { value: guild.completedCountLabel, onChange: (e) => updateLinkedGuild(index, { ...guild, completedCountLabel: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u6A19\u984C" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u9632\u5237\u983B\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: guild.moderationLogChannelId, onChange: (e) => updateLinkedGuild(index, { ...guild, moderationLogChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u9632\u5237\u983B\u7D00\u9304\u983B\u9053" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u65B0\u8CA8\u983B\u9053 ID" }), _jsx("input", { value: guild.productAnnouncementChannelId ?? "", onChange: (e) => updateLinkedGuild(index, { ...guild, productAnnouncementChannelId: e.target.value }), placeholder: "\u7559\u7A7A\u5C31\u6CBF\u7528\u4E3B\u7FA4\u7D44\u65B0\u8CA8\u983B\u9053" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: guild.enabled, onChange: (e) => updateLinkedGuild(index, { ...guild, enabled: e.target.checked }) }), _jsx("span", { children: "\u555F\u7528\u9019\u500B\u7FA4\u7D44" })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, linkedGuilds: settings.linkedGuilds.filter((_, guildIndex) => guildIndex !== index) }), children: "\u522A\u9664\u7FA4\u7D44" })] })] }, `${guild.guildId || "linked"}-${index}`))), settings.linkedGuilds.length === 0 ? _jsx("div", { className: "row-card", children: "\u76EE\u524D\u9084\u6C92\u6709\u984D\u5916\u7FA4\u7D44\u3002\u65B0\u589E\u5F8C\u624B\u52D5\u586B\u5165\u7FA4\u7D44 ID \u548C\u5404\u983B\u9053/\u8EAB\u5206\u7D44 ID \u5C31\u80FD\u4F7F\u7528\u3002" }) : null] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, linkedGuilds: [...settings.linkedGuilds, newLinkedGuild()] }), children: "\u65B0\u589E\u984D\u5916\u7FA4\u7D44" })] }) : null, showSection(sectionIds.ticket) ? _jsxs(Section, { id: sectionIds.ticket, title: "\u5DE5\u55AE\u7CFB\u7D71", subtitle: "\u5546\u57CE\u8A02\u55AE\u6D41\u7A0B\u3001\u7D71\u8A08\u983B\u9053\u8207\u5BA2\u670D\u8A2D\u5B9A", meta: `${settings.ticket.categories.length} 個類型`, children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u672A\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: settings.ticket.categoryId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, categoryId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DF2\u4ED8\u6B3E\u5DE5\u55AE\u5206\u985E\u5340 ID" }), _jsx("input", { value: settings.ticket.paidCategoryId ?? "", onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, paidCategoryId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5BA2\u670D\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: settings.ticket.supportRoleId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, supportRoleId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u81EA\u52D5\u8EAB\u5206\u7D44 ID" }), _jsx("input", { value: settings.ticket.autoRoleId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, autoRoleId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DE5\u55AE\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: settings.ticket.logChannelId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, logChannelId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B58\u6A94\u983B\u9053 ID" }), _jsx("input", { value: settings.ticket.transcriptChannelId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, transcriptChannelId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5B8C\u6210\u7968\u55AE\u6578\u983B\u9053 ID" }), _jsx("input", { value: settings.ticket.completedCountChannelId, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, completedCountChannelId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u7D71\u8A08\u983B\u9053\u6A19\u984C" }), _jsx("input", { value: settings.ticket.completedCountLabel, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, completedCountLabel: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u540C\u6642\u958B\u55AE\u4E0A\u9650" }), _jsx("input", { type: "number", min: 1, value: settings.ticket.maxOpenTicketsPerUser, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, maxOpenTicketsPerUser: Number(e.target.value) || 1 } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5DE5\u55AE\u6309\u9215\u6587\u5B57" }), _jsx("input", { value: settings.ticket.buttonLabel, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, buttonLabel: e.target.value } }) })] })] }), _jsxs("div", { className: "inline-actions top-gap", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: settings.ticket.allowDashboardClose, onChange: (e) => setSettings({ ...settings, ticket: { ...settings.ticket, allowDashboardClose: e.target.checked } }) }), _jsx("span", { children: "\u5F8C\u53F0\u95DC\u55AE" })] }), _jsx("div", { className: "chip-list", children: settings.ticket.categories.map((category) => _jsxs("span", { className: "chip", children: [category.emoji, " ", category.label] }, category.id)) })] })] }) : null, showSection(sectionIds.moderation) ? _jsxs(Section, { id: sectionIds.moderation, title: "\u9632\u5237\u983B", subtitle: "\u9632\u6B62\u77ED\u6642\u9593\u5927\u91CF\u8A0A\u606F\u6D17\u7248\u7684\u81EA\u52D5\u8655\u7F6E", meta: settings.moderation.antiSpamEnabled ? "保護中" : "未啟用", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u7D00\u9304\u983B\u9053 ID" }), _jsx("input", { value: settings.moderation.logChannelId, onChange: (e) => setSettings({ ...settings, moderation: { ...settings.moderation, logChannelId: e.target.value } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u8A0A\u606F\u9580\u6ABB" }), _jsx("input", { type: "number", min: 2, value: settings.moderation.spamMessageLimit, onChange: (e) => setSettings({ ...settings, moderation: { ...settings.moderation, spamMessageLimit: Number(e.target.value) || 5 } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u6642\u9593\u7A97\u53E3\uFF08\u79D2\uFF09" }), _jsx("input", { type: "number", min: 2, value: settings.moderation.spamWindowSeconds, onChange: (e) => setSettings({ ...settings, moderation: { ...settings.moderation, spamWindowSeconds: Number(e.target.value) || 8 } }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u7981\u8A00\u5206\u9418\u6578" }), _jsx("input", { type: "number", min: 1, value: settings.moderation.timeoutMinutes, onChange: (e) => setSettings({ ...settings, moderation: { ...settings.moderation, timeoutMinutes: Number(e.target.value) || 10 } }) })] })] }), _jsx("div", { className: "inline-actions top-gap", children: _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: settings.moderation.antiSpamEnabled, onChange: (e) => setSettings({ ...settings, moderation: { ...settings.moderation, antiSpamEnabled: e.target.checked } }) }), _jsx("span", { children: "\u555F\u7528\u9632\u5237\u983B" })] }) })] }) : null, showSection(sectionIds.products) ? _jsxs(Section, { id: sectionIds.products, title: "\u5546\u54C1\u76EE\u9304", subtitle: "\u8B93\u8CFC\u7269\u55AE\u53EF\u76F4\u63A5\u5F15\u7528\u5546\u57CE\u5546\u54C1", meta: `${enabledProducts} 項上架中`, children: [_jsxs("div", { className: "row-card inventory-overview", children: [_jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u5546\u54C1\u7E3D\u6578" }), _jsx("strong", { children: settings.ticket.products.length }), _jsx("small", { children: "\u76EE\u524D\u5546\u54C1\u5EAB\u6240\u6709\u54C1\u9805" })] }), _jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u4E0A\u67B6\u4E2D" }), _jsx("strong", { children: enabledProducts }), _jsx("small", { children: "\u9867\u5BA2\u76EE\u524D\u770B\u5F97\u5230\u7684\u5546\u54C1" })] }), _jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u7CBE\u9078\u5546\u54C1" }), _jsx("strong", { children: settings.ticket.products.filter((item) => item.featured).length }), _jsx("small", { children: "\u9996\u9801\u6703\u512A\u5148\u5C55\u793A\u7684\u5546\u54C1" })] }), _jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u7F3A\u8CA8\u4E2D" }), _jsx("strong", { children: outOfStockProducts }), _jsx("small", { children: "\u76EE\u524D\u9867\u5BA2\u66AB\u6642\u7121\u6CD5\u4E0B\u55AE\u7684\u5546\u54C1" })] }), _jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u88DC\u8CA8\u4E2D" }), _jsx("strong", { children: restockingProducts }), _jsx("small", { children: "\u7B49\u5F85\u91CD\u65B0\u4E0A\u67B6\u6216\u88DC\u8CA8\u7684\u5546\u54C1" })] }), _jsxs("div", { className: "inventory-kpi", children: [_jsx("span", { children: "\u5206\u985E\u6578\u91CF" }), _jsx("strong", { children: productCategoryCount }), _jsx("small", { children: "\u76EE\u524D\u5EFA\u7ACB\u7684\u5546\u54C1\u5206\u985E" })] }), _jsx("div", { className: "inventory-cta", children: _jsx("button", { type: "button", className: "primary-button", onClick: () => setSettings({ ...settings, ticket: { ...settings.ticket, products: [...settings.ticket.products, newProduct()] } }), children: "\u65B0\u589E\u5546\u54C1" }) })] }), _jsx("div", { className: "row-card inventory-toolbar", children: _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u641C\u5C0B\u5546\u54C1" }), _jsx("input", { value: productSearch, onChange: (e) => setProductSearch(e.target.value), placeholder: "\u641C\u5C0B\u5546\u54C1\u540D\u7A31\u3001\u5206\u985E\u3001\u50F9\u683C\u6216\u63CF\u8FF0" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5546\u54C1\u7BE9\u9078" }), _jsxs("select", { value: productStatusFilter, onChange: (e) => setProductStatusFilter(e.target.value), children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u5546\u54C1" }), _jsx("option", { value: "enabled", children: "\u53EA\u770B\u4E0A\u67B6\u4E2D" }), _jsx("option", { value: "featured", children: "\u53EA\u770B\u7CBE\u9078\u5546\u54C1" })] })] })] }) }), _jsxs("div", { className: "row-card inventory-table-card", children: [_jsxs("div", { className: "inventory-table-head", children: [_jsx("strong", { children: "\u5546\u54C1\u5EAB\u7E3D\u8868" }), _jsxs("small", { children: ["\u76EE\u524D\u986F\u793A ", filteredProducts.length, " / ", settings.ticket.products.length, " \u9805\u5546\u54C1"] })] }), _jsxs("div", { className: "inventory-table", children: [_jsxs("div", { className: "inventory-table-row inventory-table-header", children: [_jsx("span", { children: "\u5546\u54C1" }), _jsx("span", { children: "\u5206\u985E" }), _jsx("span", { children: "\u50F9\u683C" }), _jsx("span", { children: "\u72C0\u614B" }), _jsx("span", { children: "\u5EAB\u5B58" }), _jsx("span", { children: "\u7CBE\u9078" })] }), filteredProducts.map((product) => (_jsxs("div", { className: "inventory-table-row", children: [_jsx("span", { children: product.name || "未命名商品" }), _jsx("span", { children: product.category || "未分類" }), _jsx("span", { children: product.priceLabel || "未設定" }), _jsx("span", { children: product.enabled ? "上架中" : "未上架" }), _jsx("span", { children: productStockLabel(product.stockStatus) }), _jsx("span", { children: product.featured ? "精選" : "一般" })] }, `summary-${product.id}`)))] })] }), _jsxs("div", { className: "stack", children: [filteredProducts.map((product) => {
                                                const index = settings.ticket.products.findIndex((item) => item.id === product.id);
                                                return (_jsxs("div", { className: "row-card product-admin-card", children: [_jsxs("div", { className: "product-admin-visual", children: [splitImageGallery(product.imageUrl).length ? (_jsxs("div", { className: "product-gallery-strip", children: [_jsx("img", { src: splitImageGallery(product.imageUrl)[0], alt: product.name || "商品圖片" }), splitImageGallery(product.imageUrl).slice(1, 4).map((image, imageIndex) => (_jsx("img", { src: image, alt: `${product.name || "商品圖片"}-${imageIndex + 2}` }, `${product.id}-${imageIndex}`)))] })) : _jsx("div", { className: "product-admin-fallback", children: (product.name || "P").slice(0, 1).toUpperCase() }), _jsxs("div", { className: "product-admin-summary", children: [_jsx("strong", { children: product.name || "未命名商品" }), _jsxs("small", { children: [product.category || "未分類", " \uFF5C ", product.priceLabel || "未設定價格", " \uFF5C ", productStockLabel(product.stockStatus)] }), _jsx("span", { className: `pill ${productStockTone(product.stockStatus)}`, children: productStockLabel(product.stockStatus) }), product.stockNote?.trim() ? _jsx("p", { className: "product-admin-stock-note", children: product.stockNote }) : null] })] }), _jsxs("div", { className: "field-grid three", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5546\u54C1\u540D\u7A31" }), _jsx("input", { value: product.name, onChange: (e) => updateProduct(index, { ...product, name: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5206\u985E" }), _jsx("input", { value: product.category, onChange: (e) => updateProduct(index, { ...product, category: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u50F9\u683C\u6587\u5B57" }), _jsx("input", { value: product.priceLabel, onChange: (e) => updateProduct(index, { ...product, priceLabel: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5546\u54C1\u5716\u7247\u7DB2\u5740" }), _jsx("input", { value: product.imageUrl ?? "", onChange: (e) => updateProduct(index, { ...product, imageUrl: e.target.value }), placeholder: "\u53EF\u586B\u591A\u5F35\uFF0C\u7528\u9017\u865F\u6216\u63DB\u884C\u5206\u9694" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5EAB\u5B58\u72C0\u614B" }), _jsxs("select", { value: product.stockStatus, onChange: (e) => updateProduct(index, { ...product, stockStatus: e.target.value }), children: [_jsx("option", { value: "in_stock", children: "\u73FE\u8CA8\u4F9B\u61C9" }), _jsx("option", { value: "restocking", children: "\u88DC\u8CA8\u4E2D" }), _jsx("option", { value: "out_of_stock", children: "\u7F3A\u8CA8\u4E2D" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5EAB\u5B58\u8AAA\u660E" }), _jsx("input", { value: product.stockNote ?? "", onChange: (e) => updateProduct(index, { ...product, stockNote: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u5230\u8CA8\u6642\u9593\u3001\u88DC\u8CA8\u63D0\u9192\u3001\u66AB\u505C\u8CA9\u552E\u8AAA\u660E" })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u5546\u54C1\u63CF\u8FF0" }), _jsx("textarea", { value: product.description ?? "", onChange: (e) => updateProduct(index, { ...product, description: e.target.value }), placeholder: "\u9019\u500B\u5546\u54C1\u6703\u986F\u793A\u5728\u5546\u57CE HTML \u524D\u53F0\u4E0A\u3002" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: product.enabled, onChange: (e) => updateProduct(index, { ...product, enabled: e.target.checked }) }), _jsx("span", { children: "\u4E0A\u67B6\u4E2D" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: Boolean(product.featured), onChange: (e) => updateProduct(index, { ...product, featured: e.target.checked }) }), _jsx("span", { children: "\u7CBE\u9078\u5546\u54C1" })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, ticket: { ...settings.ticket, products: settings.ticket.products.filter((item) => item.id !== product.id) } }), children: "\u522A\u9664" })] })] }, product.id));
                                            }), filteredProducts.length === 0 ? _jsx("div", { className: "row-card", children: "\u76EE\u524D\u6C92\u6709\u7B26\u5408\u641C\u5C0B\u6216\u7BE9\u9078\u689D\u4EF6\u7684\u5546\u54C1\u3002" }) : null] })] }) : null, showSection(sectionIds.blacklist) ? _jsxs(Section, { id: sectionIds.blacklist, title: "\u9ED1\u540D\u55AE", subtitle: "\u963B\u64CB\u7279\u5B9A\u4F7F\u7528\u8005\u91CD\u8907\u4E82\u958B\u55AE", meta: `${settings.ticket.blacklist.length} 人`, children: [_jsx("div", { className: "stack", children: settings.ticket.blacklist.map((entry, index) => (_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u4F7F\u7528\u8005 ID" }), _jsx("input", { value: entry.userId, onChange: (e) => updateBlacklist(index, { ...entry, userId: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5099\u8A3B" }), _jsx("input", { value: entry.note, onChange: (e) => updateBlacklist(index, { ...entry, note: e.target.value }) })] })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, ticket: { ...settings.ticket, blacklist: settings.ticket.blacklist.filter((item) => item.id !== entry.id) } }), children: "\u522A\u9664" })] }, entry.id))) }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, ticket: { ...settings.ticket, blacklist: [...settings.ticket.blacklist, newBlacklist()] } }), children: "\u65B0\u589E\u9ED1\u540D\u55AE" })] }) : null, showSection(sectionIds.balance) ? _jsxs(Section, { id: sectionIds.balance, title: "\u9918\u984D\u7CFB\u7D71", subtitle: "\u7BA1\u7406\u6BCF\u4F4D\u4F7F\u7528\u8005\u53EF\u7528\u9918\u984D", meta: `${balances.length} 筆帳戶`, children: [_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u4F7F\u7528\u8005 ID" }), _jsx("input", { value: balanceDraft.userId, onChange: (e) => setBalanceDraft({ ...balanceDraft, userId: e.target.value }), placeholder: "Discord \u4F7F\u7528\u8005 ID" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4F7F\u7528\u8005\u540D\u7A31" }), _jsx("input", { value: balanceDraft.username, onChange: (e) => setBalanceDraft({ ...balanceDraft, username: e.target.value }), placeholder: "\u4F8B\u5982 user#1234" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u521D\u59CB\u9918\u984D" }), _jsx("input", { type: "number", min: 0, value: balanceDraft.amount, onChange: (e) => setBalanceDraft({ ...balanceDraft, amount: Number(e.target.value) || 0 }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5099\u8A3B" }), _jsx("input", { value: balanceDraft.note, onChange: (e) => setBalanceDraft({ ...balanceDraft, note: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u4EBA\u5DE5\u88DC\u6B3E" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { type: "button", className: "primary-button", onClick: submitBalanceDraft, disabled: balanceLoading, children: "\u5EFA\u7ACB\u6216\u8986\u84CB\u9918\u984D" }), _jsx("button", { type: "button", className: "ghost-button", onClick: reloadBalances, disabled: balanceLoading, children: "\u91CD\u65B0\u6574\u7406\u9918\u984D" })] })] }), _jsxs("div", { className: "stack", children: [balances.map((record) => (_jsx("div", { className: "row-card balance-card", children: _jsxs("div", { className: "ticket-row", children: [_jsxs("div", { children: [_jsx("strong", { children: record.username }), _jsxs("p", { children: ["ID\uFF1A", record.userId] }), _jsxs("small", { children: ["\u9918\u984D\uFF1A", record.balance, " ", record.note ? `｜備註：${record.note}` : ""] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => adjustBalance(record, 10), disabled: balanceLoading, children: "+10" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => adjustBalance(record, -10), disabled: balanceLoading, children: "-10" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => removeBalance(record.userId), disabled: balanceLoading, children: "\u522A\u9664" })] })] }) }, record.userId))), balances.length === 0 ? _jsx("div", { className: "row-card", children: "\u76EE\u524D\u9084\u6C92\u6709\u4EFB\u4F55\u9918\u984D\u5E33\u6236\u3002" }) : null] })] }) : null, showSection(sectionIds.partnerships) ? _jsxs(Section, { id: sectionIds.partnerships, title: "\u5408\u4F5C\u4F3A\u670D\u5668", subtitle: "\u7BA1\u7406\u5408\u4F5C\u540D\u55AE\u8207\u5C55\u793A\u8CC7\u6599", meta: `${partnerships.length} 個合作伺服器`, children: [_jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u4F3A\u670D\u5668\u540D\u7A31" }), _jsx("input", { value: partnershipDraft.serverName, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, serverName: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u9080\u8ACB\u9023\u7D50" }), _jsx("input", { value: partnershipDraft.inviteUrl, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, inviteUrl: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u806F\u7D61\u65B9\u5F0F" }), _jsx("input", { value: partnershipDraft.contact, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, contact: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "Banner \u5716\u7247" }), _jsx("input", { value: partnershipDraft.bannerUrl, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, bannerUrl: e.target.value }) })] }), _jsxs("label", { className: "span-two", children: [_jsx("span", { children: "\u7C21\u4ECB" }), _jsx("textarea", { value: partnershipDraft.description, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, description: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u6A19\u7C64" }), _jsx("input", { value: partnershipDraft.tags.join(", "), onChange: (e) => setPartnershipDraft({ ...partnershipDraft, tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) }), placeholder: "\u904A\u6232, \u5546\u57CE, \u4E92\u63A8" })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: partnershipDraft.mutualPromotion, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, mutualPromotion: e.target.checked }) }), _jsx("span", { children: "\u4E92\u63A8\u5408\u4F5C" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: partnershipDraft.featured, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, featured: e.target.checked }) }), _jsx("span", { children: "\u7CBE\u9078" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: partnershipDraft.enabled, onChange: (e) => setPartnershipDraft({ ...partnershipDraft, enabled: e.target.checked }) }), _jsx("span", { children: "\u4E0A\u67B6\u4E2D" })] }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: reloadPartnerships, disabled: partnershipLoading, children: "\u91CD\u65B0\u6574\u7406" }), _jsx("button", { type: "button", className: "primary-button", onClick: savePartnershipDraft, disabled: partnershipLoading, children: "\u5132\u5B58\u5408\u4F5C\u4F3A\u670D\u5668" })] })] })] }), _jsx("div", { className: "stack", children: partnerships.map((item) => (_jsx("div", { className: "row-card", children: _jsxs("div", { className: "ticket-row", children: [_jsxs("div", { children: [_jsx("strong", { children: item.serverName }), _jsx("p", { children: item.contact || "未填聯絡方式" }), _jsxs("small", { children: [item.enabled ? "上架中" : "未上架", " \uFF5C ", item.tags.join(" / ") || "無標籤"] })] }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => setPartnershipDraft(item), children: "\u7DE8\u8F2F" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => removePartnership(item.id), disabled: partnershipLoading, children: "\u522A\u9664" })] })] }) }, item.id))) })] }) : null, showSection(sectionIds.applications) ? _jsx(Section, { id: sectionIds.applications, title: "\u5408\u4F5C\u7533\u8ACB", subtitle: "\u5BE9\u6838\u5916\u90E8\u4F3A\u670D\u5668\u9001\u4F86\u7684\u5408\u4F5C\u7533\u8ACB", meta: `${pendingApplications.length} 筆待審核`, children: _jsxs("div", { className: "stack", children: [applications.map((application) => (_jsxs("div", { className: "row-card application-card", children: [_jsxs("div", { className: "application-cover-card", children: [_jsxs("div", { className: "application-cover-hero", children: [_jsx("span", { className: `application-status-pill is-${application.status}`, children: application.status }), _jsx("strong", { children: application.serverName }), _jsxs("p", { children: [application.ownerName, " \uFF5C ", application.contact] }), _jsx("small", { children: application.inviteUrl })] }), _jsx("div", { className: "button-row", children: application.status === "pending" ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "primary-button", onClick: () => approveApplication(application), disabled: partnershipLoading, children: "\u6838\u51C6\u4E26\u5EFA\u7ACB" }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => rejectApplication(application), disabled: partnershipLoading, children: "\u62D2\u7D55" })] })) : null })] }), _jsxs("div", { className: "application-body", children: [_jsx("div", { className: "application-banner application-banner-fallback", children: application.serverName }), _jsx("p", { children: application.description }), application.benefits ? _jsxs("small", { children: ["\u5408\u4F5C\u5167\u5BB9\uFF1A", application.benefits] }) : null, application.reviewNote ? _jsxs("small", { children: ["\u5BE9\u6838\u5099\u8A3B\uFF1A", application.reviewNote] }) : null] })] }, application.id))), applications.length === 0 ? _jsx("div", { className: "row-card", children: "\u76EE\u524D\u9084\u6C92\u6709\u5408\u4F5C\u7533\u8ACB\u3002" }) : null] }) }) : null, showSection(sectionIds.reply) ? _jsxs(Section, { id: sectionIds.reply, title: "\u81EA\u52D5\u56DE\u8986", subtitle: "\u628A\u5E38\u898B\u554F\u984C\u8207\u50F9\u683C\u8A62\u554F\u5148\u64CB\u5728\u524D\u9762", meta: `${enabledReplies} 條啟用中`, children: [_jsx("div", { className: "stack", children: settings.autoReplies.map((rule, index) => (_jsxs("div", { className: "row-card auto-reply-card", children: [_jsxs("div", { className: "auto-reply-head", children: [_jsxs("div", { children: [_jsxs("strong", { children: ["\u898F\u5247 ", index + 1] }), _jsx("p", { children: rule.enabled ? "目前啟用中" : "目前停用中" })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, autoReplies: settings.autoReplies.filter((item) => item.id !== rule.id) }), children: "\u522A\u9664" })] }), _jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u95DC\u9375\u5B57" }), _jsx("textarea", { className: "reply-trigger", value: rule.trigger, onChange: (e) => updateReply(index, { ...rule, trigger: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u50F9\u683C\u8868" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u56DE\u8986\u5167\u5BB9" }), _jsx("textarea", { className: "reply-response", value: rule.response, onChange: (e) => updateReply(index, { ...rule, response: e.target.value }), placeholder: "支援換行。\n例如：第一行說明\n第二行補充資訊" })] })] }), _jsxs("div", { className: "field-grid rule-meta-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5339\u914D\u6A21\u5F0F" }), _jsxs("select", { value: rule.matchMode, onChange: (e) => updateReply(index, { ...rule, matchMode: e.target.value }), children: [_jsx("option", { value: "includes", children: "\u5305\u542B" }), _jsx("option", { value: "startsWith", children: "\u958B\u982D" }), _jsx("option", { value: "exact", children: "\u5B8C\u5168\u7B26\u5408" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "\u51B7\u537B\u79D2\u6578" }), _jsx("input", { type: "number", min: 0, value: rule.cooldownSeconds, onChange: (e) => updateReply(index, { ...rule, cooldownSeconds: Number(e.target.value) }) })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: rule.enabled, onChange: (e) => updateReply(index, { ...rule, enabled: e.target.checked }) }), _jsx("span", { children: "\u555F\u7528" })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: rule.ignoreCase, onChange: (e) => updateReply(index, { ...rule, ignoreCase: e.target.checked }) }), _jsx("span", { children: "\u5FFD\u7565\u5927\u5C0F\u5BEB" })] }), _jsx("small", { className: "reply-hint", children: "\u63D0\u793A\uFF1A\u56DE\u8986\u5167\u5BB9\u53EF\u4EE5\u76F4\u63A5\u63DB\u884C\uFF0CDiscord \u6703\u7167\u539F\u6A23\u9001\u51FA\u3002" })] })] }, rule.id))) }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, autoReplies: [...settings.autoReplies, newReply()] }), children: "\u65B0\u589E\u898F\u5247" })] }) : null, showSection(sectionIds.payment) ? _jsx(Section, { id: sectionIds.payment, title: "\u4ED8\u6B3E\u5DE5\u5177", subtitle: "\u5728\u4E3B\u5DE5\u4F5C\u5340\u76F4\u63A5\u5EFA\u7ACB\u6536\u6B3E\u6D41\u7A0B\uFF0C\u73FE\u5728\u540C\u6642\u6E96\u5099\u6B50\u4ED8\u5BF6\u8207 PAYUNi \u5165\u53E3", meta: opayReady || payuniReady ? "已準備金流入口" : "尚未設定金流", children: _jsxs("div", { className: "row-card", children: [_jsxs("div", { className: "field-grid two", children: [_jsxs("label", { children: [_jsx("span", { children: "\u5546\u54C1\u540D\u7A31" }), _jsx("input", { value: paymentForm.itemName, onChange: (e) => setPaymentForm({ ...paymentForm, itemName: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A80 Robux" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u91D1\u984D" }), _jsx("input", { type: "number", min: 1, value: paymentForm.amount, onChange: (e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 1 }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u8A02\u55AE\u63CF\u8FF0" }), _jsx("input", { value: paymentForm.tradeDesc, onChange: (e) => setPaymentForm({ ...paymentForm, tradeDesc: e.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u8D85\u5546\u985E\u578B" }), _jsxs("select", { value: paymentForm.subPayment, onChange: (e) => setPaymentForm({ ...paymentForm, subPayment: e.target.value }), children: [_jsx("option", { value: "CVS", children: "\u7CFB\u7D71\u9078\u64C7" }), _jsx("option", { value: "FAMILY", children: "\u5168\u5BB6" }), _jsx("option", { value: "IBON", children: "7-ELEVEN" }), _jsx("option", { value: "OKMART", children: "OK" }), _jsx("option", { value: "HILIFE", children: "\u840A\u723E\u5BCC" })] })] })] }), _jsxs("div", { className: "stack", children: [_jsxs("div", { className: "callout-card", children: [_jsx("strong", { children: "\u6B50\u4ED8\u5BF6\u8D85\u5546\u4EE3\u78BC" }), _jsx("p", { children: "\u9019\u689D\u6703\u4FDD\u7559\u539F\u672C\u6B50\u4ED8\u5BF6\u6D41\u7A0B\uFF0C\u5EFA\u7ACB\u5F8C\u76F4\u63A5\u958B\u555F\u5B98\u65B9\u4ED8\u6B3E\u9801\u3002" }), _jsxs("div", { className: "inline-actions", children: [_jsxs("div", { className: "chip-list", children: [_jsx("span", { className: "chip", children: opayReady ? "歐付寶已設定" : "尚未設定歐付寶金鑰" }), _jsx("span", { className: "chip", children: "\u5EFA\u7ACB\u5F8C\u6703\u76F4\u63A5\u958B\u4ED8\u6B3E\u9801" })] }), _jsx("button", { type: "button", className: "primary-button", onClick: openOpayCheckout, disabled: !opayReady, children: opayReady ? "開啟歐付寶付款頁" : "尚未設定歐付寶金鑰" })] })] }), _jsxs("div", { className: "callout-card", children: [_jsx("strong", { children: "PAYUNi \u76F4\u51FA\u4EE3\u78BC" }), _jsx("p", { children: "\u9019\u584A\u662F\u5F8C\u53F0 PAYUNi \u5C08\u5C6C\u5165\u53E3\u3002\u53C3\u6578\u88DC\u9F4A\u5F8C\uFF0C\u9019\u88E1\u5C31\u662F\u4E4B\u5F8C\u76F4\u63A5\u751F\u6210\u8D85\u5546\u4EE3\u78BC\u7684\u4F4D\u7F6E\u3002" }), _jsxs("div", { className: "inline-actions", children: [_jsxs("div", { className: "chip-list", children: [_jsx("span", { className: "chip", children: payuniReady ? "PAYUNi 已補齊基本參數" : "尚未設定 PAYUNi 金鑰" }), _jsx("span", { className: "chip", children: "Notify / Return \u5DF2\u7368\u7ACB\u4FDD\u7559" })] }), _jsx("button", { type: "button", className: "primary-button", onClick: openPayuniDirectCode, children: payuniReady ? "PAYUNi 入口已準備" : "先補 PAYUNi 參數" })] })] }), paymentToolStatus ? (_jsxs("div", { className: "callout-card", style: {
                                                        border: paymentToolStatus.tone === "error"
                                                            ? "1px solid rgba(220, 38, 38, 0.2)"
                                                            : paymentToolStatus.tone === "success"
                                                                ? "1px solid rgba(22, 163, 74, 0.18)"
                                                                : "1px solid rgba(59, 130, 246, 0.18)",
                                                        background: paymentToolStatus.tone === "error"
                                                            ? "rgba(254, 242, 242, 0.9)"
                                                            : paymentToolStatus.tone === "success"
                                                                ? "rgba(240, 253, 244, 0.92)"
                                                                : "rgba(239, 246, 255, 0.92)"
                                                    }, children: [_jsx("strong", { children: paymentToolStatus.tone === "error" ? "金流提醒" : paymentToolStatus.tone === "success" ? "建立結果" : "處理狀態" }), _jsx("p", { children: paymentToolStatus.message })] })) : null] })] }) }) : null, showSection(sectionIds.faq) ? _jsx(Section, { id: sectionIds.faq, title: "FAQ \u7BA1\u7406", subtitle: "\u628A\u5E38\u898B\u554F\u984C\u653E\u56DE\u4E3B\u8981\u5167\u5BB9\u5340\uFF0C\u907F\u514D\u5207\u5230\u9019\u9801\u6642\u4E3B\u5DE5\u4F5C\u5340\u7559\u767D", meta: `${settings.faq.length} 筆`, children: _jsxs("div", { className: "stack", children: [settings.faq.map((item, index) => (_jsx("div", { className: "row-card", children: _jsxs("div", { className: "faq-item", children: [_jsx("input", { value: item.question, onChange: (e) => {
                                                            const faq = [...settings.faq];
                                                            faq[index] = { ...faq[index], question: e.target.value };
                                                            setSettings({ ...settings, faq });
                                                        }, placeholder: "\u554F\u984C\u6A19\u984C" }), _jsx("textarea", { value: item.answer, onChange: (e) => {
                                                            const faq = [...settings.faq];
                                                            faq[index] = { ...faq[index], answer: e.target.value };
                                                            setSettings({ ...settings, faq });
                                                        }, placeholder: "\u554F\u984C\u56DE\u7B54" })] }) }, item.id))), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setSettings({ ...settings, faq: [...settings.faq, { id: createId("faq"), question: "", answer: "" }] }), children: "\u65B0\u589E FAQ" })] }) }) : null, showSection(sectionIds.tickets) ? _jsx(Section, { id: sectionIds.tickets, title: "\u5F8C\u53F0\u95DC\u55AE", subtitle: "\u76F4\u63A5\u5728\u7DB2\u7AD9\u67E5\u770B\u5DE5\u55AE\u4E26\u624B\u52D5\u95DC\u9589", meta: `${activeTickets.length} 張進行中`, children: _jsx("div", { className: "stack", children: tickets.slice(0, 12).map((ticket) => (_jsx("div", { className: `row-card ticket-card tone-${ticketTone(ticket.status)}`, children: _jsxs("div", { className: "ticket-row", children: [_jsxs("div", { children: [_jsx("strong", { children: ticket.categoryLabel }), _jsx("p", { children: ticket.username }), _jsxs("small", { children: [ticket.status, " \uFF5C \u5EFA\u7ACB\u65BC ", prettyDate(ticket.createdAt)] })] }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => closeTicket(ticket.id), disabled: !settings.ticket.allowDashboardClose || ticket.status === "closed", children: "\u95DC\u55AE" })] }) }, ticket.id))) }) }) : null] }), _jsxs("aside", { className: "sidebar-column", children: [_jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "Workspace Snapshot" }), _jsxs("div", { className: "snapshot-list", children: [_jsxs("div", { children: [_jsx("span", { children: "\u76EE\u524D\u5206\u985E" }), _jsx("strong", { children: activeCategoryConfig.label })] }), _jsxs("div", { children: [_jsx("span", { children: "\u76EE\u524D\u9801\u9762" }), _jsx("strong", { children: currentSection?.label ?? "未選擇" })] }), _jsxs("div", { children: [_jsx("span", { children: "\u7BA1\u7406\u5546\u57CE" }), _jsx("strong", { children: currentGuildLabel })] }), _jsxs("div", { children: [_jsx("span", { children: "\u5132\u5B58\u72C0\u614B" }), _jsx("strong", { children: hasUnsavedChanges ? "尚未儲存" : "已同步" })] })] })] }), _jsxs("section", { className: "card preview-panel brand-preview-panel", children: [_jsx("p", { className: "eyebrow", children: "Brand Preview" }), _jsxs("div", { className: "brand-preview", children: [_jsx("div", { className: "brand-preview-badge", children: "LIVE" }), _jsx("strong", { children: settings.brand.serverName }), _jsx("p", { children: settings.brand.tagline }), _jsxs("div", { className: "brand-swatches", children: [_jsx("span", { style: { background: settings.brand.primaryColor } }), _jsx("span", { style: { background: settings.brand.secondaryColor } })] })] })] }), showSection(sectionIds.serverControl) && selectedGuildMeta ? _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u76EE\u524D\u4F3A\u670D\u5668" }), _jsxs("div", { className: "image-spotlight-card", children: [selectedGuildMeta.iconUrl ? (_jsx("img", { className: "image-spotlight-avatar", src: selectedGuildMeta.iconUrl, alt: selectedGuildMeta.name })) : (_jsx("div", { className: "image-spotlight-fallback", children: guildInitials(selectedGuildMeta.name) })), _jsxs("div", { className: "image-spotlight-copy", children: [_jsx("strong", { children: selectedGuildMeta.name }), _jsx("small", { children: selectedGuildMeta.isPrimary ? "主群組" : selectedGuildMeta.approved ? "已批准" : "待批准" }), _jsx("p", { children: "\u9EDE\u4E0A\u65B9\u4F3A\u670D\u5668\u5716\u7247\u5361\u5C31\u80FD\u76F4\u63A5\u5207\u63DB\u5230\u9019\u500B\u7FA4\u7D44\u7684\u8A2D\u5B9A\u3002" })] })] })] }) : null, showSection(sectionIds.products) && featuredProductImages.length ? _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u5546\u54C1\u5716\u7247\u7246" }), _jsx("div", { className: "visual-grid", children: featuredProductImages.map((item) => (_jsxs("div", { className: "visual-tile", children: [_jsx("img", { src: item.imageUrl, alt: item.name }), _jsx("span", { children: item.name })] }, item.id))) })] }) : null, showSection(sectionIds.payment) ? _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u91D1\u6D41\u5165\u53E3\u9810\u89BD" }), _jsxs("div", { className: "mini-list", children: [_jsxs("div", { className: "mini-item", children: [_jsx("strong", { children: paymentForm.itemName || "未填商品名稱" }), _jsxs("span", { children: [paymentForm.amount, " \uFF5C ", paymentForm.subPayment] })] }), _jsxs("div", { className: "mini-item", children: [_jsx("strong", { children: opayReady ? "歐付寶可用" : "歐付寶待設定" }), _jsx("span", { children: opayReady ? "主工作區可直接開付款頁" : "請先補齊歐付寶金鑰" })] }), _jsxs("div", { className: "mini-item", children: [_jsx("strong", { children: payuniReady ? "PAYUNi 已準備" : "PAYUNi 待設定" }), _jsx("span", { children: payuniReady ? "後台 PAYUNi 入口已保留" : "請先補齊 PAYUNi Merchant / Key / IV" })] })] })] }) : null, (showSection(sectionIds.partnerships) || showSection(sectionIds.applications)) && visualPartners.length ? _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u5408\u4F5C\u6A6B\u5E45" }), _jsx("div", { className: "partner-banner-stack", children: visualPartners.map((item) => (_jsxs("div", { className: "partner-banner-card", children: [_jsx("img", { src: item.bannerUrl, alt: item.serverName }), _jsxs("div", { className: "partner-banner-overlay", children: [_jsx("strong", { children: item.serverName }), _jsx("small", { children: item.contact || "合作展示中" })] })] }, item.id))) })] }) : null, (showSection(sectionIds.reply) || showSection(sectionIds.balance) || showSection(sectionIds.overview)) && recentReviews.length ? _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u6700\u65B0\u8A55\u50F9" }), _jsx("div", { className: "review-wall-grid", children: recentReviews.map((item) => (_jsxs("div", { className: "review-preview-card", children: [item.avatarUrl ? _jsx("img", { className: "review-preview-avatar", src: item.avatarUrl, alt: item.username }) : _jsx("div", { className: "review-preview-fallback", children: item.username.slice(0, 1).toUpperCase() }), _jsxs("div", { className: "review-preview-copy", children: [_jsx("strong", { children: item.username }), _jsxs("small", { children: [item.stars, " / 5 \uFF5C ", prettyDate(item.createdAt)] }), _jsx("p", { children: item.content })] })] }, item.id))) })] }) : null, _jsxs("section", { className: "card preview-panel", children: [_jsx("p", { className: "eyebrow", children: "\u5FEB\u901F\u5099\u5FD8" }), _jsx("div", { className: "faq-stack", children: settings.faq.slice(0, 3).map((item) => (_jsxs("div", { className: "faq-item", children: [_jsx("strong", { children: item.question }), _jsx("small", { children: item.answer })] }, item.id))) })] })] })] })] }));
}
export default function App() {
    return (_jsx(DashboardErrorBoundary, { children: _jsx(DashboardApp, {}) }));
}
//# sourceMappingURL=App.js.map