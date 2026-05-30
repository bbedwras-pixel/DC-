import React, { Component, useEffect, useState } from "react";
import { AutoReplyRule, BalanceRecord, BlacklistEntry, DashboardAccount, DashboardStats, GiveawayRecord, GuildSettings, LinkedGuildConfig, PartnershipApplication, PartnershipServer, ProductItem, ReviewRecord, StoreOrderRecord, TicketRecord } from "@dc/shared";
import {
  adjustBalanceFromDashboard,
  approvePartnershipAndCreateFromDashboard,
  closeGiveawayFromDashboard,
  closeTicketFromDashboard,
  createGiveawayFromDashboard,
  createOpayCheckout,
  createPayuniDirectCodeFromDashboard,
  deleteBalanceFromDashboard,
  deletePartnershipFromDashboard,
  fetchBalances,
  fetchBotGuildChannels,
  fetchBotGuilds,
  fetchDashboardSession,
  fetchDiscordDashboardLogin,
  fetchGiveaways,
  fetchOpayStatus,
  fetchPayuniStatus,
  fetchPartnershipApplications,
  fetchPartnerships,
  fetchReviews,
  fetchSettings,
  fetchStoreOrdersForDashboard,
  fetchStats,
  fetchTickets,
  drawGiveawayFromDashboard,
  loginDashboard,
  logoutDashboard,
  reviewPartnershipApplicationFromDashboard,
  saveBalance,
  DashboardSessionAccount,
  savePartnershipFromDashboard,
  saveSettings,
  sendStoreOrderMessageFromDashboard,
  sendBotMessageFromDashboard,
  setBotGuildApproval,
  updateStoreOrderStatusFromDashboard
} from "./api";

const readStoredSelectedGuild = () => (window.localStorage.getItem("dc_dashboard_selected_guild") ?? "").trim();

const emptyStats: DashboardStats = {
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
} as const;

const readStoredSectionView = () => {
  const hash = window.location.hash.replace(/^#/, "").trim();
  return Object.values(sectionIds).includes(hash as (typeof sectionIds)[keyof typeof sectionIds]) ? hash : sectionIds.brand;
};

const categoryViews = [
  { id: "store", label: "商城設定", icon: "🛍️", description: "品牌、商品、FAQ、付款與前台", target: sectionIds.brand, sections: [sectionIds.brand, sectionIds.storefront, sectionIds.products, sectionIds.faq, sectionIds.payment] },
  { id: "server", label: "伺服器設定", icon: "🛰️", description: "群組、工單、抽獎、防刷頻與多群組", target: sectionIds.serverControl, sections: [sectionIds.serverControl, sectionIds.multiGuild, sectionIds.ticket, sectionIds.giveaways, sectionIds.moderation, sectionIds.reply] },
  { id: "orders", label: "訂單與客服", icon: "💬", description: "商城訂單、餘額、黑名單與工單操作", target: sectionIds.storefront, sections: [sectionIds.storefront, sectionIds.balance, sectionIds.blacklist, sectionIds.tickets] },
  { id: "business", label: "營運管理", icon: "📈", description: "合作名單、合作申請與帳號權限", target: sectionIds.partnerships, sections: [sectionIds.partnerships, sectionIds.applications, sectionIds.accounts] }
] as const;

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const newReply = (): AutoReplyRule => ({
  id: createId("reply"),
  enabled: true,
  trigger: "",
  response: "",
  matchMode: "includes",
  ignoreCase: true,
  cooldownSeconds: 10
});

const newProduct = (): ProductItem => ({
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

const newBlacklist = (): BlacklistEntry => ({
  id: createId("blacklist"),
  userId: "",
  note: ""
});

const newLinkedGuild = (): LinkedGuildConfig => ({
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

const newDashboardAccount = (role: DashboardAccount["role"] = "admin"): DashboardAccount => ({
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

const newPartnershipDraft = (): PartnershipServer => ({
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

const prettyDate = (value?: string) => {
  if (!value) return "尚未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW");
};

const guildInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DC";

const splitImageGallery = (value?: string) =>
  (value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const productStockLabel = (value?: string) => {
  if (value === "out_of_stock") return "缺貨中";
  if (value === "restocking") return "補貨中";
  return "現貨供應";
};

const productStockTone = (value?: string) => {
  if (value === "out_of_stock") return "tone-warn";
  if (value === "restocking") return "tone-info";
  return "tone-ok";
};

const ticketTone = (status: TicketRecord["status"]) => {
  if (status === "completed") return "ok";
  if (status === "processing") return "info";
  if (status === "paid") return "brand";
  if (status === "cancelled" || status === "closed") return "muted";
  return "warn";
};

const accountRoleLabel = (role: DashboardAccount["role"]) => {
  if (role === "developer") return "開發者";
  if (role === "owner") return "老闆";
  return "管理員";
};

const storeOrderStatusLabel = (status: StoreOrderRecord["status"]) => {
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

const Section = ({
  id,
  title,
  subtitle,
  meta,
  children
}: {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  children: React.ReactNode;
}) => (
  <section className="card section-card" id={id}>
    <div className="section-head">
      <div>
        <p className="eyebrow section-kicker">Workspace Page</p>
        <h2>{title}</h2>
        <p className="section-summary">{subtitle}</p>
      </div>
      {meta ? <span className="section-meta">{meta}</span> : null}
    </div>
    <div className="section-body">{children}</div>
  </section>
);

const Stat = ({
  label,
  value,
  tone,
  hint
}: {
  label: string;
  value: string;
  tone: string;
  hint: string;
}) => (
  <article className={`stat-tile tone-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{hint}</small>
  </article>
);

const MetricBar = ({
  label,
  value,
  percent,
  tone
}: {
  label: string;
  value: string;
  percent: number;
  tone: string;
}) => (
  <div className={`metric-bar-card tone-${tone}`}>
    <div className="metric-bar-head">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <div className="metric-bar-track">
      <div className={`metric-bar-fill tone-${tone}`} style={{ width: `${Math.max(8, Math.min(100, percent))}%` }} />
    </div>
  </div>
);

type DashboardErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class DashboardErrorBoundary extends Component<{ children: React.ReactNode }, DashboardErrorBoundaryState> {
  state: DashboardErrorBoundaryState = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Dashboard crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          className="dashboard login-dashboard"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
            color: "#0f172a"
          }}
        >
          <section className="login-shell" style={{ width: "100%", maxWidth: "980px", position: "relative", zIndex: 2, display: "grid", placeItems: "center" }}>
            <div
              className="card login-card"
              style={{
                width: "min(100%, 760px)",
                display: "grid",
                gap: "18px",
                padding: "32px",
                borderRadius: "28px",
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)"
              }}
            >
              <p className="eyebrow">Dashboard Error</p>
              <h1>後台讀取失敗</h1>
              <p>前端在載入控制台時遇到例外，已先切到這個保底頁面，避免整頁白畫面。</p>
              <div className="login-note compact-note">
                <strong>錯誤訊息：</strong>
                <span>{this.state.message || "未知錯誤"}</span>
              </div>
              <div className="login-note">
                <strong>下一步：</strong>
                <span>我們先把這個錯誤邊界留著，接著我會幫你把商品與登入畫面整理成可正常顯示的版本。</span>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function DashboardApp() {
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("讀取中...");
  const [authLoading, setAuthLoading] = useState(true);
  const [authAccount, setAuthAccount] = useState<DashboardSessionAccount | null>(() => {
    const raw = window.localStorage.getItem("dc_dashboard_account");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DashboardSessionAccount;
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
  const [opayReady, setOpayReady] = useState(false);
  const [payuniReady, setPayuniReady] = useState(false);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrderRecord[]>([]);
  const [giveaways, setGiveaways] = useState<GiveawayRecord[]>([]);
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [partnerships, setPartnerships] = useState<PartnershipServer[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [applications, setApplications] = useState<PartnershipApplication[]>([]);
  const [partnershipDraft, setPartnershipDraft] = useState<PartnershipServer>(newPartnershipDraft());
  const [balanceDraft, setBalanceDraft] = useState(newBalanceDraft());
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [partnershipLoading, setPartnershipLoading] = useState(false);
  const [storefrontLoading, setStorefrontLoading] = useState(false);
  const [botGuilds, setBotGuilds] = useState<Array<{ id: string; name: string; iconUrl?: string | null; memberCount?: number; approved: boolean; isPrimary: boolean; label: string }>>([]);
  const [selectedGuildId, setSelectedGuildId] = useState(() => readStoredSelectedGuild());
  const [guildResources, setGuildResources] = useState<{ channels: Array<{ id: string; name: string; type: number }>; roles: Array<{ id: string; name: string }> }>({ channels: [], roles: [] });
  const [guildLoading, setGuildLoading] = useState(false);
  const [giveawayLoading, setGiveawayLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState({ channelId: "", content: "" });
  const [giveawayDraft, setGiveawayDraft] = useState({ channelId: "", prize: "", minutes: 30, winnersCount: 1 });
  const [orderReplyDrafts, setOrderReplyDrafts] = useState<Record<string, string>>({});
  const [activeCategoryView, setActiveCategoryView] = useState<(typeof categoryViews)[number]["id"]>("store");
  const [activeSectionView, setActiveSectionView] = useState<string>(() => readStoredSectionView());
  const [insightRange, setInsightRange] = useState<"day" | "week" | "month">("day");
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState<"all" | "enabled" | "featured">("all");
  const [baseline, setBaseline] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 100,
    itemName: "",
    tradeDesc: "商城快速收款",
    subPayment: "CVS" as "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE"
  });
  const [paymentToolStatus, setPaymentToolStatus] = useState<{ tone: "info" | "success" | "error"; message: string } | null>(null);

  const makeBaseline = (nextSettings: GuildSettings) => JSON.stringify({ settings: nextSettings });

  const storeSession = (token: string, account: DashboardSessionAccount) => {
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

  const reloadDashboard = async (message = "資料同步完成", scopedAccount?: DashboardSessionAccount | null) => {
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
      } catch (error) {
        clearSession();
        setStatus(`請先登入後台：${error instanceof Error ? error.message : "未知錯誤"}`);
      } finally {
        setAuthLoading(false);
      }
    };
    void load();
  }, []);

  const settingsReady = settings !== null;

  const updateBlacklist = (index: number, next: BlacklistEntry) => {
    if (!settings) return;
    const blacklist = [...settings.ticket.blacklist];
    blacklist[index] = next;
    setSettings({ ...settings, ticket: { ...settings.ticket, blacklist } });
  };

  const persist = async () => {
    setSaving(true);
    try {
      if (!settings) return;
      const next = await saveSettings(settings);
      setSettings(next);
      await reloadDashboard("儲存成功");
    } catch (error) {
      setStatus(`儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  const login = async () => {
    setAuthLoading(true);
    try {
      const session = await loginDashboard(loginForm);
      storeSession(session.token, session.account);
      await reloadDashboard(`已登入為${accountRoleLabel(session.account.role)}`, session.account);
    } catch (error) {
      setStatus(`登入失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithDiscord = async () => {
    setAuthLoading(true);
    try {
      const result = await fetchDiscordDashboardLogin();
      window.location.href = result.url;
    } catch (error) {
      setStatus(`Discord 登入啟動失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await logoutDashboard();
    } catch {
      // Ignore logout failures and clear local state anyway.
    } finally {
      clearSession();
      setSettings(null);
      setStatus("已登出後台");
    }
  };

  const refreshAll = async () => {
    try {
      await reloadDashboard("已重新整理全部資料");
    } catch (error) {
      setStatus(`重新整理失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    }
  };

  useEffect(() => {
    const loadGuildResources = async () => {
      if (!selectedGuildId) return;
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
      } catch {
        setGuildResources({ channels: [], roles: [] });
      } finally {
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
    return (
      <main
        className="dashboard login-dashboard"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
          color: "#0f172a"
        }}
      >
        <div className="mesh mesh-a" />
        <div className="mesh mesh-b" />
        <section
          className="login-shell"
          style={{
            width: "100%",
            maxWidth: "980px",
            position: "relative",
            zIndex: 2,
            display: "grid",
            placeItems: "center"
          }}
        >
          <div
            className="card login-card"
            style={{
              width: "min(100%, 760px)",
              display: "grid",
              gap: "18px",
              padding: "32px",
              borderRadius: "28px",
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)"
            }}
          >
            <p className="eyebrow">Dashboard Access</p>
            <h1>登入商城控制台</h1>
            <p>你可以用商城專屬帳號登入，也可以用 Discord 登入後只看到你有管理權限的商城伺服器。</p>
            <div className="field-grid two" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span>帳號</span>
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                  placeholder="admin"
                  style={{
                    minHeight: "50px",
                    borderRadius: "16px",
                    border: "1px solid #cbd5e1",
                    padding: "0 14px",
                    background: "#fff"
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "8px" }}>
                <span>密碼</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  placeholder="輸入後台密碼"
                  style={{
                    minHeight: "50px",
                    borderRadius: "16px",
                    border: "1px solid #cbd5e1",
                    padding: "0 14px",
                    background: "#fff"
                  }}
                />
              </label>
            </div>
            <div className="status-line">
              <small>{status}</small>
              <div className="button-row" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={login}
                  disabled={authLoading}
                  style={{ minHeight: "50px", padding: "0 22px", borderRadius: "16px" }}
                >
                  {authLoading ? "驗證中..." : "登入後台"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={loginWithDiscord}
                  disabled={authLoading}
                  style={{ minHeight: "50px", padding: "0 22px", borderRadius: "16px" }}
                >
                  用 Discord 登入
                </button>
              </div>
            </div>
            <div className="login-note">商城專屬帳號之後會綁可管理的商城範圍；Discord 登入則會自動依照你在 Discord 的管理權限顯示可選商城。</div>
          </div>
        </section>
      </main>
    );
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
    const next: string[] = [];
    if (!settings.review.channelId) next.push("評價頻道 ID 尚未設定");
    if (!settings.ticket.categoryId) next.push("工單分類區 ID 尚未設定");
    if (!settings.ticket.supportRoleId) next.push("客服身分組 ID 尚未設定");
    if (!settings.ticket.logChannelId) next.push("工單紀錄頻道 ID 尚未設定");
    if (!settings.accounts.some((item) => item.enabled && item.role === "admin")) next.push("至少需要保留一個啟用中的管理員帳號");
    if (!settings.accounts.some((item) => item.enabled && item.role === "developer")) next.push("至少需要保留一個啟用中的開發者帳號");
    if (settings.accounts.some((item) => item.enabled && item.password.trim().length < 8)) next.push("部分後台帳號密碼長度過短，建議至少 8 碼");
    if (settings.accounts.some((item) => item.enabled && item.password === settings.adminKey)) next.push("部分帳號仍沿用舊管理金鑰作為密碼，建議立即更換");
    if (settings.accounts.some((item) => item.enabled && !item.allowedGuildIds?.length)) next.push("部分後台帳號尚未綁定可管理商城，登入後可能看不到任何伺服器");
    return next;
  })();

  const updateReply = (index: number, next: AutoReplyRule) => {
    const autoReplies = [...settings.autoReplies];
    autoReplies[index] = next;
    setSettings({ ...settings, autoReplies });
  };

  const updateProduct = (index: number, next: ProductItem) => {
    const products = [...settings.ticket.products];
    products[index] = next;
    setSettings({ ...settings, ticket: { ...settings.ticket, products } });
  };

  const updateLinkedGuild = (index: number, next: LinkedGuildConfig) => {
    const linkedGuilds = [...settings.linkedGuilds];
    linkedGuilds[index] = next;
    setSettings({ ...settings, linkedGuilds });
  };

  const updateAccount = (index: number, next: DashboardAccount) => {
    const accounts = [...settings.accounts];
    accounts[index] = next;
    setSettings({ ...settings, accounts });
  };

  const toggleAccountGuildScope = (index: number, guildId: string, checked: boolean) => {
    const account = settings.accounts[index];
    const current = account.allowedGuildIds?.filter((item) => item !== "*") ?? [];
    const allowedGuildIds = checked
      ? [...current, guildId].filter((item, position, array) => array.indexOf(item) === position)
      : current.filter((item) => item !== guildId);
    updateAccount(index, { ...account, allowedGuildIds });
  };

  const toggleAccountAllGuilds = (index: number, checked: boolean) => {
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

  const updateSelectedGuildConfig = (patch: Partial<LinkedGuildConfig>) => {
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

    if (selectedLinkedIndex < 0) return;
    updateLinkedGuild(selectedLinkedIndex, { ...settings.linkedGuilds[selectedLinkedIndex], ...patch });
  };

  const toggleGuildApproval = async (approved: boolean) => {
    if (!selectedGuildId || selectedGuildId === settings.guildId) return;
    setGuildLoading(true);
    try {
      await setBotGuildApproval(selectedGuildId, approved);
      setSettings({
        ...settings,
        linkedGuilds: settings.linkedGuilds.map((item) =>
          item.guildId === selectedGuildId ? { ...item, enabled: approved } : item
        )
      });
      setBotGuilds((current) => current.map((item) => item.id === selectedGuildId ? { ...item, approved } : item));
      setStatus(approved ? "已批准這個群組使用機器人功能" : "已停用這個群組的機器人功能");
    } catch (error) {
      setStatus(`群組批准更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
    } catch (error) {
      setStatus(`後台發送訊息失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
    } catch (error) {
      setStatus(`建立抽獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setGiveawayLoading(false);
    }
  };

  const drawGiveaway = async (id: string) => {
    setGiveawayLoading(true);
    try {
      await drawGiveawayFromDashboard(id);
      setGiveaways(await fetchGiveaways());
      setStatus("抽獎已手動開獎");
    } catch (error) {
      setStatus(`手動開獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setGiveawayLoading(false);
    }
  };

  const closeGiveaway = async (id: string) => {
    setGiveawayLoading(true);
    try {
      await closeGiveawayFromDashboard(id);
      setGiveaways(await fetchGiveaways());
      setStatus("抽獎已手動關閉");
    } catch (error) {
      setStatus(`手動關獎失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
    } catch (error) {
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
    } catch (error) {
      const message = `PAYUNi 入口提醒：${error instanceof Error ? error.message : "未知錯誤"}`;
      setStatus(message);
      setPaymentToolStatus({ tone: "error", message });
    }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      await closeTicketFromDashboard(ticketId);
      setTickets(await fetchTickets());
      setStats(await fetchStats());
      setStatus("已從後台關閉工單");
    } catch (error) {
      setStatus(`後台關單失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    }
  };

  const updateStoreOrderStatus = async (orderId: string, nextStatus: StoreOrderRecord["status"]) => {
    setStorefrontLoading(true);
    try {
      const nextOrder = await updateStoreOrderStatusFromDashboard(orderId, nextStatus);
      setStoreOrders((current) => current.map((item) => item.id === nextOrder.id ? nextOrder : item));
      setStatus(`商城訂單狀態已更新為${storeOrderStatusLabel(nextStatus)}`);
    } catch (error) {
      setStatus(`商城訂單更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setStorefrontLoading(false);
    }
  };

  const sendStoreOrderReply = async (orderId: string) => {
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
    } catch (error) {
      setStatus(`訂單對話回覆失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setStorefrontLoading(false);
    }
  };

  const reloadBalances = async () => {
    setBalanceLoading(true);
    try {
      setBalances(await fetchBalances());
      setStats(await fetchStats());
      setStatus("餘額資料已更新");
    } catch (error) {
      setStatus(`餘額讀取失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
    } catch (error) {
      setStatus(`餘額儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setBalanceLoading(false);
    }
  };

  const adjustBalance = async (record: BalanceRecord, amount: number) => {
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
    } catch (error) {
      setStatus(`餘額調整失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setBalanceLoading(false);
    }
  };

  const removeBalance = async (userId: string) => {
    setBalanceLoading(true);
    try {
      await deleteBalanceFromDashboard(userId);
      setBalances(await fetchBalances());
      setStats(await fetchStats());
      setStatus("餘額帳戶已刪除");
    } catch (error) {
      setStatus(`刪除餘額失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setBalanceLoading(false);
    }
  };

  const reloadPartnerships = async () => {
    setPartnershipLoading(true);
    try {
      setPartnerships(await fetchPartnerships());
      setApplications(await fetchPartnershipApplications());
      setStatus("合作資料已更新");
    } catch (error) {
      setStatus(`合作資料讀取失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
    } catch (error) {
      setStatus(`合作伺服器儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setPartnershipLoading(false);
    }
  };

  const removePartnership = async (id: string) => {
    setPartnershipLoading(true);
    try {
      await deletePartnershipFromDashboard(id);
      setPartnerships(await fetchPartnerships());
      setStatus("合作伺服器已刪除");
    } catch (error) {
      setStatus(`刪除合作伺服器失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setPartnershipLoading(false);
    }
  };

  const approveApplication = async (application: PartnershipApplication) => {
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
    } catch (error) {
      setStatus(`合作申請核准失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setPartnershipLoading(false);
    }
  };

  const rejectApplication = async (application: PartnershipApplication) => {
    setPartnershipLoading(true);
    try {
      await reviewPartnershipApplicationFromDashboard({
        id: application.id,
        status: "rejected",
        reviewNote: "由網站後台拒絕"
      });
      setApplications(await fetchPartnershipApplications());
      setStatus(`已拒絕 ${application.serverName} 的合作申請`);
    } catch (error) {
      setStatus(`合作申請拒絕失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
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
  const visibleNavItems = navItems.filter((item) => item.id === sectionIds.overview || activeCategoryConfig.sections.includes(item.id as never));
  const currentCategoryItems = visibleNavItems.filter((item) => item.id !== sectionIds.overview);
  const visibleSectionIds = new Set(activeCategoryConfig.sections);
  const currentSection = currentCategoryItems.find((item) => item.id === activeSectionView) ?? currentCategoryItems[0];
  const showSection = (id: string) => visibleSectionIds.has(id as never) && currentSection?.id === id;
  const currentGuildLabel = botGuilds.find((guild) => guild.id === selectedGuildId)?.label || settings.brand.serverName;
  const productCategoryCount = new Set(settings.ticket.products.map((item) => item.category.trim()).filter(Boolean)).size;
  const outOfStockProducts = settings.ticket.products.filter((item) => item.stockStatus === "out_of_stock").length;
  const restockingProducts = settings.ticket.products.filter((item) => item.stockStatus === "restocking").length;
  const filteredProducts = settings.ticket.products.filter((product) => {
    const keyword = productSearch.trim().toLowerCase();
    const matchesKeyword = !keyword || [product.name, product.category, product.priceLabel, product.description ?? ""].some((value) => value.toLowerCase().includes(keyword));
    const matchesStatus =
      productStatusFilter === "all"
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
  } as const;
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

  return (
    <main
      className="dashboard"
      style={{
        "--primary": settings.brand.primaryColor,
        "--secondary": settings.brand.secondaryColor
      } as React.CSSProperties}
    >
      <div className="mesh mesh-a" />
      <div className="mesh mesh-b" />

      <header className="topbar">
        <div className="hero-shell card">
          <div className="hero-copy">
            <p className="eyebrow">Commerce Control Center</p>
            <h1>{settings.brand.serverName}</h1>
            <p>{settings.brand.tagline}</p>
            <div className="hero-pills">
              <span className={`pill ${hasUnsavedChanges ? "is-live" : ""}`}>{hasUnsavedChanges ? "有未儲存變更" : "目前已同步"}</span>
              <span className="pill">{settings.moderation.antiSpamEnabled ? "防刷頻啟用" : "防刷頻停用"}</span>
              <span className="pill">{enabledReplies} 條啟用中的自動回覆</span>
              <span className="pill">{enabledProducts} 項上架商品</span>
            </div>
          </div>

          <div className="hero-feature-grid">
            <article className="hero-feature-card">
              <span>設定完成度</span>
              <strong>{configurationScore}%</strong>
              <small>核心流程與記錄頻道的基礎配置覆蓋率</small>
            </article>
            <article className="hero-feature-card">
              <span>營運協作</span>
              <strong>{pendingApplications.length + featuredPartners}</strong>
              <small>待審合作與精選合作伺服器的合計數量</small>
            </article>
            <article className="hero-feature-card">
              <span>客服節奏</span>
              <strong>{activeTickets.length}</strong>
              <small>目前需要追蹤的工單與付款處理節點</small>
            </article>
          </div>
        </div>

        <div className="hero-side">
          <div className="card action-card action-card-strong">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Dashboard Access</p>
                <h3>登入狀態</h3>
              </div>
              <span className={`signal-dot ${hasUnsavedChanges ? "signal-live" : ""}`} />
            </div>

            <div className="account-summary-grid">
              <div className="summary-box">
                <span>目前帳號</span>
                <strong>{authAccount?.displayName ?? authAccount?.username ?? "未登入"}</strong>
              </div>
              <div className="summary-box">
                <span>目前角色</span>
                <strong>{authAccount ? accountRoleLabel(authAccount.role) : "未登入"}</strong>
              </div>
            </div>
            {authAccount ? <div className="login-note compact-note">{authAccount.role === "developer" ? "目前帳號可進行後台維護與流程設定。" : "目前帳號可管理日常設定與營運流程。"}</div> : null}
            <div className="status-line">
              <small>{status}</small>
              <div className="button-row">
                <button type="button" className="ghost-button" onClick={refreshAll}>重新整理</button>
                <button type="button" className="primary-button" onClick={persist} disabled={saving}>{saving ? "儲存中..." : "儲存全部設定"}</button>
                <button type="button" className="ghost-button" onClick={signOut}>登出</button>
              </div>
            </div>
          </div>

          <div className="card executive-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Operation Signal</p>
                <h3>本日重點</h3>
              </div>
            </div>
            <div className="executive-list">
              <div>
                <span>待審合作</span>
                <strong>{pendingApplications.length} 筆</strong>
              </div>
              <div>
                <span>歐付寶設定</span>
                <strong>{opayReady ? "已就緒" : "待補設定"}</strong>
              </div>
              <div>
                <span>總覽狀態</span>
                <strong>{riskItems.length === 0 ? "健康" : `需處理 ${riskItems.length} 項`}</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="card section-card" id="store-switcher">
        <div className="section-head">
          <div>
            <p className="eyebrow">Store Switcher</p>
            <h2>選擇你要管理的商城</h2>
          </div>
          <span className="section-meta">{botGuilds.length} 個可用商城</span>
        </div>
        <div className="hero-feature-grid">
          {botGuilds.map((guild) => (
            <button
              key={guild.id}
              type="button"
              className="hero-feature-card"
              onClick={() => setSelectedGuildId(guild.id)}
              style={{
                textAlign: "left",
                border: selectedGuildId === guild.id ? "1px solid rgba(140, 232, 255, 0.7)" : undefined,
                boxShadow: selectedGuildId === guild.id ? "0 0 0 2px rgba(140,232,255,0.16)" : undefined
              }}
            >
              <span>{guild.isPrimary ? "主商城" : "商城伺服器"}</span>
              <strong>{guild.label || guild.name}</strong>
              <small>{guild.id}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Category View</p>
            <h2>分類視窗</h2>
          </div>
          <span className="section-meta">把伺服器設定、商城設定和訂單處理分開看</span>
        </div>
        <div className="hero-feature-grid">
          {categoryViews.map((category) => (
            <button
              key={category.id}
              type="button"
              className="hero-feature-card"
              onClick={() => {
                setActiveCategoryView(category.id);
                setActiveSectionView(category.target);
                window.location.hash = category.target;
              }}
              style={{
                textAlign: "left",
                border: activeCategoryView === category.id ? "1px solid rgba(255, 122, 51, 0.65)" : undefined,
                boxShadow: activeCategoryView === category.id ? "0 0 0 2px rgba(255,106,43,0.14)" : undefined
              }}
            >
              <span>{category.label}</span>
              <strong>{category.description}</strong>
              <small>切到這類後，左側快捷會只顯示相關項目</small>
            </button>
          ))}
        </div>
      </section>

          <section className="card section-card section-switcher-panel">
              <div className="section-head section-switcher-head">
            <div>
            <p className="eyebrow">Workspace</p>
              <h2>{activeCategoryConfig.label}</h2>
            </div>
            <div className="section-switcher-summary">
              <span className="section-meta">{currentCategoryItems.length} 個工作視窗</span>
              <strong>{currentSection?.label}</strong>
            </div>
          </div>
          <div className="section-switcher-note">
            直接切換目前工作面板，下面會只顯示你正在操作的那一頁。
          </div>
        <div className="section-switcher-grid">
            {currentCategoryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`section-switcher-tab ${currentSection?.id === item.id ? "is-active" : ""}`}
              onClick={() => {
                setActiveSectionView(item.id);
                window.location.hash = item.id;
              }}
              >
                <span className="section-switcher-icon" aria-hidden="true">{item.icon}</span>
                <div className="section-switcher-copy">
                  <strong>{item.label}</strong>
                  <small>{currentSection?.id === item.id ? "目前顯示中" : "點擊切換"}</small>
                </div>
              </button>
            ))}
              </div>
            </section>

            <section className="overview-grid" id={sectionIds.overview}>
        <div className="overview-main">
          <section className="card spotlight-card">
            <div className="spotlight-copy">
              <p className="eyebrow">Executive Summary</p>
              <h2>把商城、客服、合作和付款流程放進同一個營運面板。</h2>
              <p>這個後台現在會把最常用的操作集中在同一頁，讓你不需要來回切換多個畫面，也能快速掌握訂單、合作申請和伺服器營運狀況。</p>
            </div>
            <div className="spotlight-metrics">
              <div><span>品牌一致性</span><strong>{settings.brand.serverName}</strong></div>
              <div><span>精選合作</span><strong>{featuredPartners} 個</strong></div>
              <div><span>FAQ 條目</span><strong>{settings.faq.length} 筆</strong></div>
            </div>
          </section>

            <section className="visual-insight-grid">
              <div className="card insight-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Revenue View</p>
                    <h2>營收比例</h2>
                  </div>
                  <div className="range-switch">
                    {(["day", "week", "month"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`range-chip ${insightRange === item ? "is-active" : ""}`}
                        onClick={() => setInsightRange(item)}
                      >
                        {rangeLabels[item]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="metric-bar-stack">
                  <MetricBar label="商城累積收入" value={`${stats.storefrontRevenue}`} percent={(stats.storefrontRevenue / revenueDenominator) * 100} tone="warm" />
                  <MetricBar label={`商城${rangeLabels[insightRange]}收入`} value={`${rangedRevenue}`} percent={(rangedRevenue / revenueDenominator) * 100} tone="sun" />
                  <MetricBar label="後台總餘額" value={`${stats.totalStoredBalance}`} percent={(stats.totalStoredBalance / revenueDenominator) * 100} tone="cool" />
                </div>
              </div>

              <div className="card insight-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Order Pulse</p>
                    <h2>訂單與客服脈搏</h2>
                  </div>
                  <div className="range-switch">
                    {(["day", "week", "month"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`range-chip ${insightRange === item ? "is-active" : ""}`}
                        onClick={() => setInsightRange(item)}
                      >
                        {rangeLabels[item]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="metric-bar-stack">
                  <MetricBar label={`商城${rangeLabels[insightRange]}訂單`} value={`${rangedOrders}`} percent={(rangedOrders / orderDenominator) * 100} tone="cool" />
                  <MetricBar label="商城待付款" value={`${stats.storefrontPendingOrders}`} percent={(stats.storefrontPendingOrders / orderDenominator) * 100} tone="alert" />
                  <MetricBar label="進行中工單" value={`${stats.openTickets}`} percent={(stats.openTickets / orderDenominator) * 100} tone="warm" />
                  <MetricBar label="完成票單" value={`${stats.completedTickets}`} percent={(stats.completedTickets / orderDenominator) * 100} tone="sun" />
                </div>
            </div>
          </section>

          <section className="stats-category-grid">
            <div className="card stats-category-card">
              <div className="stats-category-head">
                <p className="eyebrow">Store Revenue</p>
                <h3>網站營收</h3>
              </div>
              <div className="stats-grid">
                <Stat label="商城累積收入" value={`${stats.storefrontRevenue}`} tone="warm" hint="已付款 / 處理中 / 已完成 訂單收入" />
                <Stat label="商城今日收入" value={`${stats.storefrontTodayRevenue}`} tone="sun" hint="以訂單建立日期計算的今日收入" />
                <Stat label="已確認訂單" value={`${stats.storefrontPaidOrders}`} tone="cool" hint="已付款、處理中與已完成的有效訂單" />
              </div>
            </div>

            <div className="card stats-category-card">
              <div className="stats-category-head">
                <p className="eyebrow">Orders</p>
                <h3>訂單統計</h3>
              </div>
              <div className="stats-grid">
                <Stat label="商城總訂單" value={`${stats.storefrontTotalOrders}`} tone="cool" hint="商城網站目前累積的訂單數量" />
                <Stat label="商城待付款" value={`${stats.storefrontPendingOrders}`} tone="alert" hint="尚未確認收款的網站訂單" />
                <Stat label="進行中工單" value={`${stats.openTickets}`} tone="warm" hint="目前等待處理或進行中的案件" />
                <Stat label="完成票單" value={`${stats.completedTickets}`} tone="cool" hint="已完成的工單數量" />
              </div>
            </div>

            <div className="card stats-category-card">
              <div className="stats-category-head">
                <p className="eyebrow">Balance Center</p>
                <h3>後台餘額</h3>
              </div>
              <div className="stats-grid">
                <Stat label="餘額帳戶" value={`${stats.balanceUsers}`} tone="cool" hint="目前建立的餘額帳戶數量" />
                <Stat label="總餘額" value={`${stats.totalStoredBalance}`} tone="warm" hint="所有帳戶目前累積的儲值餘額" />
                <Stat label="黑名單人數" value={`${stats.blacklistedUsers}`} tone="alert" hint="已限制開單的使用者數量" />
                <Stat label="平均評價" value={`${stats.averageRating} / 5`} tone="sun" hint="目前累積評價平均分數" />
                <Stat label="自動回覆啟用" value={`${stats.autoReplyRules}`} tone="cool" hint="目前啟用中的自動回覆規則數量" />
              </div>
            </div>
          </section>

          <section className="commerce-pulse-grid">
            <div className="card commerce-pulse-card">
              <p className="eyebrow">Revenue Pulse</p>
              <strong>{stats.storefrontRevenue} NT</strong>
              <small>商城累積收入</small>
              <div className="pulse-meter"><span style={{ width: `${Math.min(100, (stats.storefrontRevenue / revenueDenominator) * 100)}%` }} /></div>
            </div>
            <div className="card commerce-pulse-card">
              <p className="eyebrow">Today Orders</p>
              <strong>{stats.storefrontTodayOrders}</strong>
              <small>今日新增訂單</small>
              <div className="pulse-meter"><span style={{ width: `${Math.min(100, (stats.storefrontTodayOrders / Math.max(stats.storefrontMonthOrders, 1)) * 100)}%` }} /></div>
            </div>
            <div className="card commerce-pulse-card">
              <p className="eyebrow">Pending Queue</p>
              <strong>{stats.storefrontPendingOrders}</strong>
              <small>待付款 / 待追蹤</small>
              <div className="pulse-meter"><span style={{ width: `${Math.min(100, (stats.storefrontPendingOrders / orderDenominator) * 100)}%` }} /></div>
            </div>
            <div className="card commerce-pulse-card">
              <p className="eyebrow">Customer Score</p>
              <strong>{stats.averageRating} / 5</strong>
              <small>顧客平均評價</small>
              <div className="pulse-meter"><span style={{ width: `${Math.min(100, (stats.averageRating / 5) * 100)}%` }} /></div>
            </div>
          </section>

            <div className="system-row">
              <section className="card info-card">
                <p className="eyebrow">系統快照</p>
                <div className="info-list">
                <div><span>工單後台關單</span><strong>{settings.ticket.allowDashboardClose ? "已啟用" : "已停用"}</strong></div>
                <div><span>歐付寶狀態</span><strong>{opayReady ? "已設定" : "尚未設定"}</strong></div>
                <div><span>活躍餘額帳戶</span><strong>{balances.length} 筆</strong></div>
              </div>
            </section>

            <section className="card info-card">
              <p className="eyebrow">待注意項目</p>
              {riskItems.length === 0 ? (
                <div className="safe-box">目前沒有明顯缺漏，設定狀態良好。</div>
              ) : (
                <div className="alert-stack">
                  {riskItems.map((item) => <div className="alert-item" key={item}>{item}</div>)}
                </div>
                )}
              </section>
            </div>

            <section className="card overview-aux-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Workspace Assets</p>
                  <h2>營運快覽</h2>
                </div>
                <span className="section-meta">把常用視覺和清單放回主工作區</span>
              </div>
              <div className="overview-aux-grid">
                {selectedGuildMeta ? (
                  <section className="card preview-panel overview-aux-card">
                    <p className="eyebrow">目前商城視覺</p>
                    <div className="image-spotlight-card">
                      {selectedGuildMeta.iconUrl ? (
                        <img className="image-spotlight-avatar" src={selectedGuildMeta.iconUrl} alt={selectedGuildMeta.name} />
                      ) : (
                        <div className="image-spotlight-fallback">{guildInitials(selectedGuildMeta.name)}</div>
                      )}
                      <div className="image-spotlight-copy">
                        <strong>{selectedGuildMeta.name}</strong>
                        <small>{selectedGuildMeta.isPrimary ? "主商城伺服器" : selectedGuildMeta.approved ? "已批准可用" : "待批准"}</small>
                        <p>後台會優先用商城目前的伺服器圖示與品牌資料做視覺預覽。</p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {featuredProductImages.length ? (
                  <section className="card preview-panel overview-aux-card">
                    <p className="eyebrow">商品圖片牆</p>
                    <div className="visual-grid">
                      {featuredProductImages.map((item) => (
                        <div className="visual-tile" key={item.id}>
                          <img src={item.imageUrl} alt={item.name} />
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="card preview-panel overview-aux-card">
                  <p className="eyebrow">最近工單</p>
                  <div className="mini-list">
                    {activeTickets.slice(0, 5).map((ticket) => <div className="mini-item" key={ticket.id}><strong>{ticket.categoryLabel}</strong><span>{ticket.username}</span></div>)}
                    {activeTickets.length === 0 ? <div className="empty-note">目前沒有進行中的工單。</div> : null}
                  </div>
                </section>

                <section className="card preview-panel overview-aux-card">
                  <p className="eyebrow">最近餘額帳戶</p>
                  <div className="mini-list">
                    {recentBalances.map((item) => <div className="mini-item" key={item.userId}><strong>{item.username}</strong><span>{item.balance} ｜ {prettyDate(item.updatedAt)}</span></div>)}
                    {recentBalances.length === 0 ? <div className="empty-note">目前沒有餘額資料。</div> : null}
                  </div>
                </section>
              </div>
            </section>
          </div>

        <aside className="control-rail">
          <section className="card rail-card">
            <p className="eyebrow">目前工作區</p>
            <div className="snapshot-list">
              <div><span>分類</span><strong>{activeCategoryConfig.label}</strong></div>
              <div><span>面板</span><strong>{currentSection?.label ?? "未選擇"}</strong></div>
              <div><span>商城</span><strong>{botGuilds.find((guild) => guild.id === selectedGuildId)?.label || settings.brand.serverName}</strong></div>
              <div><span>變更狀態</span><strong>{hasUnsavedChanges ? "尚未儲存" : "已同步"}</strong></div>
            </div>
          </section>

          <section className="card rail-card">
            <p className="eyebrow">分類切換</p>
            <div className="nav-list">
              {categoryViews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link ${activeCategoryView === item.id ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategoryView(item.id);
                    setActiveSectionView(item.target);
                    window.location.hash = item.target;
                  }}
                >
                  <span className="nav-link-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="workspace">
        <div className="content-column">
          {showSection(sectionIds.brand) ? <Section id={sectionIds.brand} title="品牌設定" subtitle="控制商城機器人與網站的主視覺" meta="主視覺與名稱">
            <div className="field-grid two">
              <label><span>品牌名稱</span><input value={settings.brand.serverName} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, serverName: e.target.value } })} /></label>
              <label><span>品牌標語</span><input value={settings.brand.tagline} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, tagline: e.target.value } })} /></label>
              <label><span>主色</span><input type="color" value={settings.brand.primaryColor} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, primaryColor: e.target.value } })} /></label>
              <label><span>副色</span><input type="color" value={settings.brand.secondaryColor} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, secondaryColor: e.target.value } })} /></label>
            </div>
          </Section> : null}

          {showSection(sectionIds.storefront) ? <Section id={sectionIds.storefront} title="商城前台" subtitle="設定 HTML 商城網站的商品、註冊與付款流程" meta={`${settings.storefront.paymentMethods.filter((item) => item.enabled).length} 個付款方式啟用中`}>
            <div className="row-card">
              <div className="field-grid two">
                <label><span>商城主標題</span><input value={settings.storefront.heroTitle} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, heroTitle: e.target.value } })} /></label>
                <label><span>Google 登入入口</span><input value={settings.storefront.googleLoginConfigured ? "已接上正式 Google OAuth" : "尚未接上，前台會顯示待設定"} readOnly /></label>
                <label><span>Google Client ID</span><input value={settings.storefront.googleClientId ?? ""} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, googleClientId: e.target.value } })} placeholder="之後接正式 OAuth 用" /></label>
                <label><span>Google Redirect URL</span><input value={settings.storefront.googleRedirectUrl ?? ""} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, googleRedirectUrl: e.target.value } })} placeholder="例如：https://你的網域/api/storefront/google/callback" /></label>
                <label><span>商城通知頻道 ID</span><input value={settings.storefront.notificationChannelId} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, notificationChannelId: e.target.value } })} placeholder="顧客下單後自動通知的 Discord 頻道 ID" /></label>
                <label>
                  <span>新貨通知伺服器</span>
                  <select value={settings.storefront.productAnnouncementGuildId || settings.guildId} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, productAnnouncementGuildId: e.target.value } })}>
                    {botGuilds.map((guild) => (
                      <option key={guild.id} value={guild.id}>
                        {guild.isPrimary ? `主群組｜${guild.name}` : guild.name}
                      </option>
                    ))}
                    {!botGuilds.some((guild) => guild.id === settings.guildId) ? <option value={settings.guildId}>主群組</option> : null}
                  </select>
                </label>
                <label><span>主群組新貨頻道 ID</span><input value={settings.storefront.productAnnouncementChannelId} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, productAnnouncementChannelId: e.target.value } })} placeholder="如果新貨通知伺服器是主群組，就用這個頻道 ID" /></label>
                <label className="span-two"><span>商城主描述</span><textarea value={settings.storefront.heroDescription} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, heroDescription: e.target.value } })} /></label>
              </div>
              <div className="callout-card">
                <strong>超商代碼付款路線</strong>
                <p>現在前台與 Discord 自助開單都會保留兩條超商代碼流程：`超商代碼繳費（PAYUNi直出）` 走直出模組；`超商代碼繳費（歐付寶）` 保留原本歐付寶流程。</p>
              </div>
              <div className="inline-actions">
                <label className="switch"><input type="checkbox" checked={settings.storefront.enabled} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, enabled: e.target.checked } })} /><span>啟用商城前台</span></label>
                <label className="switch"><input type="checkbox" checked={settings.storefront.supportGoogleLogin} onChange={(e) => setSettings({ ...settings, storefront: { ...settings.storefront, supportGoogleLogin: e.target.checked } })} /><span>顯示 Google 註冊/登入入口</span></label>
              </div>
            </div>

            <div className="stack">
              {settings.storefront.paymentMethods.map((method, index) => (
                <div className="row-card" key={method.id}>
                  <div className="field-grid two">
                    <label><span>付款方式名稱</span><input value={method.label} onChange={(e) => {
                      const paymentMethods = [...settings.storefront.paymentMethods];
                      paymentMethods[index] = { ...paymentMethods[index], label: e.target.value };
                      setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                    }} /></label>
                    <label><span>付款方式代號</span><input value={method.id} onChange={(e) => {
                      const paymentMethods = [...settings.storefront.paymentMethods];
                      paymentMethods[index] = { ...paymentMethods[index], id: e.target.value };
                      setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                    }} /></label>
                    <label className="span-two"><span>前台說明</span><textarea value={method.instructions} onChange={(e) => {
                      const paymentMethods = [...settings.storefront.paymentMethods];
                      paymentMethods[index] = { ...paymentMethods[index], instructions: e.target.value };
                      setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                    }} /></label>
                    <label className="span-two"><span>繳費帳戶 / 收款資訊</span><textarea value={method.accountInfo ?? ""} onChange={(e) => {
                      const paymentMethods = [...settings.storefront.paymentMethods];
                      paymentMethods[index] = { ...paymentMethods[index], accountInfo: e.target.value };
                      setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                    }} placeholder="例如：中信銀行 822｜帳號 123456789012｜戶名 王小明" /></label>
                  </div>
                  <div className="inline-actions">
                    <label className="switch"><input type="checkbox" checked={method.enabled} onChange={(e) => {
                      const paymentMethods = [...settings.storefront.paymentMethods];
                      paymentMethods[index] = { ...paymentMethods[index], enabled: e.target.checked };
                      setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods } });
                    }} /><span>前台可選</span></label>
                    <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, storefront: { ...settings.storefront, paymentMethods: settings.storefront.paymentMethods.filter((item) => item.id !== method.id) } })}>刪除付款方式</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => setSettings({
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
              })}>新增付款方式</button>
            </div>

            <div className="stack">
              {storeOrders.slice(0, 12).map((order) => (
                <div className="row-card store-order-shell" key={order.id}>
                  <div className="store-order-top">
                    <div className="store-order-summary">
                      {(() => {
                        const previewProduct = settings.ticket.products.find((item) => item.name === order.items[0]?.name && item.imageUrl?.trim());
                        return previewProduct?.imageUrl ? <img className="store-order-preview" src={previewProduct.imageUrl} alt={order.items[0]?.name || "商品縮圖"} /> : null;
                      })()}
                      <div className="store-order-headline">
                        <strong>{order.customerDisplayName}</strong>
                        <span className="status-chip">{storeOrderStatusLabel(order.status)}</span>
                      </div>
                      <p className="store-order-items">{order.items.map((item) => `${item.name} x${item.quantity}`).join("、")}</p>
                      <div className="store-order-meta-grid">
                        <small>付款方式｜{order.paymentMethodLabel}</small>
                        <small>總額｜{order.totalAmount}</small>
                        <small>建立時間｜{prettyDate(order.createdAt)}</small>
                        <small>對話筆數｜{order.messages?.length ?? 0}</small>
                      </div>
                      {order.opayPaymentCode ? <small className="store-order-code">超商代碼：{order.opayPaymentCode}{order.opayExpireAt ? ` ｜ 到期：${order.opayExpireAt}` : ""}</small> : null}
                    </div>
                    <div className="store-order-actions">
                      <button type="button" className="ghost-button" onClick={() => updateStoreOrderStatus(order.id, "payment_code_ready")} disabled={storefrontLoading}>付款代碼已建立</button>
                      <button type="button" className="ghost-button" onClick={() => updateStoreOrderStatus(order.id, "paid")} disabled={storefrontLoading}>已付款</button>
                      <button type="button" className="ghost-button" onClick={() => updateStoreOrderStatus(order.id, "processing")} disabled={storefrontLoading}>處理中</button>
                      <button type="button" className="primary-button" onClick={() => updateStoreOrderStatus(order.id, "completed")} disabled={storefrontLoading}>已完成</button>
                    </div>
                  </div>
                  <div className="store-order-chat">
                    <div className="store-order-chat-head">
                      <strong>網站訂單對話</strong>
                      <small>顧客送出後會立即留在目前畫面，不整頁重載。</small>
                    </div>
                    <div className="dashboard-chat-list">
                      {(order.messages ?? []).map((message) => (
                        <div
                          className={`dashboard-chat-bubble ${
                            message.senderType === "staff" ? "from-staff" : message.senderType === "customer" ? "from-customer" : "from-system"
                          }`}
                          key={message.id}
                        >
                          <div className="dashboard-chat-meta">
                            <strong>{message.senderName}</strong>
                            <small>{message.senderType === "staff" ? "後台客服" : message.senderType === "customer" ? "顧客" : "系統"} ｜ {prettyDate(message.createdAt)}</small>
                          </div>
                          <p>{message.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="reply-composer">
                      <label>
                        <span>回覆顧客</span>
                        <textarea
                          value={orderReplyDrafts[order.id] ?? ""}
                          onChange={(e) => setOrderReplyDrafts((current) => ({ ...current, [order.id]: e.target.value }))}
                          placeholder="這裡直接回覆顧客，顧客會在網站的我的訂單看到。"
                        />
                      </label>
                      <button type="button" className="primary-button" onClick={() => sendStoreOrderReply(order.id)} disabled={storefrontLoading}>送出網站回覆</button>
                    </div>
                  </div>
                </div>
              ))}
              {storeOrders.length === 0 ? <div className="row-card">目前還沒有商城網站送進來的訂單。</div> : null}
            </div>
          </Section> : null}

          {showSection(sectionIds.accounts) ? <Section id={sectionIds.accounts} title="後台帳號" subtitle="建立商城專屬帳號與登入範圍" meta={`${settings.accounts.filter((item) => item.enabled).length} 個啟用中`}>
            <div className="stack">
              {settings.accounts.map((account, index) => (
                <div className="row-card" key={account.id}>
                  <div className="account-card-head">
                    <div>
                      <strong>{account.displayName?.trim() || account.username || `未命名帳號 ${index + 1}`}</strong>
                      <p>{account.enabled ? "目前可登入" : "目前停用中"} ・ {account.allowedGuildIds?.includes("*") ? "可管理全部商城" : `${account.allowedGuildIds?.length ?? 0} 個商城權限`}</p>
                    </div>
                    <span className={`role-pill role-${account.role}`}>{accountRoleLabel(account.role)}</span>
                  </div>
                  <div className="field-grid three">
                    <label><span>登入帳號</span><input value={account.username} onChange={(e) => updateAccount(index, { ...account, username: e.target.value })} placeholder="例如：admin" /></label>
                    <label><span>顯示名稱</span><input value={account.displayName ?? ""} onChange={(e) => updateAccount(index, { ...account, displayName: e.target.value })} placeholder="例如：星光商城一店" /></label>
                    <label><span>登入密碼</span><input value={account.password} onChange={(e) => updateAccount(index, { ...account, password: e.target.value })} placeholder="至少建議 8 碼" /></label>
                  </div>
                  <div className="field-grid three">
                    <label>
                      <span>角色</span>
                      <select value={account.role} onChange={(e) => updateAccount(index, { ...account, role: e.target.value as DashboardAccount["role"] })}>
                        <option value="admin">管理員</option>
                        <option value="owner">老闆</option>
                        <option value="developer">開發者</option>
                      </select>
                    </label>
                    <label>
                      <span>登入模式</span>
                      <select value={account.authMode ?? "both"} onChange={(e) => updateAccount(index, { ...account, authMode: e.target.value as DashboardAccount["authMode"] })}>
                        <option value="both">本地密碼 + Discord</option>
                        <option value="local">只允許本地密碼</option>
                        <option value="discord">只允許 Discord</option>
                      </select>
                    </label>
                    <label><span>綁定 Discord 使用者 ID</span><input value={account.discordUserId ?? ""} onChange={(e) => updateAccount(index, { ...account, discordUserId: e.target.value })} placeholder="輸入後可限制 Discord 登入對應帳號" /></label>
                  </div>
                  <div className="scope-panel">
                    <div className="scope-panel-head">
                      <div>
                        <strong>可管理商城範圍</strong>
                        <p>商城專屬帳號建議只勾自己的商城；歐付寶也會保留在這些被授權的商城流程裡。</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={account.allowedGuildIds?.includes("*") ?? false}
                          onChange={(e) => toggleAccountAllGuilds(index, e.target.checked)}
                        />
                        <span>全部商城</span>
                      </label>
                    </div>
                    <div className="scope-chip-grid">
                      {guildScopeChoices.map((guild) => {
                        const checked = account.allowedGuildIds?.includes("*") || account.allowedGuildIds?.includes(guild.id);
                        return (
                          <label className={`scope-chip ${checked ? "is-selected" : ""}`} key={`${account.id}-${guild.id}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={account.allowedGuildIds?.includes("*")}
                              onChange={(e) => toggleAccountGuildScope(index, guild.id, e.target.checked)}
                            />
                            <span>{guild.name}</span>
                            <small>{guild.isPrimary ? "主商城" : guild.approved ? "已批准" : "待批准"}</small>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="inline-actions">
                    <label className="switch"><input type="checkbox" checked={account.enabled} onChange={(e) => updateAccount(index, { ...account, enabled: e.target.checked })} /><span>允許登入</span></label>
                    <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, accounts: settings.accounts.filter((item) => item.id !== account.id) })}>刪除帳號</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("admin")] })}>新增管理員帳號</button>
              <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("owner")] })}>新增老闆帳號</button>
              <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, accounts: [...settings.accounts, newDashboardAccount("developer")] })}>新增開發者帳號</button>
            </div>
          </Section> : null}

          {showSection(sectionIds.serverControl) ? <Section id={sectionIds.serverControl} title="群組控制台" subtitle="選擇機器人已加入的群組後直接管理與發送訊息" meta={`${botGuilds.length} 個已加入群組`}>
            <div className="row-card discord-server-shell">
              <aside className="discord-server-rail">
                <div className="discord-server-rail-head">
                  <p className="eyebrow">Servers</p>
                </div>
                <div className="discord-server-list">
                  {botGuilds.map((guild) => {
                    const isSelected = guild.id === selectedGuildId;
                    return (
                      <button
                        key={guild.id}
                        type="button"
                        className={`discord-server-node ${isSelected ? "is-selected" : ""}`}
                        onClick={() => setSelectedGuildId(guild.id)}
                        title={guild.name}
                      >
                        {guild.iconUrl ? (
                          <img className="discord-server-node-avatar" src={guild.iconUrl} alt={guild.name} />
                        ) : (
                          <div className="discord-server-node-fallback">{guildInitials(guild.name)}</div>
                        )}
                        <span className={`discord-server-node-marker ${isSelected ? "is-selected" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="discord-server-panel">
                <div className="discord-server-header">
                  <div className="discord-server-profile">
                    {selectedGuildMeta?.iconUrl ? (
                      <img className="discord-server-profile-avatar" src={selectedGuildMeta.iconUrl} alt={selectedGuildMeta.name} />
                    ) : (
                      <div className="discord-server-profile-fallback">{guildInitials(selectedGuildMeta?.name || selectedGuildConfig?.label || "伺服器")}</div>
                    )}
                    <div className="discord-server-profile-copy">
                      <p className="eyebrow">目前設定伺服器</p>
                      <strong>{selectedGuildMeta?.name || selectedGuildConfig?.label || "未命名群組"}</strong>
                      <small>
                        {selectedGuildMeta?.isPrimary
                          ? "主群組設定"
                          : selectedGuildMeta?.approved
                            ? "已批准，可直接啟用功能"
                            : "待批准，設定完成後還要手動批准"}
                      </small>
                    </div>
                  </div>
                  <div className="discord-server-header-actions">
                    {!selectedGuildMeta?.isPrimary ? <button type="button" className="ghost-button" onClick={() => toggleGuildApproval(false)} disabled={guildLoading}>停用功能</button> : null}
                    {!selectedGuildMeta?.isPrimary ? <button type="button" className="primary-button" onClick={() => toggleGuildApproval(true)} disabled={guildLoading}>批准可用</button> : null}
                  </div>
                </div>

                <div className="discord-server-facts">
                  {selectedGuildMeta ? <span className="chip">群組 ID：{selectedGuildMeta.id}</span> : null}
                  {selectedGuildMeta?.memberCount ? <span className="chip">成員數：{selectedGuildMeta.memberCount}</span> : null}
                  {selectedGuildMeta ? <span className="chip">{selectedGuildMeta.isPrimary ? "這個群組永遠可用" : selectedGuildMeta.approved ? "已批准，可使用全部功能" : "尚未批准，功能鎖定"}</span> : null}
                  <span className="chip">{guildLoading ? "資源讀取中" : `可用頻道 ${guildResources.channels.length} ｜ 身分組 ${guildResources.roles.length}`}</span>
                </div>
              </div>
            </div>

            {selectedGuildConfig ? (
              <>
                <div className="server-settings-workspace">
                  <div className="server-settings-main">
                    <div className="row-card discord-channel-header">
                      <div className="discord-channel-hash">#</div>
                      <div className="discord-channel-copy">
                        <strong>{selectedGuildMeta?.name || selectedGuildConfig.label || "未命名群組"} 設定</strong>
                        <small>點左邊伺服器列切換群組，這裡會只顯示目前群組的設定內容。</small>
                      </div>
                    </div>

                    <div className="row-card settings-category-card">
                      <div className="panel-heading settings-block-head">
                        <div>
                          <p className="eyebrow">Channels</p>
                          <h3>頻道設定</h3>
                        </div>
                        <span className="settings-block-badge">Channel</span>
                      </div>
                      <p className="reply-hint">除了未付款 / 已付款工單分類區 ID，其他欄位留空時都會沿用主群組設定。</p>
                      <div className="field-grid two">
                        <label><span>評價頻道 ID</span><input value={selectedGuildConfig.reviewChannelId} onChange={(e) => updateSelectedGuildConfig({ reviewChannelId: e.target.value })} placeholder="留空就沿用主群組評價頻道" /></label>
                        <label><span>未付款工單分類區 ID</span><input value={selectedGuildConfig.ticketCategoryId} onChange={(e) => updateSelectedGuildConfig({ ticketCategoryId: e.target.value })} placeholder="這個群必填" /></label>
                        <label><span>已付款工單分類區 ID</span><input value={selectedGuildConfig.paidTicketCategoryId ?? ""} onChange={(e) => updateSelectedGuildConfig({ paidTicketCategoryId: e.target.value })} placeholder="這個群必填" /></label>
                        <label><span>工單紀錄頻道 ID</span><input value={selectedGuildConfig.ticketLogChannelId} onChange={(e) => updateSelectedGuildConfig({ ticketLogChannelId: e.target.value })} placeholder="留空就沿用主群組工單紀錄頻道" /></label>
                        <label><span>存檔頻道 ID</span><input value={selectedGuildConfig.transcriptChannelId} onChange={(e) => updateSelectedGuildConfig({ transcriptChannelId: e.target.value })} placeholder="留空就沿用主群組存檔頻道" /></label>
                        <label><span>防刷頻紀錄頻道 ID</span><input value={selectedGuildConfig.moderationLogChannelId} onChange={(e) => updateSelectedGuildConfig({ moderationLogChannelId: e.target.value })} placeholder="留空就沿用主群組防刷頻紀錄頻道" /></label>
                        <label><span>這個群的新貨頻道 ID</span><input value={selectedGuildConfig.productAnnouncementChannelId ?? ""} onChange={(e) => updateSelectedGuildConfig({ productAnnouncementChannelId: e.target.value })} placeholder="留空就沿用主群組新貨頻道" /></label>
                      </div>
                    </div>

                    <div className="row-card settings-category-card">
                      <div className="panel-heading settings-block-head">
                        <div>
                          <p className="eyebrow">Roles & Counters</p>
                          <h3>身分組與統計</h3>
                        </div>
                        <span className="settings-block-badge">Role</span>
                      </div>
                      <p className="reply-hint">客服身分組、完成票單統計與自動身分組都可以留空，會自動沿用主群組設定。</p>
                      <div className="field-grid two">
                        <label><span>客服身分組 ID</span><input value={selectedGuildConfig.supportRoleId} onChange={(e) => updateSelectedGuildConfig({ supportRoleId: e.target.value })} placeholder="留空就沿用主群組客服身分組" /></label>
                        <label><span>自動身分組 ID</span><input value={selectedGuildConfig.autoRoleId} onChange={(e) => updateSelectedGuildConfig({ autoRoleId: e.target.value })} placeholder="留空就沿用主群組自動身分組" /></label>
                        <label><span>完成票單數頻道 ID</span><input value={selectedGuildConfig.completedCountChannelId} onChange={(e) => updateSelectedGuildConfig({ completedCountChannelId: e.target.value })} placeholder="留空就沿用主群組完成票單統計頻道" /></label>
                        <label><span>完成票單數標題</span><input value={selectedGuildConfig.completedCountLabel} onChange={(e) => updateSelectedGuildConfig({ completedCountLabel: e.target.value })} placeholder="留空就沿用主群組標題" /></label>
                      </div>
                    </div>

                    <div className="row-card settings-category-card">
                      <div className="panel-heading settings-block-head">
                        <div>
                          <p className="eyebrow">Broadcast</p>
                          <h3>後台發送訊息</h3>
                        </div>
                        <span className="settings-block-badge">Send</span>
                      </div>
                      <div className="field-grid two">
                        <label>
                          <span>後台發送頻道</span>
                          <select value={messageDraft.channelId} onChange={(e) => setMessageDraft({ ...messageDraft, channelId: e.target.value })}>
                            <option value="">選擇要發送的文字頻道</option>
                            {guildResources.channels.filter((item) => item.type === 0 || item.type === 5).map((channel) => (
                              <option key={channel.id} value={channel.id}>
                                {channel.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>可用資源</span>
                          <input value={guildLoading ? "讀取中..." : `頻道 ${guildResources.channels.length} 個｜身分組 ${guildResources.roles.length} 個`} readOnly />
                        </label>
                        <label className="span-two">
                          <span>後台訊息內容</span>
                          <textarea value={messageDraft.content} onChange={(e) => setMessageDraft({ ...messageDraft, content: e.target.value })} placeholder="在這裡輸入要由機器人送到選定頻道的內容" />
                        </label>
                      </div>
                      <div className="inline-actions">
                        <small className="reply-hint">新加入的群組預設會是待批准，必須先在這裡按「批准可用」才會開放 slash 指令與自動功能。</small>
                        <button type="button" className="primary-button" onClick={sendDashboardMessage} disabled={guildLoading || !selectedGuildMeta?.approved}>用後台發送訊息</button>
                      </div>
                    </div>
                  </div>

                  <aside className="server-settings-side">
                    <div className="row-card settings-side-card">
                      <div className="settings-side-head">
                        <span className="settings-side-icon">📌</span>
                        <div>
                          <p className="eyebrow">Overview</p>
                          <strong>伺服器摘要</strong>
                        </div>
                      </div>
                      <div className="snapshot-list">
                        <div><span>群組名稱</span><strong>{selectedGuildMeta?.name || selectedGuildConfig.label || "未命名"}</strong></div>
                        <div><span>群組 ID</span><strong>{selectedGuildMeta?.id || selectedGuildId || "未同步"}</strong></div>
                        <div><span>成員數</span><strong>{selectedGuildMeta?.memberCount ?? "讀取中"}</strong></div>
                        <div><span>啟用狀態</span><strong>{selectedGuildMeta?.isPrimary ? "主群組" : selectedGuildMeta?.approved ? "已批准" : "待批准"}</strong></div>
                      </div>
                    </div>

                    <div className="row-card settings-side-card">
                      <div className="settings-side-head">
                        <span className="settings-side-icon">🎫</span>
                        <div>
                          <p className="eyebrow">Ticket Flow</p>
                          <strong>工單流程</strong>
                        </div>
                      </div>
                      <div className="faq-stack">
                        <div className="faq-item">
                          <strong>未付款流程</strong>
                          <small>會使用未付款工單分類區 ID 建立與維持票單。</small>
                        </div>
                        <div className="faq-item">
                          <strong>已付款流程</strong>
                          <small>確認付款後會自動移動到已付款工單分類區 ID。</small>
                        </div>
                      </div>
                    </div>

                    <div className="row-card settings-side-card">
                      <div className="settings-side-head">
                        <span className="settings-side-icon">🛡️</span>
                        <div>
                          <p className="eyebrow">Permission Notes</p>
                          <strong>權限備忘</strong>
                        </div>
                      </div>
                      <div className="faq-stack">
                        <div className="faq-item">
                          <strong>客服身分組</strong>
                          <small>工單按鈕與處理流程會優先依照客服身分組限制權限。</small>
                        </div>
                        <div className="faq-item">
                          <strong>批准可用</strong>
                          <small>群組必須被批准後，slash 指令和自動功能才會真的開放。</small>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="row-card server-settings-bottom-grid">
                  <div className="settings-side-card">
                    <div className="settings-side-head">
                      <span className="settings-side-icon">📌</span>
                      <div>
                        <p className="eyebrow">Overview</p>
                        <strong>伺服器摘要</strong>
                      </div>
                    </div>
                    <div className="snapshot-list">
                      <div><span>群組名稱</span><strong>{selectedGuildMeta?.name || selectedGuildConfig.label || "未命名"}</strong></div>
                      <div><span>群組 ID</span><strong>{selectedGuildMeta?.id || selectedGuildId || "未同步"}</strong></div>
                      <div><span>成員數</span><strong>{selectedGuildMeta?.memberCount ?? "讀取中"}</strong></div>
                      <div><span>啟用狀態</span><strong>{selectedGuildMeta?.isPrimary ? "主群組" : selectedGuildMeta?.approved ? "已批准" : "待批准"}</strong></div>
                    </div>
                  </div>

                  <div className="settings-side-card">
                    <div className="settings-side-head">
                      <span className="settings-side-icon">🎫</span>
                      <div>
                        <p className="eyebrow">Ticket Flow</p>
                        <strong>工單流程</strong>
                      </div>
                    </div>
                    <div className="faq-stack">
                      <div className="faq-item">
                        <strong>未付款流程</strong>
                        <small>會使用未付款工單分類區 ID 建立與維持票單。</small>
                      </div>
                      <div className="faq-item">
                        <strong>已付款流程</strong>
                        <small>確認付款後會自動移動到已付款工單分類區 ID。</small>
                      </div>
                    </div>
                  </div>

                  <div className="settings-side-card">
                    <div className="settings-side-head">
                      <span className="settings-side-icon">🛡️</span>
                      <div>
                        <p className="eyebrow">Permission Notes</p>
                        <strong>權限備忘</strong>
                      </div>
                    </div>
                    <div className="faq-stack">
                      <div className="faq-item">
                        <strong>客服身分組</strong>
                        <small>工單按鈕與處理流程會優先依照客服身分組限制權限。</small>
                      </div>
                      <div className="faq-item">
                        <strong>批准可用</strong>
                        <small>群組必須被批准後，slash 指令和自動功能才會真的開放。</small>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="row-card">這個群組尚未建立可編輯設定。若是新加入群組，等機器人同步後就會出現在多群組清單。</div>
            )}
          </Section> : null}

          {showSection(sectionIds.giveaways) ? <Section id={sectionIds.giveaways} title="抽獎管理" subtitle="從後台直接建立抽獎、手動開獎與手動關獎" meta={`${activeGiveaways.length} 個進行中`}>
            <div className="row-card">
              <div className="field-grid three">
                <label>
                  <span>抽獎頻道</span>
                  <select value={giveawayDraft.channelId} onChange={(e) => setGiveawayDraft({ ...giveawayDraft, channelId: e.target.value })}>
                    <option value="">選擇要發送抽獎的文字頻道</option>
                    {guildResources.channels.filter((item) => item.type === 0 || item.type === 5).map((channel) => (
                      <option key={channel.id} value={channel.id}>{channel.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>持續分鐘數</span>
                  <input type="number" min={1} value={giveawayDraft.minutes} onChange={(e) => setGiveawayDraft({ ...giveawayDraft, minutes: Number(e.target.value) || 1 })} />
                </label>
                <label>
                  <span>中獎名額</span>
                  <input type="number" min={1} value={giveawayDraft.winnersCount} onChange={(e) => setGiveawayDraft({ ...giveawayDraft, winnersCount: Number(e.target.value) || 1 })} />
                </label>
                <label className="span-two">
                  <span>抽獎獎品</span>
                  <input value={giveawayDraft.prize} onChange={(e) => setGiveawayDraft({ ...giveawayDraft, prize: e.target.value })} placeholder="例如：Nitro、商城折扣券、80 Robux" />
                </label>
              </div>
              <div className="inline-actions">
                <small className="reply-hint">這裡建立的抽獎會直接發到你現在選定群組的指定頻道，之後也能在下方手動開獎或關獎。</small>
                <button type="button" className="primary-button" onClick={createGiveaway} disabled={giveawayLoading || !selectedGuildMeta?.approved}>從後台建立抽獎</button>
              </div>
            </div>

            <div className="stack">
              {giveaways.filter((item) => item.guildId === selectedGuildId).slice(0, 8).map((giveaway) => (
                <div className={`row-card ticket-card tone-${giveaway.ended ? "muted" : "brand"}`} key={giveaway.id}>
                  <div className="ticket-row">
                    <div>
                      <strong>{giveaway.prize}</strong>
                      <p>ID：{giveaway.id}</p>
                      <small>{giveaway.ended ? "已結束" : "進行中"} ｜ 參加 {giveaway.participants.length} 人 ｜ 名額 {giveaway.winnersCount} ｜ 結束於 {prettyDate(giveaway.endAt)}</small>
                    </div>
                    <div className="button-row">
                      {!giveaway.ended ? <button type="button" className="primary-button" onClick={() => drawGiveaway(giveaway.id)} disabled={giveawayLoading}>手動開獎</button> : null}
                      {!giveaway.ended ? <button type="button" className="ghost-button" onClick={() => closeGiveaway(giveaway.id)} disabled={giveawayLoading}>手動關獎</button> : null}
                    </div>
                  </div>
                </div>
              ))}
              {giveaways.filter((item) => item.guildId === selectedGuildId).length === 0 ? <div className="row-card">這個群組目前還沒有抽獎活動。</div> : null}
            </div>
          </Section> : null}

          {showSection(sectionIds.multiGuild) ? <Section id={sectionIds.multiGuild} title="多群組設定" subtitle="讓同一套機器人在其他群組也能使用" meta={`${settings.linkedGuilds.length} 個額外群組`}>
            <div className="stack">
              {settings.linkedGuilds.map((guild, index) => (
                <div className="row-card" key={`${guild.guildId || "linked"}-${index}`}>
                  <p className="reply-hint">只要群組被批准，除了未付款 / 已付款工單分類區 ID 以外，其他欄位都可以留空並沿用主群組。</p>
                  <div className="field-grid two">
                    <label><span>群組 ID</span><input value={guild.guildId} onChange={(e) => updateLinkedGuild(index, { ...guild, guildId: e.target.value })} placeholder="手動輸入 Discord 群組 ID" /></label>
                    <label><span>顯示名稱</span><input value={guild.label} onChange={(e) => updateLinkedGuild(index, { ...guild, label: e.target.value })} placeholder="例如：分店群、合作群" /></label>
                    <label><span>評價頻道 ID</span><input value={guild.reviewChannelId} onChange={(e) => updateLinkedGuild(index, { ...guild, reviewChannelId: e.target.value })} placeholder="留空就沿用主群組評價頻道" /></label>
                    <label><span>未付款工單分類區 ID</span><input value={guild.ticketCategoryId} onChange={(e) => updateLinkedGuild(index, { ...guild, ticketCategoryId: e.target.value })} placeholder="這個群必填" /></label>
                    <label><span>已付款工單分類區 ID</span><input value={guild.paidTicketCategoryId ?? ""} onChange={(e) => updateLinkedGuild(index, { ...guild, paidTicketCategoryId: e.target.value })} placeholder="這個群必填" /></label>
                    <label><span>客服身分組 ID</span><input value={guild.supportRoleId} onChange={(e) => updateLinkedGuild(index, { ...guild, supportRoleId: e.target.value })} placeholder="留空就沿用主群組客服身分組" /></label>
                    <label><span>自動身分組 ID</span><input value={guild.autoRoleId} onChange={(e) => updateLinkedGuild(index, { ...guild, autoRoleId: e.target.value })} placeholder="留空就沿用主群組自動身分組" /></label>
                    <label><span>工單紀錄頻道 ID</span><input value={guild.ticketLogChannelId} onChange={(e) => updateLinkedGuild(index, { ...guild, ticketLogChannelId: e.target.value })} placeholder="留空就沿用主群組工單紀錄頻道" /></label>
                    <label><span>存檔頻道 ID</span><input value={guild.transcriptChannelId} onChange={(e) => updateLinkedGuild(index, { ...guild, transcriptChannelId: e.target.value })} placeholder="留空就沿用主群組存檔頻道" /></label>
                    <label><span>完成票單數頻道 ID</span><input value={guild.completedCountChannelId} onChange={(e) => updateLinkedGuild(index, { ...guild, completedCountChannelId: e.target.value })} placeholder="留空就沿用主群組完成票單統計頻道" /></label>
                    <label><span>完成票單數標題</span><input value={guild.completedCountLabel} onChange={(e) => updateLinkedGuild(index, { ...guild, completedCountLabel: e.target.value })} placeholder="留空就沿用主群組標題" /></label>
                    <label><span>防刷頻紀錄頻道 ID</span><input value={guild.moderationLogChannelId} onChange={(e) => updateLinkedGuild(index, { ...guild, moderationLogChannelId: e.target.value })} placeholder="留空就沿用主群組防刷頻紀錄頻道" /></label>
                    <label><span>新貨頻道 ID</span><input value={guild.productAnnouncementChannelId ?? ""} onChange={(e) => updateLinkedGuild(index, { ...guild, productAnnouncementChannelId: e.target.value })} placeholder="留空就沿用主群組新貨頻道" /></label>
                  </div>
                  <div className="inline-actions">
                    <label className="switch"><input type="checkbox" checked={guild.enabled} onChange={(e) => updateLinkedGuild(index, { ...guild, enabled: e.target.checked })} /><span>啟用這個群組</span></label>
                    <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, linkedGuilds: settings.linkedGuilds.filter((_, guildIndex) => guildIndex !== index) })}>刪除群組</button>
                  </div>
                </div>
              ))}
              {settings.linkedGuilds.length === 0 ? <div className="row-card">目前還沒有額外群組。新增後手動填入群組 ID 和各頻道/身分組 ID 就能使用。</div> : null}
            </div>
            <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, linkedGuilds: [...settings.linkedGuilds, newLinkedGuild()] })}>新增額外群組</button>
          </Section> : null}

          {showSection(sectionIds.ticket) ? <Section id={sectionIds.ticket} title="工單系統" subtitle="商城訂單流程、統計頻道與客服設定" meta={`${settings.ticket.categories.length} 個類型`}>
            <div className="field-grid two">
              <label><span>未付款工單分類區 ID</span><input value={settings.ticket.categoryId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, categoryId: e.target.value } })} /></label>
              <label><span>已付款工單分類區 ID</span><input value={settings.ticket.paidCategoryId ?? ""} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, paidCategoryId: e.target.value } })} /></label>
              <label><span>客服身分組 ID</span><input value={settings.ticket.supportRoleId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, supportRoleId: e.target.value } })} /></label>
              <label><span>自動身分組 ID</span><input value={settings.ticket.autoRoleId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, autoRoleId: e.target.value } })} /></label>
              <label><span>工單紀錄頻道 ID</span><input value={settings.ticket.logChannelId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, logChannelId: e.target.value } })} /></label>
              <label><span>存檔頻道 ID</span><input value={settings.ticket.transcriptChannelId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, transcriptChannelId: e.target.value } })} /></label>
              <label><span>完成票單數頻道 ID</span><input value={settings.ticket.completedCountChannelId} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, completedCountChannelId: e.target.value } })} /></label>
              <label><span>統計頻道標題</span><input value={settings.ticket.completedCountLabel} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, completedCountLabel: e.target.value } })} /></label>
              <label><span>同時開單上限</span><input type="number" min={1} value={settings.ticket.maxOpenTicketsPerUser} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, maxOpenTicketsPerUser: Number(e.target.value) || 1 } })} /></label>
              <label><span>工單按鈕文字</span><input value={settings.ticket.buttonLabel} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, buttonLabel: e.target.value } })} /></label>
            </div>
            <div className="inline-actions top-gap">
              <label className="switch">
                <input type="checkbox" checked={settings.ticket.allowDashboardClose} onChange={(e) => setSettings({ ...settings, ticket: { ...settings.ticket, allowDashboardClose: e.target.checked } })} />
                <span>後台關單</span>
              </label>
              <div className="chip-list">
                {settings.ticket.categories.map((category) => <span className="chip" key={category.id}>{category.emoji} {category.label}</span>)}
              </div>
            </div>
          </Section> : null}

          {showSection(sectionIds.moderation) ? <Section id={sectionIds.moderation} title="防刷頻" subtitle="防止短時間大量訊息洗版的自動處置" meta={settings.moderation.antiSpamEnabled ? "保護中" : "未啟用"}>
            <div className="field-grid two">
              <label><span>紀錄頻道 ID</span><input value={settings.moderation.logChannelId} onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, logChannelId: e.target.value } })} /></label>
              <label><span>訊息門檻</span><input type="number" min={2} value={settings.moderation.spamMessageLimit} onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, spamMessageLimit: Number(e.target.value) || 5 } })} /></label>
              <label><span>時間窗口（秒）</span><input type="number" min={2} value={settings.moderation.spamWindowSeconds} onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, spamWindowSeconds: Number(e.target.value) || 8 } })} /></label>
              <label><span>禁言分鐘數</span><input type="number" min={1} value={settings.moderation.timeoutMinutes} onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, timeoutMinutes: Number(e.target.value) || 10 } })} /></label>
            </div>
            <div className="inline-actions top-gap">
              <label className="switch">
                <input type="checkbox" checked={settings.moderation.antiSpamEnabled} onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, antiSpamEnabled: e.target.checked } })} />
                <span>啟用防刷頻</span>
              </label>
            </div>
          </Section> : null}

          {showSection(sectionIds.products) ? <Section id={sectionIds.products} title="商品目錄" subtitle="讓購物單可直接引用商城商品" meta={`${enabledProducts} 項上架中`}>
            <div className="row-card inventory-overview">
              <div className="inventory-kpi">
                <span>商品總數</span>
                <strong>{settings.ticket.products.length}</strong>
                <small>目前商品庫所有品項</small>
              </div>
              <div className="inventory-kpi">
                <span>上架中</span>
                <strong>{enabledProducts}</strong>
                <small>顧客目前看得到的商品</small>
              </div>
              <div className="inventory-kpi">
                <span>精選商品</span>
                <strong>{settings.ticket.products.filter((item) => item.featured).length}</strong>
                <small>首頁會優先展示的商品</small>
              </div>
              <div className="inventory-kpi">
                <span>缺貨中</span>
                <strong>{outOfStockProducts}</strong>
                <small>目前顧客暫時無法下單的商品</small>
              </div>
              <div className="inventory-kpi">
                <span>補貨中</span>
                <strong>{restockingProducts}</strong>
                <small>等待重新上架或補貨的商品</small>
              </div>
              <div className="inventory-kpi">
                <span>分類數量</span>
                <strong>{productCategoryCount}</strong>
                <small>目前建立的商品分類</small>
              </div>
              <div className="inventory-cta">
                <button type="button" className="primary-button" onClick={() => setSettings({ ...settings, ticket: { ...settings.ticket, products: [...settings.ticket.products, newProduct()] } })}>新增商品</button>
              </div>
            </div>
            <div className="row-card inventory-toolbar">
              <div className="field-grid two">
                <label>
                  <span>搜尋商品</span>
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="搜尋商品名稱、分類、價格或描述" />
                </label>
                <label>
                  <span>商品篩選</span>
                  <select value={productStatusFilter} onChange={(e) => setProductStatusFilter(e.target.value as "all" | "enabled" | "featured")}>
                    <option value="all">全部商品</option>
                    <option value="enabled">只看上架中</option>
                    <option value="featured">只看精選商品</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="row-card inventory-table-card">
              <div className="inventory-table-head">
                <strong>商品庫總表</strong>
                <small>目前顯示 {filteredProducts.length} / {settings.ticket.products.length} 項商品</small>
              </div>
              <div className="inventory-table">
                <div className="inventory-table-row inventory-table-header">
                  <span>商品</span>
                  <span>分類</span>
                  <span>價格</span>
                  <span>狀態</span>
                  <span>庫存</span>
                  <span>精選</span>
                </div>
                {filteredProducts.map((product) => (
                  <div className="inventory-table-row" key={`summary-${product.id}`}>
                    <span>{product.name || "未命名商品"}</span>
                    <span>{product.category || "未分類"}</span>
                    <span>{product.priceLabel || "未設定"}</span>
                    <span>{product.enabled ? "上架中" : "未上架"}</span>
                    <span>{productStockLabel(product.stockStatus)}</span>
                    <span>{product.featured ? "精選" : "一般"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack">
              {filteredProducts.map((product) => {
                const index = settings.ticket.products.findIndex((item) => item.id === product.id);
                return (
                <div className="row-card product-admin-card" key={product.id}>
                  <div className="product-admin-visual">
                    {splitImageGallery(product.imageUrl).length ? (
                      <div className="product-gallery-strip">
                        <img src={splitImageGallery(product.imageUrl)[0]} alt={product.name || "商品圖片"} />
                        {splitImageGallery(product.imageUrl).slice(1, 4).map((image, imageIndex) => (
                          <img key={`${product.id}-${imageIndex}`} src={image} alt={`${product.name || "商品圖片"}-${imageIndex + 2}`} />
                        ))}
                      </div>
                    ) : <div className="product-admin-fallback">{(product.name || "P").slice(0, 1).toUpperCase()}</div>}
                    <div className="product-admin-summary">
                      <strong>{product.name || "未命名商品"}</strong>
                      <small>{product.category || "未分類"} ｜ {product.priceLabel || "未設定價格"} ｜ {productStockLabel(product.stockStatus)}</small>
                      <span className={`pill ${productStockTone(product.stockStatus)}`}>{productStockLabel(product.stockStatus)}</span>
                      {product.stockNote?.trim() ? <p className="product-admin-stock-note">{product.stockNote}</p> : null}
                    </div>
                  </div>
                  <div className="field-grid three">
                    <label><span>商品名稱</span><input value={product.name} onChange={(e) => updateProduct(index, { ...product, name: e.target.value })} /></label>
                    <label><span>分類</span><input value={product.category} onChange={(e) => updateProduct(index, { ...product, category: e.target.value })} /></label>
                    <label><span>價格文字</span><input value={product.priceLabel} onChange={(e) => updateProduct(index, { ...product, priceLabel: e.target.value })} /></label>
                    <label><span>商品圖片網址</span><input value={product.imageUrl ?? ""} onChange={(e) => updateProduct(index, { ...product, imageUrl: e.target.value })} placeholder="可填多張，用逗號或換行分隔" /></label>
                    <label>
                      <span>庫存狀態</span>
                      <select value={product.stockStatus} onChange={(e) => updateProduct(index, { ...product, stockStatus: e.target.value as ProductItem["stockStatus"] })}>
                        <option value="in_stock">現貨供應</option>
                        <option value="restocking">補貨中</option>
                        <option value="out_of_stock">缺貨中</option>
                      </select>
                    </label>
                    <label><span>庫存說明</span><input value={product.stockNote ?? ""} onChange={(e) => updateProduct(index, { ...product, stockNote: e.target.value })} placeholder="例如：到貨時間、補貨提醒、暫停販售說明" /></label>
                    <label className="span-two"><span>商品描述</span><textarea value={product.description ?? ""} onChange={(e) => updateProduct(index, { ...product, description: e.target.value })} placeholder="這個商品會顯示在商城 HTML 前台上。" /></label>
                  </div>
                  <div className="inline-actions">
                    <label className="switch"><input type="checkbox" checked={product.enabled} onChange={(e) => updateProduct(index, { ...product, enabled: e.target.checked })} /><span>上架中</span></label>
                    <label className="switch"><input type="checkbox" checked={Boolean(product.featured)} onChange={(e) => updateProduct(index, { ...product, featured: e.target.checked })} /><span>精選商品</span></label>
                    <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, ticket: { ...settings.ticket, products: settings.ticket.products.filter((item) => item.id !== product.id) } })}>刪除</button>
                  </div>
                </div>
              )})}
              {filteredProducts.length === 0 ? <div className="row-card">目前沒有符合搜尋或篩選條件的商品。</div> : null}
            </div>
          </Section> : null}

          {showSection(sectionIds.blacklist) ? <Section id={sectionIds.blacklist} title="黑名單" subtitle="阻擋特定使用者重複亂開單" meta={`${settings.ticket.blacklist.length} 人`}>
            <div className="stack">
              {settings.ticket.blacklist.map((entry, index) => (
                <div className="row-card" key={entry.id}>
                  <div className="field-grid two">
                    <label><span>使用者 ID</span><input value={entry.userId} onChange={(e) => updateBlacklist(index, { ...entry, userId: e.target.value })} /></label>
                    <label><span>備註</span><input value={entry.note} onChange={(e) => updateBlacklist(index, { ...entry, note: e.target.value })} /></label>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, ticket: { ...settings.ticket, blacklist: settings.ticket.blacklist.filter((item) => item.id !== entry.id) } })}>刪除</button>
                </div>
              ))}
            </div>
            <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, ticket: { ...settings.ticket, blacklist: [...settings.ticket.blacklist, newBlacklist()] } })}>新增黑名單</button>
          </Section> : null}

          {showSection(sectionIds.balance) ? <Section id={sectionIds.balance} title="餘額系統" subtitle="管理每位使用者可用餘額" meta={`${balances.length} 筆帳戶`}>
            <div className="row-card">
              <div className="field-grid two">
                <label><span>使用者 ID</span><input value={balanceDraft.userId} onChange={(e) => setBalanceDraft({ ...balanceDraft, userId: e.target.value })} placeholder="Discord 使用者 ID" /></label>
                <label><span>使用者名稱</span><input value={balanceDraft.username} onChange={(e) => setBalanceDraft({ ...balanceDraft, username: e.target.value })} placeholder="例如 user#1234" /></label>
                <label><span>初始餘額</span><input type="number" min={0} value={balanceDraft.amount} onChange={(e) => setBalanceDraft({ ...balanceDraft, amount: Number(e.target.value) || 0 })} /></label>
                <label><span>備註</span><input value={balanceDraft.note} onChange={(e) => setBalanceDraft({ ...balanceDraft, note: e.target.value })} placeholder="例如：人工補款" /></label>
              </div>
              <div className="inline-actions">
                <button type="button" className="primary-button" onClick={submitBalanceDraft} disabled={balanceLoading}>建立或覆蓋餘額</button>
                <button type="button" className="ghost-button" onClick={reloadBalances} disabled={balanceLoading}>重新整理餘額</button>
              </div>
            </div>

            <div className="stack">
              {balances.map((record) => (
                <div className="row-card balance-card" key={record.userId}>
                  <div className="ticket-row">
                    <div>
                      <strong>{record.username}</strong>
                      <p>ID：{record.userId}</p>
                      <small>餘額：{record.balance} {record.note ? `｜備註：${record.note}` : ""}</small>
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="ghost-button" onClick={() => adjustBalance(record, 10)} disabled={balanceLoading}>+10</button>
                      <button type="button" className="ghost-button" onClick={() => adjustBalance(record, -10)} disabled={balanceLoading}>-10</button>
                      <button type="button" className="ghost-button" onClick={() => removeBalance(record.userId)} disabled={balanceLoading}>刪除</button>
                    </div>
                  </div>
                </div>
              ))}
              {balances.length === 0 ? <div className="row-card">目前還沒有任何餘額帳戶。</div> : null}
            </div>
          </Section> : null}

          {showSection(sectionIds.partnerships) ? <Section id={sectionIds.partnerships} title="合作伺服器" subtitle="管理合作名單與展示資料" meta={`${partnerships.length} 個合作伺服器`}>
            <div className="row-card">
              <div className="field-grid two">
                <label><span>伺服器名稱</span><input value={partnershipDraft.serverName} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, serverName: e.target.value })} /></label>
                <label><span>邀請連結</span><input value={partnershipDraft.inviteUrl} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, inviteUrl: e.target.value })} /></label>
                <label><span>聯絡方式</span><input value={partnershipDraft.contact} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, contact: e.target.value })} /></label>
                <label><span>Banner 圖片</span><input value={partnershipDraft.bannerUrl} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, bannerUrl: e.target.value })} /></label>
                <label className="span-two"><span>簡介</span><textarea value={partnershipDraft.description} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, description: e.target.value })} /></label>
                <label><span>標籤</span><input value={partnershipDraft.tags.join(", ")} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="遊戲, 商城, 互推" /></label>
              </div>
              <div className="inline-actions">
                <label className="switch"><input type="checkbox" checked={partnershipDraft.mutualPromotion} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, mutualPromotion: e.target.checked })} /><span>互推合作</span></label>
                <label className="switch"><input type="checkbox" checked={partnershipDraft.featured} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, featured: e.target.checked })} /><span>精選</span></label>
                <label className="switch"><input type="checkbox" checked={partnershipDraft.enabled} onChange={(e) => setPartnershipDraft({ ...partnershipDraft, enabled: e.target.checked })} /><span>上架中</span></label>
                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={reloadPartnerships} disabled={partnershipLoading}>重新整理</button>
                  <button type="button" className="primary-button" onClick={savePartnershipDraft} disabled={partnershipLoading}>儲存合作伺服器</button>
                </div>
              </div>
            </div>

            <div className="stack">
              {partnerships.map((item) => (
                <div className="row-card" key={item.id}>
                  <div className="ticket-row">
                    <div>
                      <strong>{item.serverName}</strong>
                      <p>{item.contact || "未填聯絡方式"}</p>
                      <small>{item.enabled ? "上架中" : "未上架"} ｜ {item.tags.join(" / ") || "無標籤"}</small>
                    </div>
                    <div className="button-row">
                      <button type="button" className="ghost-button" onClick={() => setPartnershipDraft(item)}>編輯</button>
                      <button type="button" className="ghost-button" onClick={() => removePartnership(item.id)} disabled={partnershipLoading}>刪除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section> : null}

          {showSection(sectionIds.applications) ? <Section id={sectionIds.applications} title="合作申請" subtitle="審核外部伺服器送來的合作申請" meta={`${pendingApplications.length} 筆待審核`}>
            <div className="stack">
              {applications.map((application) => (
                <div className="row-card application-card" key={application.id}>
                  <div className="application-cover-card">
                    <div className="application-cover-hero">
                      <span className={`application-status-pill is-${application.status}`}>{application.status}</span>
                      <strong>{application.serverName}</strong>
                      <p>{application.ownerName} ｜ {application.contact}</p>
                      <small>{application.inviteUrl}</small>
                    </div>
                    <div className="button-row">
                      {application.status === "pending" ? (
                        <>
                          <button type="button" className="primary-button" onClick={() => approveApplication(application)} disabled={partnershipLoading}>核准並建立</button>
                          <button type="button" className="ghost-button" onClick={() => rejectApplication(application)} disabled={partnershipLoading}>拒絕</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="application-body">
                    <div className="application-banner application-banner-fallback">{application.serverName}</div>
                    <p>{application.description}</p>
                    {application.benefits ? <small>合作內容：{application.benefits}</small> : null}
                    {application.reviewNote ? <small>審核備註：{application.reviewNote}</small> : null}
                  </div>
                </div>
              ))}
              {applications.length === 0 ? <div className="row-card">目前還沒有合作申請。</div> : null}
            </div>
          </Section> : null}

          {showSection(sectionIds.reply) ? <Section id={sectionIds.reply} title="自動回覆" subtitle="把常見問題與價格詢問先擋在前面" meta={`${enabledReplies} 條啟用中`}>
            <div className="stack">
              {settings.autoReplies.map((rule, index) => (
                <div className="row-card auto-reply-card" key={rule.id}>
                  <div className="auto-reply-head">
                    <div>
                      <strong>規則 {index + 1}</strong>
                      <p>{rule.enabled ? "目前啟用中" : "目前停用中"}</p>
                    </div>
                    <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, autoReplies: settings.autoReplies.filter((item) => item.id !== rule.id) })}>刪除</button>
                  </div>

                  <div className="field-grid two">
                    <label>
                      <span>關鍵字</span>
                      <textarea className="reply-trigger" value={rule.trigger} onChange={(e) => updateReply(index, { ...rule, trigger: e.target.value })} placeholder="例如：價格表" />
                    </label>
                    <label>
                      <span>回覆內容</span>
                      <textarea className="reply-response" value={rule.response} onChange={(e) => updateReply(index, { ...rule, response: e.target.value })} placeholder={"支援換行。\n例如：第一行說明\n第二行補充資訊"} />
                    </label>
                  </div>

                  <div className="field-grid rule-meta-grid">
                    <label>
                      <span>匹配模式</span>
                      <select value={rule.matchMode} onChange={(e) => updateReply(index, { ...rule, matchMode: e.target.value as AutoReplyRule["matchMode"] })}>
                        <option value="includes">包含</option>
                        <option value="startsWith">開頭</option>
                        <option value="exact">完全符合</option>
                      </select>
                    </label>
                    <label>
                      <span>冷卻秒數</span>
                      <input type="number" min={0} value={rule.cooldownSeconds} onChange={(e) => updateReply(index, { ...rule, cooldownSeconds: Number(e.target.value) })} />
                    </label>
                  </div>

                  <div className="inline-actions">
                    <label className="switch"><input type="checkbox" checked={rule.enabled} onChange={(e) => updateReply(index, { ...rule, enabled: e.target.checked })} /><span>啟用</span></label>
                    <label className="switch"><input type="checkbox" checked={rule.ignoreCase} onChange={(e) => updateReply(index, { ...rule, ignoreCase: e.target.checked })} /><span>忽略大小寫</span></label>
                    <small className="reply-hint">提示：回覆內容可以直接換行，Discord 會照原樣送出。</small>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, autoReplies: [...settings.autoReplies, newReply()] })}>新增規則</button>
          </Section> : null}

          {showSection(sectionIds.payment) ? <Section id={sectionIds.payment} title="付款工具" subtitle="在主工作區直接建立收款流程，現在同時準備歐付寶與 PAYUNi 入口" meta={opayReady || payuniReady ? "已準備金流入口" : "尚未設定金流"}>
            <div className="row-card">
              <div className="field-grid two">
                <label><span>商品名稱</span><input value={paymentForm.itemName} onChange={(e) => setPaymentForm({ ...paymentForm, itemName: e.target.value })} placeholder="例如：80 Robux" /></label>
                <label><span>金額</span><input type="number" min={1} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 1 })} /></label>
                <label><span>訂單描述</span><input value={paymentForm.tradeDesc} onChange={(e) => setPaymentForm({ ...paymentForm, tradeDesc: e.target.value })} /></label>
                <label>
                  <span>超商類型</span>
                  <select value={paymentForm.subPayment} onChange={(e) => setPaymentForm({ ...paymentForm, subPayment: e.target.value as typeof paymentForm.subPayment })}>
                    <option value="CVS">系統選擇</option>
                    <option value="FAMILY">全家</option>
                    <option value="IBON">7-ELEVEN</option>
                    <option value="OKMART">OK</option>
                    <option value="HILIFE">萊爾富</option>
                  </select>
                </label>
              </div>
              <div className="stack">
                <div className="callout-card">
                  <strong>歐付寶超商代碼</strong>
                  <p>這條會保留原本歐付寶流程，建立後直接開啟官方付款頁。</p>
                  <div className="inline-actions">
                    <div className="chip-list">
                      <span className="chip">{opayReady ? "歐付寶已設定" : "尚未設定歐付寶金鑰"}</span>
                      <span className="chip">建立後會直接開付款頁</span>
                    </div>
                    <button type="button" className="primary-button" onClick={openOpayCheckout} disabled={!opayReady}>{opayReady ? "開啟歐付寶付款頁" : "尚未設定歐付寶金鑰"}</button>
                  </div>
                </div>
                <div className="callout-card">
                  <strong>PAYUNi 直出代碼</strong>
                  <p>這塊是後台 PAYUNi 專屬入口。參數補齊後，這裡就是之後直接生成超商代碼的位置。</p>
                  <div className="inline-actions">
                    <div className="chip-list">
                      <span className="chip">{payuniReady ? "PAYUNi 已補齊基本參數" : "尚未設定 PAYUNi 金鑰"}</span>
                      <span className="chip">Notify / Return 已獨立保留</span>
                    </div>
                    <button type="button" className="primary-button" onClick={openPayuniDirectCode}>{payuniReady ? "PAYUNi 入口已準備" : "先補 PAYUNi 參數"}</button>
                  </div>
                </div>
                {paymentToolStatus ? (
                  <div
                    className="callout-card"
                    style={{
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
                    }}
                  >
                    <strong>{paymentToolStatus.tone === "error" ? "金流提醒" : paymentToolStatus.tone === "success" ? "建立結果" : "處理狀態"}</strong>
                    <p>{paymentToolStatus.message}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Section> : null}

          {showSection(sectionIds.faq) ? <Section id={sectionIds.faq} title="FAQ 管理" subtitle="把常見問題放回主要內容區，避免切到這頁時主工作區留白" meta={`${settings.faq.length} 筆`}>
            <div className="stack">
              {settings.faq.map((item, index) => (
                <div className="row-card" key={item.id}>
                  <div className="faq-item">
                    <input value={item.question} onChange={(e) => {
                      const faq = [...settings.faq];
                      faq[index] = { ...faq[index], question: e.target.value };
                      setSettings({ ...settings, faq });
                    }} placeholder="問題標題" />
                    <textarea value={item.answer} onChange={(e) => {
                      const faq = [...settings.faq];
                      faq[index] = { ...faq[index], answer: e.target.value };
                      setSettings({ ...settings, faq });
                    }} placeholder="問題回答" />
                  </div>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => setSettings({ ...settings, faq: [...settings.faq, { id: createId("faq"), question: "", answer: "" }] })}>新增 FAQ</button>
            </div>
          </Section> : null}

          {showSection(sectionIds.tickets) ? <Section id={sectionIds.tickets} title="後台關單" subtitle="直接在網站查看工單並手動關閉" meta={`${activeTickets.length} 張進行中`}>
            <div className="stack">
              {tickets.slice(0, 12).map((ticket) => (
                <div className={`row-card ticket-card tone-${ticketTone(ticket.status)}`} key={ticket.id}>
                  <div className="ticket-row">
                    <div>
                      <strong>{ticket.categoryLabel}</strong>
                      <p>{ticket.username}</p>
                      <small>{ticket.status} ｜ 建立於 {prettyDate(ticket.createdAt)}</small>
                    </div>
                    <button type="button" className="ghost-button" onClick={() => closeTicket(ticket.id)} disabled={!settings.ticket.allowDashboardClose || ticket.status === "closed"}>關單</button>
                  </div>
                </div>
              ))}
            </div>
          </Section> : null}
        </div>

        <aside className="sidebar-column">
          <section className="card preview-panel">
            <p className="eyebrow">Workspace Snapshot</p>
            <div className="snapshot-list">
              <div><span>目前分類</span><strong>{activeCategoryConfig.label}</strong></div>
              <div><span>目前頁面</span><strong>{currentSection?.label ?? "未選擇"}</strong></div>
              <div><span>管理商城</span><strong>{currentGuildLabel}</strong></div>
              <div><span>儲存狀態</span><strong>{hasUnsavedChanges ? "尚未儲存" : "已同步"}</strong></div>
            </div>
          </section>

          <section className="card preview-panel brand-preview-panel">
            <p className="eyebrow">Brand Preview</p>
            <div className="brand-preview">
              <div className="brand-preview-badge">LIVE</div>
              <strong>{settings.brand.serverName}</strong>
              <p>{settings.brand.tagline}</p>
              <div className="brand-swatches">
                <span style={{ background: settings.brand.primaryColor }} />
                <span style={{ background: settings.brand.secondaryColor }} />
              </div>
            </div>
          </section>

          {showSection(sectionIds.serverControl) && selectedGuildMeta ? <section className="card preview-panel">
            <p className="eyebrow">目前伺服器</p>
            <div className="image-spotlight-card">
              {selectedGuildMeta.iconUrl ? (
                <img className="image-spotlight-avatar" src={selectedGuildMeta.iconUrl} alt={selectedGuildMeta.name} />
              ) : (
                <div className="image-spotlight-fallback">{guildInitials(selectedGuildMeta.name)}</div>
              )}
              <div className="image-spotlight-copy">
                <strong>{selectedGuildMeta.name}</strong>
                <small>{selectedGuildMeta.isPrimary ? "主群組" : selectedGuildMeta.approved ? "已批准" : "待批准"}</small>
                <p>點上方伺服器圖片卡就能直接切換到這個群組的設定。</p>
              </div>
            </div>
          </section> : null}

          {showSection(sectionIds.products) && featuredProductImages.length ? <section className="card preview-panel">
            <p className="eyebrow">商品圖片牆</p>
            <div className="visual-grid">
              {featuredProductImages.map((item) => (
                <div className="visual-tile" key={item.id}>
                  <img src={item.imageUrl} alt={item.name} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </section> : null}

          {showSection(sectionIds.payment) ? <section className="card preview-panel">
            <p className="eyebrow">金流入口預覽</p>
            <div className="mini-list">
              <div className="mini-item"><strong>{paymentForm.itemName || "未填商品名稱"}</strong><span>{paymentForm.amount} ｜ {paymentForm.subPayment}</span></div>
              <div className="mini-item"><strong>{opayReady ? "歐付寶可用" : "歐付寶待設定"}</strong><span>{opayReady ? "主工作區可直接開付款頁" : "請先補齊歐付寶金鑰"}</span></div>
              <div className="mini-item"><strong>{payuniReady ? "PAYUNi 已準備" : "PAYUNi 待設定"}</strong><span>{payuniReady ? "後台 PAYUNi 入口已保留" : "請先補齊 PAYUNi Merchant / Key / IV"}</span></div>
            </div>
          </section> : null}

          {(showSection(sectionIds.partnerships) || showSection(sectionIds.applications)) && visualPartners.length ? <section className="card preview-panel">
            <p className="eyebrow">合作橫幅</p>
            <div className="partner-banner-stack">
              {visualPartners.map((item) => (
                <div className="partner-banner-card" key={item.id}>
                  <img src={item.bannerUrl} alt={item.serverName} />
                  <div className="partner-banner-overlay">
                    <strong>{item.serverName}</strong>
                    <small>{item.contact || "合作展示中"}</small>
                  </div>
                </div>
              ))}
            </div>
          </section> : null}

          {(showSection(sectionIds.reply) || showSection(sectionIds.balance) || showSection(sectionIds.overview)) && recentReviews.length ? <section className="card preview-panel">
            <p className="eyebrow">最新評價</p>
            <div className="review-wall-grid">
              {recentReviews.map((item) => (
                <div className="review-preview-card" key={item.id}>
                  {item.avatarUrl ? <img className="review-preview-avatar" src={item.avatarUrl} alt={item.username} /> : <div className="review-preview-fallback">{item.username.slice(0, 1).toUpperCase()}</div>}
                  <div className="review-preview-copy">
                    <strong>{item.username}</strong>
                    <small>{item.stars} / 5 ｜ {prettyDate(item.createdAt)}</small>
                    <p>{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section> : null}

          <section className="card preview-panel">
            <p className="eyebrow">快速備忘</p>
            <div className="faq-stack">
              {settings.faq.slice(0, 3).map((item) => (
                <div className="faq-item" key={item.id}>
                  <strong>{item.question}</strong>
                  <small>{item.answer}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <DashboardErrorBoundary>
      <DashboardApp />
    </DashboardErrorBoundary>
  );
}
