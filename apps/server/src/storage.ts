import fs from "node:fs";
import path from "node:path";
import {
  BalanceRecord,
  CustomerAccount,
  DashboardAccount,
  ProductItem,
  ServerStructureBackup,
  DashboardStats,
  GiveawayRecord,
  GuildSettings,
  PassOrderRecord,
  PassOrderStatus,
  PartnershipApplication,
  PartnershipApplicationStatus,
  PartnershipServer,
  ReviewRecord,
  StoreOrderRecord,
  TicketRecord,
  defaultGuildSettings
} from "@dc/shared";
import { env } from "./config.js";

const dataDir = env.dataDir
  ? (path.isAbsolute(env.dataDir) ? env.dataDir : path.resolve(process.cwd(), env.dataDir))
  : path.resolve(process.cwd(), "../../data");
const settingsPath = path.join(dataDir, "settings.json");
const reviewsPath = path.join(dataDir, "reviews.json");
const ticketsPath = path.join(dataDir, "tickets.json");
const giveawaysPath = path.join(dataDir, "giveaways.json");
const balancesPath = path.join(dataDir, "balances.json");
const backupsPath = path.join(dataDir, "channel-backups.json");
const partnershipsPath = path.join(dataDir, "partnerships.json");
const partnershipApplicationsPath = path.join(dataDir, "partnership-applications.json");
const passOrdersPath = path.join(dataDir, "pass-orders.json");
const customerAccountsPath = path.join(dataDir, "customer-accounts.json");
const storeOrdersPath = path.join(dataDir, "store-orders.json");
const quickOpayOrdersPath = path.join(dataDir, "quick-opay-orders.json");
const directCodeOrdersPath = path.join(dataDir, "direct-code-orders.json");

export type QuickOpayOrderStatus = "pending_checkout" | "payment_code_ready" | "paid" | "failed";

export type QuickOpayOrderRecord = {
  id: string;
  merchantTradeNo: string;
  itemName: string;
  tradeDesc: string;
  buyerName: string;
  amount: number;
  subPayment: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
  guildId?: string;
  channelId?: string;
  ticketId?: string;
  userId?: string;
  username?: string;
  status: QuickOpayOrderStatus;
  opayPaymentCode?: string;
  opayExpireAt?: string;
  opayTradeNo?: string;
  createdAt: string;
  updatedAt: string;
};

export type DirectCodeOrderStatus = "pending" | "code_ready" | "paid" | "failed";

export type DirectCodeOrderRecord = {
  id: string;
  provider: "ecpay";
  merchantTradeNo: string;
  itemName: string;
  tradeDesc: string;
  buyerName: string;
  amount: number;
  subPayment: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
  guildId?: string;
  channelId?: string;
  ticketId?: string;
  userId?: string;
  username?: string;
  status: DirectCodeOrderStatus;
  paymentCode?: string;
  expireAt?: string;
  providerTradeNo?: string;
  rawPayload?: string;
  createdAt: string;
  updatedAt: string;
};

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readJson = <T>(filePath: string, fallback: T): T => {
  ensureDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
};

const writeJson = <T>(filePath: string, data: T) => {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

const normalizeBalanceRecord = (record: BalanceRecord): BalanceRecord => ({
  ...record,
  totalSpent: Number.isFinite(record.totalSpent) ? Math.max(0, Math.floor(record.totalSpent)) : 0
});

const normalizeCustomerAccount = (account: CustomerAccount): CustomerAccount => ({
  ...account,
  phone: account.phone ?? "",
  emailVerified: account.emailVerified ?? account.provider === "google",
  phoneVerified: account.phoneVerified ?? false,
  emailVerificationCode: account.emailVerificationCode ?? undefined,
  emailVerificationExpiresAt: account.emailVerificationExpiresAt ?? undefined,
  phoneVerificationCode: account.phoneVerificationCode ?? undefined,
  phoneVerificationExpiresAt: account.phoneVerificationExpiresAt ?? undefined
});

const normalizeDashboardAccount = (account: DashboardAccount, baseGuildId: string): DashboardAccount => ({
  ...account,
  displayName: account.displayName?.trim() || account.username,
  authMode: account.authMode ?? "both",
  allowedGuildIds: account.allowedGuildIds?.length
    ? account.allowedGuildIds
    : (account.role === "developer" || account.role === "owner" ? ["*"] : [baseGuildId])
});

const normalizeProductItem = (product: ProductItem): ProductItem => ({
  ...product,
  description: product.description ?? "",
  imageUrl: product.imageUrl ?? "",
  stockStatus: product.stockStatus ?? (product.enabled ? "in_stock" : "out_of_stock"),
  stockNote: product.stockNote ?? "",
  featured: Boolean(product.featured),
  enabled: product.enabled !== false
});

const desiredServiceProductNames = ["網站託管", "機器人代做", "網站代做"];
const legacySampleHints = ["Robux", "RBX", "Roblox", "代儲", "代充", "遊戲幣"];

const createDefaultServiceProducts = (): ProductItem[] =>
  defaultGuildSettings("sync", "sync").ticket.products.map((product) => normalizeProductItem(product));

const hasDesiredServiceCatalog = (products: ProductItem[]) =>
  desiredServiceProductNames.every((name) => products.some((product) => product.name.trim() === name));

const looksLikeLegacySampleProducts = (products: ProductItem[]) =>
  products.length > 0 &&
  products.every((product) =>
    legacySampleHints.some((hint) =>
      [product.id, product.name, product.category, product.priceLabel, product.description ?? "", product.stockNote ?? ""]
        .join(" ")
        .includes(hint)
    )
  );

const resolveProductCatalog = (incomingProducts: ProductItem[] | undefined, fallbackProducts: ProductItem[]) => {
  const products = incomingProducts ?? fallbackProducts;

  if (!products.length) {
    return fallbackProducts.map(normalizeProductItem);
  }

  if (hasDesiredServiceCatalog(products)) {
    return products.map(normalizeProductItem);
  }

  if (looksLikeLegacySampleProducts(products)) {
    return createDefaultServiceProducts();
  }

  return products.map(normalizeProductItem);
};

const mergeSettings = (base: GuildSettings, incoming: Partial<GuildSettings>): GuildSettings => {
  const incomingAccounts = incoming.accounts ?? [];
  const mergedAccounts = [
    ...incomingAccounts.map((account) => normalizeDashboardAccount(account, base.guildId)),
    ...base.accounts
      .filter((account) => !incomingAccounts.some((item) => item.id === account.id || item.role === account.role))
      .map((account) => normalizeDashboardAccount(account, base.guildId))
  ];

  return {
    ...base,
    ...incoming,
    linkedGuilds: incoming.linkedGuilds ?? base.linkedGuilds,
    accounts: mergedAccounts,
    storefront: {
      ...base.storefront,
      ...incoming.storefront,
      paymentMethods: (incoming.storefront?.paymentMethods ?? base.storefront.paymentMethods).map((method) => ({
        ...method,
        accountInfo: method.accountInfo ?? ""
      }))
    },
    brand: { ...base.brand, ...incoming.brand },
    moderation: { ...base.moderation, ...incoming.moderation },
    review: { ...base.review, ...incoming.review },
    ticket: {
      ...base.ticket,
      ...incoming.ticket,
      categories: incoming.ticket?.categories ?? base.ticket.categories,
      products: resolveProductCatalog(incoming.ticket?.products, base.ticket.products),
      blacklist: incoming.ticket?.blacklist ?? base.ticket.blacklist
    },
    autoReplies: incoming.autoReplies ?? base.autoReplies,
    faq: incoming.faq ?? base.faq
  };
};

export const loadSettings = (): GuildSettings => {
  const defaults = defaultGuildSettings(env.guildId, env.defaultAdminKey);
  const incoming = readJson<Partial<GuildSettings>>(settingsPath, defaults);
  const merged = mergeSettings(defaults, incoming);
  if (JSON.stringify(merged) !== JSON.stringify(incoming)) {
    writeJson(settingsPath, merged);
  }
  return merged;
};

export const saveSettings = (settings: GuildSettings) => {
  writeJson(settingsPath, settings);
};

export const listReviews = (): ReviewRecord[] => readJson(reviewsPath, []);

export const addReview = (review: ReviewRecord) => {
  const reviews = listReviews();
  reviews.unshift(review);
  writeJson(reviewsPath, reviews);
};

export const listTickets = (): TicketRecord[] => readJson(ticketsPath, []);

export const listGiveaways = (): GiveawayRecord[] => readJson(giveawaysPath, []);
export const listBalances = (): BalanceRecord[] => {
  const raw = readJson<BalanceRecord[]>(balancesPath, []);
  const normalized = raw.map(normalizeBalanceRecord);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    writeJson(balancesPath, normalized);
  }
  return normalized.sort((a, b) => b.balance - a.balance || a.username.localeCompare(b.username, "zh-Hant"));
};
export const listChannelBackups = (): ServerStructureBackup[] => readJson<ServerStructureBackup[]>(backupsPath, []);
export const findChannelBackup = (guildId: string) => listChannelBackups().find((item) => item.guildId === guildId);
export const listPartnerships = (): PartnershipServer[] =>
  readJson<PartnershipServer[]>(partnershipsPath, []).sort((a, b) => Number(b.featured) - Number(a.featured) || a.serverName.localeCompare(b.serverName, "zh-Hant"));
export const listPartnershipApplications = (): PartnershipApplication[] =>
  readJson<PartnershipApplication[]>(partnershipApplicationsPath, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const listPassOrders = (): PassOrderRecord[] =>
  readJson<PassOrderRecord[]>(passOrdersPath, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const listCustomerAccounts = (): CustomerAccount[] => {
  const raw = readJson<CustomerAccount[]>(customerAccountsPath, []);
  const normalized = raw.map(normalizeCustomerAccount);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    writeJson(customerAccountsPath, normalized);
  }
  return normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
export const listStoreOrders = (): StoreOrderRecord[] =>
  readJson<StoreOrderRecord[]>(storeOrdersPath, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const findPartnership = (id: string) => listPartnerships().find((item) => item.id === id);
export const findPartnershipApplication = (id: string) => listPartnershipApplications().find((item) => item.id === id);
export const findPassOrder = (id: string) => listPassOrders().find((item) => item.id === id);
export const findStoreOrder = (id: string) => listStoreOrders().find((item) => item.id === id);
export const findStoreOrderByMerchantTradeNo = (merchantTradeNo: string) =>
  listStoreOrders().find((item) => item.opayMerchantTradeNo === merchantTradeNo);
export const listQuickOpayOrders = (): QuickOpayOrderRecord[] =>
  readJson<QuickOpayOrderRecord[]>(quickOpayOrdersPath, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const listDirectCodeOrders = (): DirectCodeOrderRecord[] =>
  readJson<DirectCodeOrderRecord[]>(directCodeOrdersPath, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const findQuickOpayOrder = (id: string) => listQuickOpayOrders().find((item) => item.id === id);
export const findQuickOpayOrderByMerchantTradeNo = (merchantTradeNo: string) =>
  listQuickOpayOrders().find((item) => item.merchantTradeNo === merchantTradeNo);
export const findDirectCodeOrder = (id: string) => listDirectCodeOrders().find((item) => item.id === id);
export const findDirectCodeOrderByMerchantTradeNo = (merchantTradeNo: string) =>
  listDirectCodeOrders().find((item) => item.merchantTradeNo === merchantTradeNo);
export const findCustomerAccountByUsername = (username: string) => {
  const normalized = username.trim().toLowerCase();
  return listCustomerAccounts().find((item) => item.username.trim().toLowerCase() === normalized);
};
export const findCustomerAccountById = (id: string) => listCustomerAccounts().find((item) => item.id === id);

export const saveCustomerAccount = (account: CustomerAccount) => {
  const items = listCustomerAccounts();
  const normalizedAccount = normalizeCustomerAccount(account);
  const next = items.some((item) => item.id === account.id)
    ? items.map((item) => (item.id === account.id ? normalizedAccount : item))
    : [normalizedAccount, ...items];
  writeJson(customerAccountsPath, next);
  return normalizedAccount;
};

export const saveStoreOrder = (order: StoreOrderRecord) => {
  const items = listStoreOrders();
  const next = items.some((item) => item.id === order.id)
    ? items.map((item) => (item.id === order.id ? order : item))
    : [order, ...items];
  writeJson(storeOrdersPath, next);
  return order;
};

export const saveQuickOpayOrder = (order: QuickOpayOrderRecord) => {
  const items = listQuickOpayOrders();
  const next = items.some((item) => item.id === order.id)
    ? items.map((item) => (item.id === order.id ? order : item))
    : [order, ...items];
  writeJson(quickOpayOrdersPath, next);
  return order;
};

export const saveDirectCodeOrder = (order: DirectCodeOrderRecord) => {
  const items = listDirectCodeOrders();
  const next = items.some((item) => item.id === order.id)
    ? items.map((item) => (item.id === order.id ? order : item))
    : [order, ...items];
  writeJson(directCodeOrdersPath, next);
  return order;
};

export const updateStoreOrder = (id: string, updater: (order: StoreOrderRecord) => StoreOrderRecord) => {
  const current = findStoreOrder(id);
  if (!current) return null;
  const next = updater(current);
  saveStoreOrder(next);
  return next;
};

export const saveChannelBackup = (backup: ServerStructureBackup) => {
  const backups = listChannelBackups();
  const nextBackups = backups.some((item) => item.guildId === backup.guildId)
    ? backups.map((item) => (item.guildId === backup.guildId ? backup : item))
    : [backup, ...backups];
  writeJson(backupsPath, nextBackups);
  return backup;
};

export const savePartnership = (partnership: PartnershipServer) => {
  const items = listPartnerships();
  const next = items.some((item) => item.id === partnership.id)
    ? items.map((item) => (item.id === partnership.id ? partnership : item))
    : [partnership, ...items];
  writeJson(partnershipsPath, next);
  return partnership;
};

export const deletePartnership = (id: string) => {
  writeJson(partnershipsPath, listPartnerships().filter((item) => item.id !== id));
};

export const savePartnershipApplication = (application: PartnershipApplication) => {
  const items = listPartnershipApplications();
  const next = items.some((item) => item.id === application.id)
    ? items.map((item) => (item.id === application.id ? application : item))
    : [application, ...items];
  writeJson(partnershipApplicationsPath, next);
  return application;
};

export const updatePartnershipApplicationStatus = (input: {
  id: string;
  status: PartnershipApplicationStatus;
  reviewNote?: string;
}) => {
  const current = findPartnershipApplication(input.id);
  if (!current) return null;
  const next: PartnershipApplication = {
    ...current,
    status: input.status,
    reviewNote: input.reviewNote ?? current.reviewNote,
    updatedAt: new Date().toISOString(),
    processedAt: new Date().toISOString()
  };
  savePartnershipApplication(next);
  return next;
};

export const savePassOrder = (order: PassOrderRecord) => {
  const items = listPassOrders();
  const next = items.some((item) => item.id === order.id)
    ? items.map((item) => (item.id === order.id ? order : item))
    : [order, ...items];
  writeJson(passOrdersPath, next);
  return order;
};

export const updatePassOrderStatus = (input: {
  id: string;
  status: PassOrderStatus;
  fulfilledBy?: string;
}) => {
  const current = findPassOrder(input.id);
  if (!current) return null;
  const now = new Date().toISOString();
  const next: PassOrderRecord = {
    ...current,
    status: input.status,
    updatedAt: now,
    paidAt: input.status === "paid" && !current.paidAt ? now : current.paidAt,
    queuedAt: input.status === "queued" && !current.queuedAt ? now : current.queuedAt,
    deliveredAt: input.status === "completed" ? now : current.deliveredAt,
    fulfilledBy: input.fulfilledBy ?? current.fulfilledBy
  };
  savePassOrder(next);
  return next;
};

export const findBalance = (userId: string) => listBalances().find((item) => item.userId === userId);

export const setBalance = (input: {
  userId: string;
  username: string;
  balance: number;
  totalSpent?: number;
  note?: string;
}) => {
  const balances = listBalances();
  const current = balances.find((item) => item.userId === input.userId);
  const nextRecord: BalanceRecord = {
    userId: input.userId,
    username: input.username.trim() || input.userId,
    balance: Math.max(0, Math.floor(input.balance)),
    totalSpent: Math.max(0, Math.floor(input.totalSpent ?? current?.totalSpent ?? 0)),
    note: input.note?.trim() ?? "",
    updatedAt: new Date().toISOString()
  };
  const nextBalances = balances.some((item) => item.userId === input.userId)
    ? balances.map((item) => (item.userId === input.userId ? nextRecord : item))
    : [nextRecord, ...balances];
  writeJson(balancesPath, nextBalances);
  return nextRecord;
};

export const adjustBalance = (input: {
  userId: string;
  username: string;
  amount: number;
  note?: string;
}) => {
  const current = findBalance(input.userId);
  return setBalance({
    userId: input.userId,
    username: input.username || current?.username || input.userId,
    balance: Math.max(0, (current?.balance ?? 0) + Math.floor(input.amount)),
    totalSpent: current?.totalSpent ?? 0,
    note: input.note ?? current?.note ?? ""
  });
};

export const adjustTotalSpent = (input: {
  userId: string;
  username: string;
  amount: number;
  note?: string;
}) => {
  const current = findBalance(input.userId);
  return setBalance({
    userId: input.userId,
    username: input.username || current?.username || input.userId,
    balance: current?.balance ?? 0,
    totalSpent: Math.max(0, (current?.totalSpent ?? 0) + Math.floor(input.amount)),
    note: input.note ?? current?.note ?? ""
  });
};

export const deleteBalance = (userId: string) => {
  const balances = listBalances().filter((item) => item.userId !== userId);
  writeJson(balancesPath, balances);
};

export const addGiveaway = (giveaway: GiveawayRecord) => {
  const giveaways = listGiveaways();
  giveaways.unshift(giveaway);
  writeJson(giveawaysPath, giveaways);
};

export const updateGiveaway = (id: string, updater: (giveaway: GiveawayRecord) => GiveawayRecord) => {
  const giveaways = listGiveaways().map((giveaway) => (giveaway.id === id ? updater(giveaway) : giveaway));
  writeJson(giveawaysPath, giveaways);
};

export const findGiveaway = (id: string) => listGiveaways().find((giveaway) => giveaway.id === id);

export const addTicket = (ticket: TicketRecord) => {
  const tickets = listTickets();
  tickets.unshift(ticket);
  writeJson(ticketsPath, tickets);
};

export const updateTicket = (id: string, updater: (ticket: TicketRecord) => TicketRecord) => {
  const tickets = listTickets().map((ticket) => (ticket.id === id ? updater(ticket) : ticket));
  writeJson(ticketsPath, tickets);
};

export const findTicketByChannelId = (channelId: string) => listTickets().find((ticket) => ticket.channelId === channelId);

export const countOpenTicketsForUser = (userId: string, guildId?: string) =>
  listTickets().filter((ticket) =>
    ticket.userId === userId &&
    (!guildId || ticket.guildId === guildId) &&
    !["completed", "cancelled", "closed"].includes(ticket.status)
  ).length;

export const getClosedTicketCount = () => listTickets().filter((ticket) => ticket.status === "completed").length;

export const getStorefrontRevenueSummary = () => {
  const orders = listStoreOrders();
  const paidStatuses = new Set(["paid", "processing", "completed"]);
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const weekBoundary = new Date(now);
  weekBoundary.setHours(0, 0, 0, 0);
  weekBoundary.setDate(weekBoundary.getDate() - 6);
  const monthBoundary = new Date(now);
  monthBoundary.setHours(0, 0, 0, 0);
  monthBoundary.setDate(monthBoundary.getDate() - 29);
  let storefrontRevenue = 0;
  let storefrontTodayRevenue = 0;
  let storefrontWeekRevenue = 0;
  let storefrontMonthRevenue = 0;
  let storefrontPaidOrders = 0;
  let storefrontTodayOrders = 0;
  let storefrontWeekOrders = 0;
  let storefrontMonthOrders = 0;

  for (const order of orders) {
    const createdAt = new Date(order.createdAt);
    const createdAtTime = createdAt.getTime();
    const orderDayKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
    if (orderDayKey === todayKey) {
      storefrontTodayOrders += 1;
    }
    if (createdAtTime >= weekBoundary.getTime()) {
      storefrontWeekOrders += 1;
    }
    if (createdAtTime >= monthBoundary.getTime()) {
      storefrontMonthOrders += 1;
    }

    if (!paidStatuses.has(order.status)) continue;
    storefrontRevenue += order.totalAmount;
    storefrontPaidOrders += 1;
    if (orderDayKey === todayKey) {
      storefrontTodayRevenue += order.totalAmount;
    }
    if (createdAtTime >= weekBoundary.getTime()) {
      storefrontWeekRevenue += order.totalAmount;
    }
    if (createdAtTime >= monthBoundary.getTime()) {
      storefrontMonthRevenue += order.totalAmount;
    }
  }

  return {
    storefrontTotalOrders: orders.length,
    storefrontPendingOrders: orders.filter((order) => ["pending_payment", "payment_code_ready"].includes(order.status)).length,
    storefrontPaidOrders,
    storefrontRevenue,
    storefrontTodayRevenue,
    storefrontWeekRevenue,
    storefrontMonthRevenue,
    storefrontTodayOrders,
    storefrontWeekOrders,
    storefrontMonthOrders
  };
};

export const getStats = (): DashboardStats => {
  const reviews = listReviews();
  const tickets = listTickets();
  const settings = loadSettings();
  const balances = listBalances();
  const revenue = getStorefrontRevenueSummary();
  const totalReviews = reviews.length;
  const averageRating = totalReviews === 0 ? 0 : reviews.reduce((sum, item) => sum + item.stars, 0) / totalReviews;

  return {
    totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
    openTickets: tickets.filter((ticket) => !["completed", "cancelled", "closed"].includes(ticket.status)).length,
    completedTickets: tickets.filter((ticket) => ticket.status === "completed").length,
    autoReplyRules: settings.autoReplies.filter((rule) => rule.enabled).length,
    blacklistedUsers: settings.ticket.blacklist.length,
    balanceUsers: balances.length,
    totalStoredBalance: balances.reduce((sum, item) => sum + item.balance, 0),
    storefrontTotalOrders: revenue.storefrontTotalOrders,
    storefrontPendingOrders: revenue.storefrontPendingOrders,
    storefrontPaidOrders: revenue.storefrontPaidOrders,
    storefrontRevenue: revenue.storefrontRevenue,
    storefrontTodayRevenue: revenue.storefrontTodayRevenue,
    storefrontWeekRevenue: revenue.storefrontWeekRevenue,
    storefrontMonthRevenue: revenue.storefrontMonthRevenue,
    storefrontTodayOrders: revenue.storefrontTodayOrders,
    storefrontWeekOrders: revenue.storefrontWeekOrders,
    storefrontMonthOrders: revenue.storefrontMonthOrders
  };
};
