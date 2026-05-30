import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CustomerAccount, DashboardAccount, DashboardAccountRole, GuildSettings, ProductItem, StoreOrderRecord, StoreOrderStatus } from "@dc/shared";
import { ChannelType } from "discord.js";
import { getDiscordClient, handleDirectCodeOrderUpdate, handleQuickOpayOrderUpdate } from "./bot.js";
import { env } from "./config.js";
import { createDirectCode, isDirectCodeConfigured } from "./ecpay-direct.js";
import { createCvsCheckout, isOpayConfigured } from "./opay.js";
import { createId } from "./utils.js";
import {
  addGiveaway,
  adjustBalance,
  deleteBalance,
  deletePartnership,
  findBalance,
  findCustomerAccountById,
  findCustomerAccountByUsername,
  findDirectCodeOrderByMerchantTradeNo,
  findGiveaway,
  findPassOrder,
  findPartnership,
  findPartnershipApplication,
  findQuickOpayOrder,
  findQuickOpayOrderByMerchantTradeNo,
  findStoreOrder,
  findStoreOrderByMerchantTradeNo,
  getStats,
  listCustomerAccounts,
  listBalances,
  listGiveaways,
  listPassOrders,
  listPartnershipApplications,
  listPartnerships,
  listReviews,
  listStoreOrders,
  listTickets,
  loadSettings,
  savePartnership,
  savePartnershipApplication,
  saveCustomerAccount,
  saveDirectCodeOrder,
  savePassOrder,
  saveQuickOpayOrder,
  saveStoreOrder,
  saveSettings,
  setBalance,
  updatePassOrderStatus,
  updatePartnershipApplicationStatus,
  updateStoreOrder,
  updateTicket
} from "./storage.js";

type SafeDashboardAccount = {
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

type AuthenticatedDashboardAccount = SafeDashboardAccount & {
  via: "account" | "legacy" | "discord";
};

type DashboardSession = {
  token: string;
  account: AuthenticatedDashboardAccount;
  createdAt: string;
};

const activeDashboardSessions = new Map<string, DashboardSession>();
type CustomerSession = {
  token: string;
  accountId: string;
  createdAt: string;
};
const activeCustomerSessions = new Map<string, CustomerSession>();
type GoogleOauthState = {
  mode: "login" | "verify_email";
  accountId?: string;
  createdAt: string;
};
const googleOauthStates = new Map<string, GoogleOauthState>();
const DISCORD_OAUTH_STATE_COOKIE = "dc_discord_oauth_state";

const toSafeAccount = (account: DashboardAccount): SafeDashboardAccount => ({
  id: account.id,
  username: account.username,
  displayName: account.displayName?.trim() || account.username,
  role: account.role,
  enabled: account.enabled,
  authMode: account.authMode ?? "both",
  allowedGuildIds: account.allowedGuildIds?.length ? account.allowedGuildIds : ["*"],
  provider: "local",
  discordUserId: account.discordUserId
});

const toAuthenticatedAccount = (account: DashboardAccount): AuthenticatedDashboardAccount => ({
  ...toSafeAccount(account),
  via: "account"
});

const createDashboardSession = (account: DashboardAccount): DashboardSession => {
  const session: DashboardSession = {
    token: crypto.randomBytes(24).toString("hex"),
    account: toAuthenticatedAccount(account),
    createdAt: new Date().toISOString()
  };
  activeDashboardSessions.set(session.token, session);
  return session;
};

const createDiscordDashboardSession = (input: {
  accountId?: string;
  discordUserId: string;
  username: string;
  displayName: string;
  allowedGuildIds: string[];
  role?: DashboardAccountRole;
}): DashboardSession => {
  const session: DashboardSession = {
    token: crypto.randomBytes(24).toString("hex"),
    account: {
      id: input.accountId ?? `discord-${input.discordUserId}`,
      username: input.username,
      displayName: input.displayName,
      role: input.role ?? "owner",
      enabled: true,
      authMode: "discord",
      allowedGuildIds: input.allowedGuildIds,
      provider: "discord",
      discordUserId: input.discordUserId,
      via: "discord"
    },
    createdAt: new Date().toISOString()
  };
  activeDashboardSessions.set(session.token, session);
  return session;
};

const getLegacyDashboardAccount = (): AuthenticatedDashboardAccount => ({
  id: "legacy-admin-key",
  username: "legacy-admin-key",
  displayName: "舊版管理金鑰",
  role: "developer",
  enabled: true,
  authMode: "both",
  allowedGuildIds: ["*"],
  provider: "legacy",
  via: "legacy"
});

const createCustomerSession = (accountId: string): CustomerSession => {
  const session: CustomerSession = {
    token: crypto.randomBytes(24).toString("hex"),
    accountId,
    createdAt: new Date().toISOString()
  };
  activeCustomerSessions.set(session.token, session);
  return session;
};

const hasGuildAccess = (account: AuthenticatedDashboardAccount | null, guildId?: string | null) => {
  if (!account) return false;
  if (account.role === "developer" || account.allowedGuildIds.includes("*")) return true;
  if (!guildId) return false;
  return account.allowedGuildIds.includes(guildId);
};

const manageablePermissionMask =
  BigInt(0x8) | BigInt(0x20);

const findDashboardAccountByDiscordUserId = (discordUserId: string) => {
  const normalized = discordUserId.trim();
  return loadSettings().accounts.find((account) => {
    if (!account.enabled) return false;
    if (account.authMode && account.authMode !== "discord" && account.authMode !== "both") return false;
    return (account.discordUserId ?? "").trim() === normalized;
  });
};

const resolveDiscordAccountGuildScope = (account: DashboardAccount | undefined, manageableGuildIds: string[]) => {
  if (!account) return manageableGuildIds;
  const configuredGuildIds = account.allowedGuildIds?.length ? account.allowedGuildIds : ["*"];
  if (configuredGuildIds.includes("*")) return manageableGuildIds;
  return configuredGuildIds.filter((guildId) => manageableGuildIds.includes(guildId));
};

const normalizeAccountName = (value: string) => value.trim().toLowerCase();

const isStoreUsernameTaken = (username: string) => {
  const normalized = normalizeAccountName(username);
  const settings = loadSettings();
  return (
    settings.accounts.some((item) => normalizeAccountName(item.username) === normalized) ||
    listCustomerAccounts().some((item) => normalizeAccountName(item.username) === normalized)
  );
};

const sanitizeCustomerAccount = (account: CustomerAccount) => ({
  id: account.id,
  username: account.username,
  displayName: account.displayName,
  email: account.email,
  phone: account.phone,
  provider: account.provider,
  role: account.role,
  enabled: account.enabled,
  emailVerified: account.emailVerified,
  phoneVerified: account.phoneVerified,
  createdAt: account.createdAt
});

const resolveCustomerAccount = (req: express.Request) => {
  const token = req.header("x-storefront-token")?.trim();
  if (!token) return null;
  const session = activeCustomerSessions.get(token);
  if (!session) return null;
  const account = findCustomerAccountById(session.accountId);
  if (!account || !account.enabled) return null;
  return account;
};

const parsePriceLabel = (value: string) => {
  const numeric = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const isGoogleOAuthConfigured = () =>
  Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUrl);

const isPayuniConfigured = () =>
  Boolean(env.payuniMerchantId && env.payuniHashKey && env.payuniHashIv && env.payuniNotifyUrl && env.payuniReturnUrl);

const getStorefrontBaseUrl = (req: express.Request) => `${req.protocol}://${req.get("host")}`;
const createVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));
const isVerificationCodeExpired = (expiresAt?: string) => !expiresAt || new Date(expiresAt).getTime() < Date.now();
const getRequestedDashboardGuildId = (req: express.Request) =>
  req.header("x-dashboard-guild-id")?.trim() || (typeof req.query.guildId === "string" ? req.query.guildId.trim() : "");

const parseCookies = (header?: string) =>
  Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        if (index < 0) return [item, ""];
        return [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1).trim())];
      })
  ) as Record<string, string>;

const buildDiscordOauthStateCookie = (state: string, secure: boolean) =>
  `${DISCORD_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/api/auth/discord/callback; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=600`;

const clearDiscordOauthStateCookie = (secure: boolean) =>
  `${DISCORD_OAUTH_STATE_COOKIE}=; Path=/api/auth/discord/callback; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=0`;

export const createApiServer = () => {
  const app = express();
  app.set("trust proxy", 1);
  const apiCors = cors({
    origin(origin, callback) {
      if (!origin || env.webOrigins.includes(origin) || env.isPrivateHttpOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    }
  });
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    return apiCors(req, res, next);
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  const publicApiPaths = new Set([
    "GET:/api/health",
    "POST:/api/auth/login",
    "GET:/api/auth/discord/start",
    "GET:/api/auth/discord/callback",
    "GET:/api/quick-opay/orders/:id",
    "POST:/api/quick-opay/checkout",
    "POST:/api/ecpay/direct/return",
    "POST:/api/opay/payment-info",
    "POST:/api/opay/return"
  ]);

  const resolveDashboardAuth = (req: express.Request): AuthenticatedDashboardAccount | null => {
    const token = req.header("x-dashboard-token")?.trim();
    if (token) {
      const session = activeDashboardSessions.get(token);
      if (session) {
        return session.account;
      }
    }

    const key = req.header("x-admin-key")?.trim();
    if (key && key === loadSettings().adminKey) {
      return getLegacyDashboardAccount();
    }

    return null;
  };

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/api/storefront")) return next();
    if (req.path.startsWith("/api/quick-opay")) return next();
    if (publicApiPaths.has(`${req.method}:${req.path}`)) return next();
    const account = resolveDashboardAuth(req);
    if (!account) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    res.locals.dashboardAccount = account;
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/storefront/public", (_req, res) => {
    const settings = loadSettings();
    return res.json({
      brand: settings.brand,
      storefront: {
        ...settings.storefront,
        googleLoginConfigured: isGoogleOAuthConfigured()
      },
      googleOAuthConfigured: isGoogleOAuthConfigured(),
      faq: settings.faq,
      products: settings.ticket.products.filter((item) => item.enabled),
      reviews: listReviews().slice(0, 6)
    });
  });

  app.post("/api/storefront/register", (req, res) => {
    const { provider, username, password, displayName, email, phone } = req.body as {
      provider?: "local" | "google";
      username?: string;
      password?: string;
      displayName?: string;
      email?: string;
      phone?: string;
    };

    if (provider === "google") {
      return res.status(400).json({ message: "Google 登入需要之後接入正式 OAuth 憑證，這版先完成自有帳號註冊。" });
    }

    const normalizedUsername = username?.trim() ?? "";
    const normalizedPassword = password?.trim() ?? "";
    const normalizedDisplayName = displayName?.trim() ?? "";
    const normalizedEmail = email?.trim() ?? "";
    const normalizedPhone = phone?.trim() ?? "";

    if (!normalizedUsername || !normalizedPassword || !normalizedDisplayName || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({ message: "username, password, displayName, email and phone are required" });
    }

    if (isStoreUsernameTaken(normalizedUsername)) {
      return res.status(409).json({ message: "這個帳號名稱已經被註冊過了，請換一個名稱" });
    }

    const account = saveCustomerAccount({
      id: `customer-${Date.now()}`,
      username: normalizedUsername,
      password: normalizedPassword,
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      phone: normalizedPhone,
      provider: "local",
      role: "customer",
      enabled: true,
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date().toISOString()
    });
    const session = createCustomerSession(account.id);
    return res.json({
      ok: true,
      token: session.token,
      account: sanitizeCustomerAccount(account)
    });
  });

  app.get("/api/storefront/google/start", (req, res) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(400).json({ message: "Google OAuth 尚未設定 Client ID / Secret / Redirect URL" });
    }
    const state = crypto.randomBytes(16).toString("hex");
    googleOauthStates.set(state, { mode: "login", createdAt: new Date().toISOString() });
    const redirectUri = encodeURIComponent(env.googleRedirectUrl);
    const scope = encodeURIComponent("openid email profile");
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.googleClientId)}` +
      `&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=online&prompt=select_account`;
    return res.json({ ok: true, url });
  });

  app.get("/api/storefront/google/verify/start", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    if (!isGoogleOAuthConfigured()) {
      return res.status(400).json({ message: "Google OAuth 尚未設定 Client ID / Secret / Redirect URL" });
    }
    const state = crypto.randomBytes(16).toString("hex");
    googleOauthStates.set(state, {
      mode: "verify_email",
      accountId: account.id,
      createdAt: new Date().toISOString()
    });
    const redirectUri = encodeURIComponent(env.googleRedirectUrl);
    const scope = encodeURIComponent("openid email profile");
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.googleClientId)}` +
      `&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=online&prompt=select_account`;
    return res.json({ ok: true, url });
  });

  app.get("/api/storefront/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!isGoogleOAuthConfigured()) {
      return res.status(400).send("Google OAuth 尚未設定完成。");
    }
    const oauthState = googleOauthStates.get(state);
    if (!code || !state || !oauthState) {
      return res.status(400).send("Google OAuth 回呼驗證失敗。");
    }
    googleOauthStates.delete(state);

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: env.googleRedirectUrl,
          grant_type: "authorization_code"
        }).toString()
      });

      if (!tokenResponse.ok) {
        return res.status(400).send("無法向 Google 取得登入權杖。");
      }

      const tokenJson = await tokenResponse.json() as { access_token?: string };
      if (!tokenJson.access_token) {
        return res.status(400).send("Google 沒有回傳 access_token。");
      }

      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` }
      });
      if (!profileResponse.ok) {
        return res.status(400).send("無法取得 Google 使用者資料。");
      }

      const profile = await profileResponse.json() as {
        id?: string;
        email?: string;
        name?: string;
      };

      if (!profile.id || !profile.email) {
        return res.status(400).send("Google 使用者資料不完整。");
      }

      const usernameBase = (profile.email.split("@")[0] || "google-user").replace(/[^a-zA-Z0-9._-]/g, "");
      let username = usernameBase;
      let attempt = 1;
      while (isStoreUsernameTaken(username)) {
        const existing = listCustomerAccounts().find((item) => item.provider === "google" && item.email === profile.email);
        if (existing) {
          username = existing.username;
          break;
        }
        username = `${usernameBase}${attempt}`;
        attempt += 1;
      }

      if (oauthState.mode === "verify_email") {
        const currentAccount = oauthState.accountId ? findCustomerAccountById(oauthState.accountId) : null;
        if (!currentAccount) {
          return res.status(404).send("找不到要綁定驗證的商城帳號。");
        }

        saveCustomerAccount({
          ...currentAccount,
          email: profile.email,
          emailVerified: true,
          emailVerificationCode: undefined,
          emailVerificationExpiresAt: undefined
        });

        const storefrontUrl = `${getStorefrontBaseUrl(req)}/shop#google-verify-success`;
        return res.send(`
          <!doctype html>
          <html lang="zh-Hant">
            <body style="font-family:sans-serif;background:#08111f;color:white;display:grid;place-items:center;min-height:100vh;">
              <script>
                window.location.href = "${storefrontUrl}";
              </script>
              <p>Gmail 驗證成功，正在返回商城...</p>
            </body>
          </html>
        `);
      }

      let account = listCustomerAccounts().find((item) => item.provider === "google" && item.email === profile.email);
      if (!account) {
        account = saveCustomerAccount({
          id: `customer-google-${profile.id}`,
          username,
          password: "",
          displayName: profile.name?.trim() || username,
          email: profile.email,
          phone: "",
          provider: "google",
          role: "customer",
          enabled: true,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date().toISOString()
        });
      }

      const session = createCustomerSession(account.id);
      const storefrontUrl = `${getStorefrontBaseUrl(req)}/shop#google-login-success`;
      return res.send(`
        <!doctype html>
        <html lang="zh-Hant">
          <body style="font-family:sans-serif;background:#08111f;color:white;display:grid;place-items:center;min-height:100vh;">
            <script>
              localStorage.setItem("dc_storefront_token", "${session.token}");
              window.location.href = "${storefrontUrl}";
            </script>
            <p>Google 登入成功，正在返回商城...</p>
          </body>
        </html>
      `);
    } catch {
      return res.status(500).send("Google OAuth 登入處理失敗。");
    }
  });

  app.post("/api/storefront/login", (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const account = findCustomerAccountByUsername(username?.trim() ?? "");
    if (!account || !account.enabled || account.provider !== "local" || account.password !== (password?.trim() ?? "")) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }
    const session = createCustomerSession(account.id);
    return res.json({
      ok: true,
      token: session.token,
      account: sanitizeCustomerAccount(account)
    });
  });

  app.get("/api/storefront/session", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    return res.json({ ok: true, account: sanitizeCustomerAccount(account) });
  });

  app.post("/api/storefront/profile", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }

    const { displayName, email, phone } = req.body as {
      displayName?: string;
      email?: string;
      phone?: string;
    };

    const nextDisplayName = displayName?.trim() || account.displayName;
    const nextEmail = email?.trim() || account.email;
    const nextPhone = phone?.trim() || account.phone;
    const emailChanged = nextEmail !== account.email;
    const phoneChanged = nextPhone !== account.phone;

    const updated = saveCustomerAccount({
      ...account,
      displayName: nextDisplayName,
      email: nextEmail,
      phone: nextPhone,
      emailVerified: emailChanged ? false : account.emailVerified,
      phoneVerified: phoneChanged ? false : account.phoneVerified,
      emailVerificationCode: emailChanged ? undefined : account.emailVerificationCode,
      emailVerificationExpiresAt: emailChanged ? undefined : account.emailVerificationExpiresAt,
      phoneVerificationCode: phoneChanged ? undefined : account.phoneVerificationCode,
      phoneVerificationExpiresAt: phoneChanged ? undefined : account.phoneVerificationExpiresAt
    });

    return res.json({
      ok: true,
      message: "會員資料已更新",
      account: sanitizeCustomerAccount(updated)
    });
  });

  app.post("/api/storefront/verify/phone/send", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    if (!account.phone.trim()) {
      return res.status(400).json({ message: "請先在註冊時填入電話，或之後補上電話號碼再驗證" });
    }

    const code = createVerificationCode();
    saveCustomerAccount({
      ...account,
      phoneVerificationCode: code,
      phoneVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    return res.json({
      ok: true,
      message: "手機驗證碼已建立。若你之後接了簡訊商，就可以把這段改成真實發送。",
      previewCode: code
    });
  });

  app.post("/api/storefront/verify/phone/confirm", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }

    const code = String((req.body as { code?: string }).code ?? "").trim();
    if (!code) {
      return res.status(400).json({ message: "請輸入手機驗證碼" });
    }
    if (!account.phoneVerificationCode || account.phoneVerificationCode !== code) {
      return res.status(400).json({ message: "手機驗證碼錯誤" });
    }
    if (isVerificationCodeExpired(account.phoneVerificationExpiresAt)) {
      return res.status(400).json({ message: "手機驗證碼已過期，請重新發送" });
    }

    const updated = saveCustomerAccount({
      ...account,
      phoneVerified: true,
      phoneVerificationCode: undefined,
      phoneVerificationExpiresAt: undefined
    });

    return res.json({
      ok: true,
      message: "手機驗證成功",
      account: sanitizeCustomerAccount(updated)
    });
  });

  app.post("/api/storefront/logout", (req, res) => {
    const token = req.header("x-storefront-token")?.trim();
    if (token) {
      activeCustomerSessions.delete(token);
    }
    return res.json({ ok: true });
  });

  app.get("/api/storefront/orders", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    return res.json(listStoreOrders().filter((item) => item.customerId === account.id));
  });

  app.post("/api/storefront/orders/:id/opay-checkout", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    const order = findStoreOrder(req.params.id);
    if (!order || order.customerId !== account.id) {
      return res.status(404).json({ message: "找不到這筆商城訂單" });
    }
    if (order.paymentMethodId !== "payment-cvs" && !order.paymentMethodLabel.includes("超商")) {
      return res.status(400).json({ message: "這筆訂單不是超商代碼付款方式" });
    }
    try {
      const merchantTradeNo = order.opayMerchantTradeNo || `ST${Date.now()}`.slice(0, 20);
      const checkout = createCvsCheckout({
        amount: order.totalAmount,
        itemName: order.items.map((item) => item.name).join("#").slice(0, 100),
        tradeDesc: `商城訂單 ${order.id}`.slice(0, 200),
        merchantTradeNo,
        clientBackUrl: `${getStorefrontBaseUrl(req)}/shop#orders`
      });
      saveStoreOrder({
        ...order,
        opayMerchantTradeNo: merchantTradeNo,
        updatedAt: new Date().toISOString()
      });
      return res.json(checkout);
    } catch (error) {
      if (error instanceof Error && error.message === "OPAY_NOT_CONFIGURED") {
        return res.status(400).json({ message: "O'Pay environment variables are not configured" });
      }
      return res.status(500).json({ message: "Failed to create storefront O'Pay checkout" });
    }
  });

  app.post("/api/storefront/orders/:id/direct-code", async (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    const order = findStoreOrder(req.params.id);
    if (!order || order.customerId !== account.id) {
      return res.status(404).json({ message: "找不到這筆商城訂單" });
    }
    if (order.paymentMethodId !== "payment-cvs-direct") {
      return res.status(400).json({ message: "這筆訂單不是直出超商代碼付款方式" });
    }
    if (!isDirectCodeConfigured()) {
      return res.status(400).json({ message: "直出超商代碼模組尚未設定完成" });
    }

    try {
      const merchantTradeNo = order.opayMerchantTradeNo || `SD${Date.now()}`.slice(0, 20);
      const result = await createDirectCode({
        amount: order.totalAmount,
        itemName: order.items.map((item) => item.name).join("#").slice(0, 100),
        tradeDesc: `商城訂單 ${order.id}`.slice(0, 200),
        buyerName: order.customerDisplayName,
        merchantTradeNo,
        subPayment: "CVS"
      });

      const nextOrder = saveStoreOrder({
        ...order,
        opayMerchantTradeNo: merchantTradeNo,
        opayTradeNo: result.providerTradeNo,
        opayPaymentCode: result.paymentCode,
        opayExpireAt: result.expireAt,
        status: "payment_code_ready",
        updatedAt: new Date().toISOString(),
        messages: [
          ...(order.messages ?? []),
          {
            id: `msg-direct-${Date.now()}`,
            senderType: "system",
            senderName: "商城系統",
            message: `PAYUNi 直出超商代碼已建立：${result.paymentCode}${result.expireAt ? `，期限 ${result.expireAt}` : ""}`,
            createdAt: new Date().toISOString()
          }
        ]
      });

      return res.json(nextOrder);
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "建立直出超商代碼失敗" });
    }
  });

  app.post("/api/storefront/orders", async (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }

    const { items, paymentMethodId, deliveryAccount, contact, note } = req.body as {
      items?: Array<{ productId: string; quantity: number }>;
      paymentMethodId?: string;
      deliveryAccount?: string;
      contact?: string;
      note?: string;
    };

    const settings = loadSettings();
    const paymentMethod = settings.storefront.paymentMethods.find((item) => item.id === paymentMethodId && item.enabled);
    if (!paymentMethod) {
      return res.status(400).json({ message: "請選擇有效的付款方式" });
    }

    if (!items?.length) {
      return res.status(400).json({ message: "購物車目前是空的" });
    }

    const normalizedItems = items
      .map((entry) => {
        const product = settings.ticket.products.find((item) => item.id === entry.productId && item.enabled);
        if (!product) return null;
        const quantity = Math.max(1, Number(entry.quantity) || 1);
        const unitPrice = parsePriceLabel(product.priceLabel);
        return {
          productId: product.id,
          name: product.name,
          category: product.category,
          quantity,
          priceLabel: product.priceLabel,
          unitPrice,
          subtotal: unitPrice * quantity
        };
      })
      .filter(Boolean);

    if (!normalizedItems.length) {
      return res.status(400).json({ message: "購物車商品無效，請重新加入商品" });
    }

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item!.subtotal, 0);
    const now = new Date().toISOString();
    let order: StoreOrderRecord = {
      id: `store-order-${Date.now()}`,
      customerId: account.id,
      customerUsername: account.username,
      customerDisplayName: account.displayName,
      items: normalizedItems as StoreOrderRecord["items"],
      paymentMethodId: paymentMethod.id,
      paymentMethodLabel: paymentMethod.label,
      totalAmount,
      deliveryAccount: deliveryAccount?.trim() ?? "",
      contact: contact?.trim() ?? "",
      note: note?.trim() ?? "",
      status: "pending_payment",
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderType: "system",
          senderName: "商城系統",
          message: "訂單已建立，請留意後台回覆與付款進度。",
          createdAt: now
        },
        ...(note?.trim()
          ? [{
              id: `msg-note-${Date.now()}`,
              senderType: "customer" as const,
              senderName: account.displayName,
              message: note.trim(),
              createdAt: now
            }]
          : [])
      ],
      createdAt: now,
      updatedAt: now
    };

    const client = getDiscordClient();
    if (client?.isReady()) {
      const { sendStorefrontOrderNotification } = await import("./bot.js");
      await sendStorefrontOrderNotification(client, order).catch(() => null);
    }

    order = saveStoreOrder(order);
    return res.json(order);
  });

  app.get("/api/storefront/admin/orders", (_req, res) => {
    const dashboardAccount = resolveDashboardAuth(_req);
    if (!dashboardAccount) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    return res.json(listStoreOrders());
  });

  app.post("/api/storefront/orders/:id/messages", (req, res) => {
    const account = resolveCustomerAccount(req);
    if (!account) {
      return res.status(401).json({ message: "請先登入商城帳號" });
    }
    const current = findStoreOrder(req.params.id);
    if (!current || current.customerId !== account.id) {
      return res.status(404).json({ message: "找不到這筆訂單" });
    }
    const message = String((req.body as { message?: string }).message ?? "").trim();
    if (!message) {
      return res.status(400).json({ message: "請先輸入要傳送的訊息" });
    }
    const now = new Date().toISOString();
    const next = saveStoreOrder({
      ...current,
      messages: [
        ...(current.messages ?? []),
        {
          id: `msg-${Date.now()}`,
          senderType: "customer",
          senderName: account.displayName,
          message,
          createdAt: now
        }
      ],
      updatedAt: now
    });
    return res.json(next);
  });

  app.post("/api/storefront/admin/orders/:id/status", (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    if (!dashboardAccount) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    const current = listStoreOrders().find((item) => item.id === req.params.id);
    if (!current) {
      return res.status(404).json({ message: "Store order not found" });
    }
    const { status } = req.body as { status?: StoreOrderStatus };
    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }
    const next = saveStoreOrder({
      ...current,
      status,
      updatedAt: new Date().toISOString()
    });
    return res.json(next);
  });

  app.post("/api/storefront/admin/orders/:id/messages", (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    if (!dashboardAccount) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    const current = findStoreOrder(req.params.id);
    if (!current) {
      return res.status(404).json({ message: "Store order not found" });
    }
    const message = String((req.body as { message?: string }).message ?? "").trim();
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }
    const now = new Date().toISOString();
    const next = saveStoreOrder({
      ...current,
      messages: [
        ...(current.messages ?? []),
        {
          id: `msg-${Date.now()}`,
          senderType: "staff",
          senderName: dashboardAccount.displayName || dashboardAccount.username,
          message,
          createdAt: now
        }
      ],
      updatedAt: now
    });
    return res.json(next);
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const normalizedUsername = username?.trim();
    const normalizedPassword = password?.trim();

    if (!normalizedUsername || !normalizedPassword) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const account = loadSettings().accounts.find(
      (item) =>
        item.enabled &&
        item.username === normalizedUsername &&
        item.password === normalizedPassword &&
        (item.authMode === "local" || item.authMode === "both" || !item.authMode)
    );

    if (!account) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const session = createDashboardSession(account);
    return res.json({
      ok: true,
      token: session.token,
      account: toSafeAccount(account)
    });
  });

  app.get("/api/auth/discord/start", (_req, res) => {
    if (!env.clientId || !env.discordClientSecret || !env.discordOauthRedirectUrl) {
      const missing = [
        !env.clientId ? "DISCORD_CLIENT_ID" : "",
        !env.discordClientSecret ? "DISCORD_CLIENT_SECRET" : "",
        !env.discordOauthRedirectUrl ? "DISCORD_OAUTH_REDIRECT_URL" : ""
      ].filter(Boolean);
      return res.status(400).json({ message: `Discord OAuth 尚未設定：${missing.join("、")}` });
    }
    const state = crypto.randomBytes(16).toString("hex");
    const secureCookie = Boolean(((_req.headers["x-forwarded-proto"] as string | undefined) ?? "").split(",")[0]?.trim() === "https" || _req.secure);
    res.setHeader("Set-Cookie", buildDiscordOauthStateCookie(state, secureCookie));
    const scope = encodeURIComponent("identify guilds");
    const redirectUri = encodeURIComponent(env.discordOauthRedirectUrl);
    const url =
      `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(env.clientId)}` +
      `&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&prompt=consent`;
    return res.json({ ok: true, url });
  });

  app.get("/api/auth/discord/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookies = parseCookies(req.headers.cookie);
    const cookieState = cookies[DISCORD_OAUTH_STATE_COOKIE] ?? "";
    const secureCookie = Boolean(((req.headers["x-forwarded-proto"] as string | undefined) ?? "").split(",")[0]?.trim() === "https" || req.secure);
    if (!code || !state || !cookieState || cookieState !== state) {
      res.setHeader("Set-Cookie", clearDiscordOauthStateCookie(secureCookie));
      return res.status(400).send("Discord 登入驗證失敗。");
    }
    res.setHeader("Set-Cookie", clearDiscordOauthStateCookie(secureCookie));

    try {
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.clientId,
          client_secret: env.discordClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: env.discordOauthRedirectUrl
        }).toString()
      });

      if (!tokenResponse.ok) {
        return res.status(400).send("無法向 Discord 取得登入權杖。");
      }

      const tokenJson = await tokenResponse.json() as { access_token?: string };
      if (!tokenJson.access_token) {
        return res.status(400).send("Discord 沒有回傳 access_token。");
      }

      const [userResponse, guildsResponse] = await Promise.all([
        fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` }
        }),
        fetch("https://discord.com/api/users/@me/guilds", {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` }
        })
      ]);

      if (!userResponse.ok || !guildsResponse.ok) {
        return res.status(400).send("無法從 Discord 取得使用者或伺服器資料。");
      }

      const user = await userResponse.json() as { id: string; username: string; global_name?: string };
      const guilds = await guildsResponse.json() as Array<{ id: string; owner?: boolean; permissions?: string }>;
      const manageableGuildIds = guilds
        .filter((guild) => {
          const permissions = guild.permissions ? BigInt(guild.permissions) : BigInt(0);
          return Boolean(guild.owner) || (permissions & manageablePermissionMask) !== BigInt(0);
        })
        .map((guild) => guild.id);

      if (manageableGuildIds.length === 0) {
        return res.status(403).send("你的 Discord 帳號目前沒有任何可管理的商城伺服器。");
      }

      const matchedAccount = findDashboardAccountByDiscordUserId(user.id);
      const scopedGuildIds = resolveDiscordAccountGuildScope(matchedAccount, manageableGuildIds);
      if (scopedGuildIds.length === 0) {
        return res.status(403).send("這個 Discord 帳號已綁定商城後台，但目前沒有可管理的商城範圍。");
      }

      const session = createDiscordDashboardSession({
        accountId: matchedAccount?.id,
        discordUserId: user.id,
        username: matchedAccount?.username?.trim() || user.username,
        displayName: matchedAccount?.displayName?.trim() || user.global_name?.trim() || user.username,
        allowedGuildIds: scopedGuildIds,
        role: matchedAccount?.role
      });

      const redirectTarget = `${getStorefrontBaseUrl(req)}/#discord-dashboard-login`;
      return res.send(`
        <!doctype html>
        <html lang="zh-Hant">
          <body style="font-family:sans-serif;background:#08111f;color:white;display:grid;place-items:center;min-height:100vh;">
            <script>
              localStorage.setItem("dc_dashboard_token", "${session.token}");
              localStorage.setItem("dc_dashboard_account", ${JSON.stringify(JSON.stringify(session.account))});
              window.location.href = "${redirectTarget}";
            </script>
            <p>Discord 登入成功，正在返回後台...</p>
          </body>
        </html>
      `);
    } catch {
      return res.status(500).send("Discord OAuth 登入處理失敗。");
    }
  });

  app.get("/api/auth/session", (req, res) => {
    const account = resolveDashboardAuth(req);
    if (!account) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    return res.json({
      ok: true,
      account,
      legacy: account.via === "legacy"
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.header("x-dashboard-token")?.trim();
    if (token) {
      activeDashboardSessions.delete(token);
    }
    return res.json({ ok: true });
  });

  app.get("/api/settings", (req, res) => {
    const account = resolveDashboardAuth(req);
    const settings = loadSettings();
    if (!account) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }

    const allowedGuildIds = account.allowedGuildIds.includes("*")
      ? [settings.guildId, ...settings.linkedGuilds.map((item) => item.guildId).filter(Boolean)]
      : account.allowedGuildIds;

    res.json({
      ...settings,
      linkedGuilds: settings.linkedGuilds.filter((item) => allowedGuildIds.includes(item.guildId)),
      accounts: account.role === "developer" || account.role === "owner" ? settings.accounts : settings.accounts.filter((item) => item.id === account.id)
    });
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const dashboardAccount = resolveDashboardAuth(req);
      if (!dashboardAccount) {
        return res.status(401).json({ message: "Unauthorized dashboard access" });
      }
      const current = loadSettings();
      const incoming = req.body as Partial<GuildSettings>;

      if (dashboardAccount.role !== "developer" && dashboardAccount.role !== "owner") {
        incoming.accounts = current.accounts;
        incoming.adminKey = current.adminKey;
      }

      const nextSettings: GuildSettings = {
        ...current,
        ...incoming,
        linkedGuilds: Array.isArray(incoming.linkedGuilds) ? incoming.linkedGuilds : current.linkedGuilds,
        accounts: Array.isArray(incoming.accounts) ? incoming.accounts : current.accounts,
        storefront: {
          ...current.storefront,
          ...incoming.storefront,
          paymentMethods: Array.isArray(incoming.storefront?.paymentMethods) ? incoming.storefront.paymentMethods : current.storefront.paymentMethods
        },
        brand: { ...current.brand, ...incoming.brand },
        moderation: { ...current.moderation, ...incoming.moderation },
        review: { ...current.review, ...incoming.review },
        ticket: {
          ...current.ticket,
          ...incoming.ticket,
          categories: incoming.ticket?.categories ?? current.ticket.categories,
          products: incoming.ticket?.products ?? current.ticket.products,
          blacklist: incoming.ticket?.blacklist ?? current.ticket.blacklist
        },
        autoReplies: Array.isArray(incoming.autoReplies) ? incoming.autoReplies : current.autoReplies,
        faq: Array.isArray(incoming.faq) ? incoming.faq : current.faq
      };

      const currentProductsById = new Map(current.ticket.products.map((item) => [item.id, item]));
      const productsToAnnounce = nextSettings.ticket.products.filter((item) => {
        if (!item.enabled || !item.name.trim()) return false;
        const previous = currentProductsById.get(item.id);
        return !previous || !previous.enabled;
      });

      saveSettings(nextSettings);

      if (productsToAnnounce.length > 0 && nextSettings.storefront.productAnnouncementChannelId) {
        const client = getDiscordClient();
        if (client?.isReady()) {
          const { sendProductAnnouncement } = await import("./bot.js");
          await Promise.all(productsToAnnounce.map((product: ProductItem) => sendProductAnnouncement(client, product).catch(() => false)));
        }
      }

      const allowedGuildIds = dashboardAccount.allowedGuildIds.includes("*")
        ? [nextSettings.guildId, ...nextSettings.linkedGuilds.map((item) => item.guildId).filter(Boolean)]
        : dashboardAccount.allowedGuildIds;

      return res.json({
        ...nextSettings,
        linkedGuilds: nextSettings.linkedGuilds.filter((item) => allowedGuildIds.includes(item.guildId)),
        accounts: dashboardAccount.role === "developer" || dashboardAccount.role === "owner" ? nextSettings.accounts : nextSettings.accounts.filter((item) => item.id === dashboardAccount.id)
      });
    } catch (error) {
      console.error("[api/settings] failed", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "儲存設定失敗" });
    }
  });

  app.get("/api/bot/guilds", async (req, res) => {
    const client = getDiscordClient();
    const settings = loadSettings();
    const dashboardAccount = resolveDashboardAuth(req);
    if (!dashboardAccount) {
      return res.status(401).json({ message: "Unauthorized dashboard access" });
    }
    if (!client?.isReady()) {
      return res.json({
        ready: false,
        guilds: []
      });
    }

    const guilds = await client.guilds.fetch();
    const items = await Promise.all(
      [...guilds.values()].map(async (item) => {
        const guild = await item.fetch().catch(() => null);
        if (!guild) return null;
        const linked = guild.id === settings.guildId ? null : settings.linkedGuilds.find((entry) => entry.guildId === guild.id);
        if (!hasGuildAccess(dashboardAccount, guild.id)) return null;
        return {
          id: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL(),
          memberCount: guild.memberCount,
          approved: guild.id === settings.guildId || Boolean(linked?.enabled),
          isPrimary: guild.id === settings.guildId,
          label: linked?.label ?? guild.name
        };
      })
    );

    return res.json({
      ready: true,
      guilds: items.filter(Boolean)
    });
  });

  app.get("/api/bot/guilds/:id/channels", async (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    if (!hasGuildAccess(dashboardAccount, req.params.id)) {
      return res.status(403).json({ message: "你沒有權限查看這個商城伺服器" });
    }
    const client = getDiscordClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Discord bot is not ready" });
    }
    const guild = await client.guilds.fetch(req.params.id).catch(() => null);
    if (!guild) {
      return res.status(404).json({ message: "Guild not found" });
    }
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    return res.json({
      channels: [...channels.values()]
        .filter(Boolean)
        .map((channel) => ({
          id: channel!.id,
          name: channel!.name,
          type: channel!.type
        }))
        .filter((item) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildCategory].includes(item.type)),
      roles: [...roles.values()]
        .filter((role) => role && !role.managed)
        .map((role) => ({ id: role!.id, name: role!.name }))
    });
  });

  app.post("/api/bot/guilds/:id/approval", (req, res) => {
    try {
      const dashboardAccount = resolveDashboardAuth(req);
      if (!dashboardAccount) {
        return res.status(401).json({ message: "Unauthorized dashboard access" });
      }
      const { approved } = req.body as { approved?: boolean };
      const current = loadSettings();
      if (req.params.id === current.guildId) {
        return res.status(400).json({ message: "Primary guild is always enabled" });
      }
      if (!hasGuildAccess(dashboardAccount, req.params.id)) {
        return res.status(403).json({ message: "You do not have access to this guild" });
      }
      const nextSettings = {
        ...current,
        linkedGuilds: current.linkedGuilds.map((item) =>
          item.guildId === req.params.id ? { ...item, enabled: approved === true } : item
        )
      };
      saveSettings(nextSettings);
      return res.json({ ok: true, linkedGuilds: nextSettings.linkedGuilds });
    } catch (error) {
      console.error("[api/bot/guilds/:id/approval] failed", error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "批准群組失敗" });
    }
  });

  app.post("/api/bot/messages", async (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    const client = getDiscordClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Discord bot is not ready" });
    }
    const { guildId, channelId, content } = req.body as { guildId?: string; channelId?: string; content?: string };
    if (!guildId || !channelId || !content?.trim()) {
      return res.status(400).json({ message: "guildId, channelId and content are required" });
    }
    if (!hasGuildAccess(dashboardAccount, guildId)) {
      return res.status(403).json({ message: "你沒有權限發送到這個商城伺服器" });
    }
    const settings = loadSettings();
    const approved = guildId === settings.guildId || settings.linkedGuilds.some((item) => item.guildId === guildId && item.enabled);
    if (!approved) {
      return res.status(403).json({ message: "This guild is not approved yet" });
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isSendable()) {
      return res.status(400).json({ message: "Target channel is not sendable" });
    }
    const message = await channel.send({ content });
    return res.json({ ok: true, messageId: message.id });
  });

  app.get("/api/stats", (_req, res) => {
    res.json(getStats());
  });

  app.get("/api/reviews", (_req, res) => {
    res.json(listReviews());
  });

  app.get("/api/tickets", (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    const requestedGuildId = getRequestedDashboardGuildId(req);
    const items = listTickets().filter((item) => hasGuildAccess(dashboardAccount, item.guildId) && (!requestedGuildId || item.guildId === requestedGuildId));
    res.json(items);
  });

  app.get("/api/giveaways", (req, res) => {
    const dashboardAccount = resolveDashboardAuth(req);
    const requestedGuildId = getRequestedDashboardGuildId(req);
    const items = listGiveaways().filter((item) => hasGuildAccess(dashboardAccount, item.guildId) && (!requestedGuildId || item.guildId === requestedGuildId));
    res.json(items);
  });

  app.post("/api/giveaways", async (req, res) => {
    const client = getDiscordClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Discord bot is not ready" });
    }
    const { guildId, channelId, prize, minutes, winnersCount } = req.body as {
      guildId?: string;
      channelId?: string;
      prize?: string;
      minutes?: number;
      winnersCount?: number;
    };
    if (!guildId || !channelId || !prize || !minutes || !winnersCount) {
      return res.status(400).json({ message: "guildId, channelId, prize, minutes and winnersCount are required" });
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isSendable()) {
      return res.status(400).json({ message: "Target giveaway channel is not sendable" });
    }
    const { buildGiveawayEmbed, buildGiveawayButton } = await import("./bot.js");
    const giveawayId = `giveaway-${Date.now()}`;
    const endAt = new Date(Date.now() + Math.max(1, Number(minutes)) * 60 * 1000).toISOString();
    const message = await channel.send({
      embeds: [buildGiveawayEmbed({
        id: giveawayId,
        guildId,
        channelId,
        messageId: "",
        prize,
        winnersCount: Math.max(1, Number(winnersCount)),
        endAt,
        participants: [],
        ended: false,
        winnerIds: [],
        createdBy: "dashboard"
      })],
      components: [buildGiveawayButton(giveawayId)]
    });
    const giveaway = {
      id: giveawayId,
      guildId,
      channelId,
      messageId: message.id,
      prize,
      winnersCount: Math.max(1, Number(winnersCount)),
      endAt,
      participants: [],
      ended: false,
      winnerIds: [],
      createdBy: "dashboard"
    };
    const { scheduleGiveawayEnd } = await import("./bot.js");
    addGiveaway(giveaway);
    scheduleGiveawayEnd(client, giveaway);
    return res.json(giveaway);
  });

  app.post("/api/giveaways/:id/draw", async (req, res) => {
    const client = getDiscordClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Discord bot is not ready" });
    }
    const giveaway = findGiveaway(req.params.id);
    if (!giveaway) {
      return res.status(404).json({ message: "Giveaway not found" });
    }
    const { concludeGiveaway } = await import("./bot.js");
    const next = await concludeGiveaway(client, giveaway.id, "manual_draw");
    if (!next) {
      return res.status(400).json({ message: "Giveaway could not be drawn" });
    }
    return res.json(next);
  });

  app.post("/api/giveaways/:id/close", async (req, res) => {
    const client = getDiscordClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Discord bot is not ready" });
    }
    const giveaway = findGiveaway(req.params.id);
    if (!giveaway) {
      return res.status(404).json({ message: "Giveaway not found" });
    }
    const { concludeGiveaway } = await import("./bot.js");
    const next = await concludeGiveaway(client, giveaway.id, "manual_close");
    if (!next) {
      return res.status(400).json({ message: "Giveaway could not be closed" });
    }
    return res.json(next);
  });

  app.get("/api/pass-orders", (_req, res) => {
    res.json(listPassOrders());
  });

  app.get("/api/pass-orders/:id", (req, res) => {
    const order = findPassOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Pass order not found" });
    }
    return res.json(order);
  });

  app.post("/api/pass-orders", (req, res) => {
    const {
      id,
      userId,
      username,
      guildId,
      ticketId,
      channelId,
      productId,
      productName,
      category,
      quantity,
      unitPrice,
      totalPrice,
      robloxUserId,
      robloxUsername,
      paymentMethod,
      note,
      status
    } = req.body as any;

    if (!userId || !username || !guildId || !productId || !productName || !robloxUserId || !robloxUsername) {
      return res.status(400).json({ message: "Missing required pass order fields" });
    }

    const now = new Date().toISOString();
    const order = savePassOrder({
      id: id ?? `pass-order-${Date.now()}`,
      userId,
      username,
      guildId,
      ticketId,
      channelId,
      productId,
      productName,
      category: category ?? "",
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
      totalPrice: Math.max(0, Number(totalPrice) || 0),
      robloxUserId,
      robloxUsername,
      paymentMethod: paymentMethod ?? "",
      note: note ?? "",
      status: status ?? "pending_payment",
      createdAt: now,
      updatedAt: now
    });
    return res.json(order);
  });

  app.post("/api/pass-orders/:id/status", (req, res) => {
    const { status, fulfilledBy } = req.body as any;
    const next = updatePassOrderStatus({
      id: req.params.id,
      status,
      fulfilledBy
    });
    if (!next) {
      return res.status(404).json({ message: "Pass order not found" });
    }
    return res.json(next);
  });

  app.get("/api/partnerships", (_req, res) => {
    res.json(listPartnerships());
  });

  app.put("/api/partnerships/:id", (req, res) => {
    const { serverName, description, inviteUrl, bannerUrl, contact, tags, mutualPromotion, featured, enabled, sourceApplicationId } = req.body as any;
    if (!serverName || !inviteUrl) {
      return res.status(400).json({ message: "serverName and inviteUrl are required" });
    }
    const now = new Date().toISOString();
    const existing = findPartnership(req.params.id);
    const next = savePartnership({
      id: req.params.id,
      serverName,
      description: description ?? "",
      inviteUrl,
      bannerUrl: bannerUrl ?? "",
      contact: contact ?? "",
      tags: Array.isArray(tags) ? tags : [],
      mutualPromotion: Boolean(mutualPromotion),
      featured: Boolean(featured),
      enabled: enabled !== false,
      sourceApplicationId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
    return res.json(next);
  });

  app.delete("/api/partnerships/:id", (req, res) => {
    deletePartnership(req.params.id);
    return res.json({ ok: true });
  });

  app.get("/api/partnership-applications", (_req, res) => {
    res.json(listPartnershipApplications());
  });

  app.post("/api/partnership-applications", (req, res) => {
    const { id, serverName, ownerName, ownerUserId, contact, inviteUrl, description, benefits } = req.body as any;
    if (!serverName || !ownerName || !contact || !inviteUrl || !description) {
      return res.status(400).json({ message: "serverName, ownerName, contact, inviteUrl and description are required" });
    }
    const now = new Date().toISOString();
    const application = savePartnershipApplication({
      id: id ?? `partner-app-${Date.now()}`,
      serverName,
      ownerName,
      ownerUserId: ownerUserId ?? "",
      contact,
      inviteUrl,
      description,
      benefits: benefits ?? "",
      reviewNote: "",
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    return res.json(application);
  });

  app.post("/api/partnership-applications/:id/review", (req, res) => {
    const { status, reviewNote } = req.body as { status?: "approved" | "rejected"; reviewNote?: string };
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }
    const reviewed = updatePartnershipApplicationStatus({ id: req.params.id, status, reviewNote });
    if (!reviewed) {
      return res.status(404).json({ message: "Application not found" });
    }
    return res.json(reviewed);
  });

  app.post("/api/partnership-applications/:id/approve-and-create", (req, res) => {
    const { featured, enabled, mutualPromotion, bannerUrl, tags, reviewNote } = req.body as any;
    const application = findPartnershipApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    const reviewed = updatePartnershipApplicationStatus({ id: req.params.id, status: "approved", reviewNote });
    const now = new Date().toISOString();
    const partnership = savePartnership({
      id: `partner-${Date.now()}`,
      serverName: application.serverName,
      description: application.description,
      inviteUrl: application.inviteUrl,
      bannerUrl: bannerUrl ?? "",
      contact: application.contact,
      tags: Array.isArray(tags) ? tags : [],
      mutualPromotion: Boolean(mutualPromotion),
      featured: Boolean(featured),
      enabled: enabled !== false,
      sourceApplicationId: application.id,
      createdAt: now,
      updatedAt: now
    });
    return res.json({ application: reviewed, partnership });
  });

  app.get("/api/balances", (_req, res) => {
    res.json(listBalances());
  });

  app.get("/api/balances/:userId", (req, res) => {
    const balance = findBalance(req.params.userId);
    if (!balance) {
      return res.status(404).json({ message: "Balance not found" });
    }
    return res.json(balance);
  });

  app.put("/api/balances/:userId", (req, res) => {
    const { username, balance, note } = req.body as { username?: string; balance?: number; note?: string };
    if (!username || typeof balance !== "number") {
      return res.status(400).json({ message: "username and balance are required" });
    }
    const nextBalance = setBalance({
      userId: req.params.userId,
      username,
      balance,
      note
    });
    return res.json(nextBalance);
  });

  app.post("/api/balances/:userId/adjust", (req, res) => {
    const { username, amount, note } = req.body as { username?: string; amount?: number; note?: string };
    if (!username || typeof amount !== "number") {
      return res.status(400).json({ message: "username and amount are required" });
    }
    const nextBalance = adjustBalance({
      userId: req.params.userId,
      username,
      amount,
      note
    });
    return res.json(nextBalance);
  });

  app.delete("/api/balances/:userId", (req, res) => {
    deleteBalance(req.params.userId);
    return res.json({ ok: true });
  });

  app.post("/api/tickets/:id/close", (req, res) => {
    const settings = loadSettings();
    if (!settings.ticket.allowDashboardClose) {
      return res.status(403).json({ message: "Dashboard close is disabled" });
    }

    const ticketId = req.params.id;
    const ticket = listTickets().find((item) => item.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    updateTicket(ticketId, (current) => ({
      ...current,
      status: current.status === "completed" ? current.status : "closed",
      closedAt: new Date().toISOString()
    }));

    return res.json({ ok: true });
  });

  app.get("/api/opay/status", (_req, res) => {
    res.json({ configured: isOpayConfigured(), stage: env.opayStage });
  });

  app.get("/api/payuni/status", (_req, res) => {
    res.json({ configured: isPayuniConfigured(), stage: env.payuniStage });
  });

  app.post("/api/opay/payment-info", (req, res) => {
    console.log("O'Pay payment info callback:", req.body);
    const merchantTradeNo = String(req.body?.MerchantTradeNo ?? "");
    if (merchantTradeNo) {
      const order = findStoreOrderByMerchantTradeNo(merchantTradeNo);
      if (order) {
        saveStoreOrder({
          ...order,
          status: "payment_code_ready",
          opayPaymentCode: String(req.body?.PaymentNo ?? req.body?.CodeNo ?? ""),
          opayExpireAt: String(req.body?.ExpireDate ?? ""),
          updatedAt: new Date().toISOString()
        });
      }

      const quickOrder = findQuickOpayOrderByMerchantTradeNo(merchantTradeNo);
      if (quickOrder) {
        const nextQuickOrder = saveQuickOpayOrder({
          ...quickOrder,
          status: "payment_code_ready",
          opayPaymentCode: String(req.body?.PaymentNo ?? req.body?.CodeNo ?? ""),
          opayExpireAt: String(req.body?.ExpireDate ?? ""),
          updatedAt: new Date().toISOString()
        });
        void handleQuickOpayOrderUpdate(nextQuickOrder);
      }
    }
    res.type("text/plain").send("1|OK");
  });

  app.post("/api/opay/return", (req, res) => {
    console.log("O'Pay paid callback:", req.body);
    const merchantTradeNo = String(req.body?.MerchantTradeNo ?? "");
    if (merchantTradeNo) {
      const order = findStoreOrderByMerchantTradeNo(merchantTradeNo);
      if (order) {
        saveStoreOrder({
          ...order,
          status: String(req.body?.RtnCode ?? "") === "1" ? "paid" : order.status,
          opayTradeNo: String(req.body?.TradeNo ?? ""),
          updatedAt: new Date().toISOString()
        });
      }

      const quickOrder = findQuickOpayOrderByMerchantTradeNo(merchantTradeNo);
      if (quickOrder) {
        const nextQuickOrder = saveQuickOpayOrder({
          ...quickOrder,
          status: String(req.body?.RtnCode ?? "") === "1" ? "paid" : quickOrder.status,
          opayTradeNo: String(req.body?.TradeNo ?? ""),
          updatedAt: new Date().toISOString()
        });
        void handleQuickOpayOrderUpdate(nextQuickOrder);
      }
    }
    res.type("text/plain").send("1|OK");
  });

  app.post("/api/ecpay/direct/return", (req, res) => {
    console.log("ECPay direct code paid callback:", req.body);
    const merchantTradeNo = String(req.body?.MerchantTradeNo ?? "");
    if (merchantTradeNo) {
      const order = findDirectCodeOrderByMerchantTradeNo(merchantTradeNo);
      if (order) {
        const nextOrder = saveDirectCodeOrder({
          ...order,
          status: String(req.body?.RtnCode ?? "") === "1" ? "paid" : order.status,
          providerTradeNo: String(req.body?.TradeNo ?? order.providerTradeNo ?? ""),
          updatedAt: new Date().toISOString()
        });
        void handleDirectCodeOrderUpdate(nextOrder);
      }
    }
    res.type("text/plain").send("1|OK");
  });

  app.post("/api/opay/cvs-checkout", (req, res) => {
    try {
      const { amount, itemName, tradeDesc, subPayment } = req.body as {
        amount: number;
        itemName: string;
        tradeDesc: string;
        subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
      };

      if (!amount || !itemName || !tradeDesc) {
        return res.status(400).json({ message: "amount, itemName, tradeDesc are required" });
      }

      res.json(createCvsCheckout({ amount, itemName, tradeDesc, subPayment }));
    } catch (error) {
      if (error instanceof Error && error.message === "OPAY_NOT_CONFIGURED") {
        return res.status(400).json({ message: "O'Pay environment variables are not configured" });
      }
      return res.status(500).json({ message: "Failed to create O'Pay checkout" });
    }
  });

  app.post("/api/payuni/direct-code", async (req, res) => {
    if (!isPayuniConfigured()) {
      return res.status(400).json({ message: "PAYUNi 尚未填好 Merchant ID / Hash Key / Hash IV / Notify URL / Return URL" });
    }

    return res.status(501).json({
      message: "PAYUNi 後台入口已準備完成，但正式 provider 仍待接入 PAYUNi 文件後才能直接在後台生成代碼。"
    });
  });

  app.post("/api/quick-opay/checkout", (req, res) => {
    try {
      const {
        amount,
        itemName,
        tradeDesc,
        buyerName,
        subPayment
      } = req.body as {
        amount: number;
        itemName: string;
        tradeDesc: string;
        buyerName?: string;
        subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
      };

      if (!amount || !itemName || !tradeDesc) {
        return res.status(400).json({ message: "amount, itemName and tradeDesc are required" });
      }

      const now = new Date().toISOString();
      const orderId = createId("quick-opay");
      const merchantTradeNo = `QP${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 20);

      saveQuickOpayOrder({
        id: orderId,
        merchantTradeNo,
        itemName: itemName.trim(),
        tradeDesc: tradeDesc.trim(),
        buyerName: buyerName?.trim() || "",
        amount: Math.max(1, Math.floor(Number(amount) || 0)),
        subPayment: subPayment || "CVS",
        status: "pending_checkout",
        createdAt: now,
        updatedAt: now
      });

      const checkout = createCvsCheckout({
        amount,
        itemName,
        tradeDesc: buyerName?.trim()
          ? `${tradeDesc}｜${buyerName.trim()}`.slice(0, 200)
          : tradeDesc,
        merchantTradeNo,
        subPayment
      });

      return res.json({
        orderId,
        ...checkout
      });
    } catch (error) {
      if (error instanceof Error && error.message === "OPAY_NOT_CONFIGURED") {
        return res.status(400).json({ message: "O'Pay environment variables are not configured" });
      }
      return res.status(500).json({ message: "Failed to create quick O'Pay checkout" });
    }
  });

  app.get("/api/quick-opay/orders/:id", (req, res) => {
    const order = findQuickOpayOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Quick O'Pay order not found" });
    }
    return res.json(order);
  });

  app.get("/quick-opay/pay/:id", (req, res) => {
    const order = findQuickOpayOrder(req.params.id);
    if (!order) {
      return res.status(404).send("<h1>Quick O'Pay order not found</h1>");
    }

    try {
      const checkout = createCvsCheckout({
        amount: order.amount,
        itemName: order.itemName,
        tradeDesc: order.tradeDesc,
        merchantTradeNo: order.merchantTradeNo,
        subPayment: order.subPayment
      });
      const fieldsMarkup = Object.entries(checkout.fields)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, "&quot;")}">`)
        .join("");

      return res.send(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>前往歐付寶付款</title>
  <style>
    body{font-family:"Segoe UI",sans-serif;background:#fff7ed;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{width:min(560px,92vw);background:#fff;border:1px solid #fed7aa;border-radius:24px;box-shadow:0 20px 40px rgba(249,115,22,.15);padding:32px;text-align:center}
    h1{margin:0 0 12px;font-size:28px}
    p{margin:0 0 18px;color:#6b7280;line-height:1.7}
    .meta{background:#fff7ed;border-radius:18px;padding:18px;margin-bottom:18px;text-align:left}
    .cta{background:#f97316;color:#fff;border:none;border-radius:14px;padding:14px 22px;font-size:16px;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <h1>正在前往歐付寶</h1>
    <p>頁面會自動跳轉到歐付寶建立超商代碼，建立完成後，付款代碼會自動回傳到你的 Discord 工單。</p>
    <div class="meta">
      <div>商品名稱：${order.itemName}</div>
      <div>付款金額：NT$${order.amount.toLocaleString("zh-TW")}</div>
    </div>
    <form id="opay-form" method="post" action="${checkout.action}">
      ${fieldsMarkup}
      <button class="cta" type="submit">如果沒有自動跳轉，點我前往付款</button>
    </form>
  </div>
  <script>document.getElementById('opay-form')?.submit();</script>
</body>
</html>`);
    } catch (error) {
      console.error("Quick O'Pay pay route failed:", error);
      return res.status(500).send("<h1>建立歐付寶付款流程失敗</h1>");
    }
  });

  const storefrontPageCandidates = [
    path.resolve(process.cwd(), "../web/storefront.html"),
    path.resolve(process.cwd(), "../../apps/web/storefront.html"),
    path.resolve(process.cwd(), "apps/web/storefront.html")
  ];
  const quickOpayPageCandidates = [
    path.resolve(process.cwd(), "../web/quick-opay.html"),
    path.resolve(process.cwd(), "../../apps/web/quick-opay.html"),
    path.resolve(process.cwd(), "apps/web/quick-opay.html")
  ];
  const storefrontAssetCandidates = [
    path.resolve(process.cwd(), "../web/src"),
    path.resolve(process.cwd(), "../../apps/web/src"),
    path.resolve(process.cwd(), "apps/web/src")
  ];
  const storefrontPagePath = storefrontPageCandidates.find((candidate) => fs.existsSync(candidate));
  const quickOpayPagePath = quickOpayPageCandidates.find((candidate) => fs.existsSync(candidate));
  const storefrontAssetPath = storefrontAssetCandidates.find((candidate) => fs.existsSync(path.join(candidate, "sky-dashboard-bg.jpg")));

  if (storefrontAssetPath) {
    app.use("/storefront-assets", express.static(storefrontAssetPath));
  }

  if (storefrontPagePath) {
    app.get(["/shop", "/shop.html", "/storefront"], (_req, res) => {
      res.sendFile(storefrontPagePath);
    });
  }

  if (quickOpayPagePath) {
    app.get(["/quick-opay", "/quick-opay.html", "/pay"], (_req, res) => {
      res.sendFile(quickOpayPagePath);
    });
  }

  const webDistCandidates = [
    path.resolve(process.cwd(), "../web/dist"),
    path.resolve(process.cwd(), "../../apps/web/dist"),
    path.resolve(process.cwd(), "apps/web/dist")
  ];
  const webDistPath = webDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html")));

  if (webDistPath) {
    app.get(["/", "/dashboard", "/admin"], (_req, res) => {
      res.sendFile(path.join(webDistPath, "index.html"));
    });
    app.use(express.static(webDistPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }

    const fallbackMessage = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Internal Server Error";

    if (req.path.startsWith("/api")) {
      const statusCode = typeof (error as { status?: unknown })?.status === "number"
        ? Number((error as { status?: number }).status)
        : 500;
      return res.status(statusCode).json({ message: fallbackMessage });
    }

    return res.status(500).type("text/plain").send(fallbackMessage);
  });

  return app;
};
