import { BalanceRecord, DashboardAccountRole, DashboardStats, GiveawayRecord, GuildSettings, PartnershipApplication, PartnershipServer, ReviewRecord, StoreOrderRecord } from "@dc/shared";
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
export declare const loginDashboard: (payload: {
    username: string;
    password: string;
}) => Promise<{
    ok: true;
    token: string;
    account: DashboardSessionAccount;
}>;
export declare const fetchDashboardSession: () => Promise<{
    ok: true;
    account: DashboardSessionAccount;
    legacy: boolean;
}>;
export declare const logoutDashboard: () => Promise<{
    ok: true;
}>;
export declare const fetchDiscordDashboardLogin: () => Promise<{
    ok: true;
    url: string;
}>;
export declare const fetchSettings: () => Promise<GuildSettings>;
export declare const saveSettings: (settings: GuildSettings) => Promise<GuildSettings>;
export declare const fetchBotGuilds: () => Promise<{
    ready: boolean;
    guilds: Array<{
        id: string;
        name: string;
        iconUrl?: string | null;
        memberCount?: number;
        approved: boolean;
        isPrimary: boolean;
        label: string;
    }>;
}>;
export declare const fetchBotGuildChannels: (guildId: string) => Promise<{
    channels: Array<{
        id: string;
        name: string;
        type: number;
    }>;
    roles: Array<{
        id: string;
        name: string;
    }>;
}>;
export declare const setBotGuildApproval: (guildId: string, approved: boolean) => Promise<{
    ok: true;
    linkedGuilds: GuildSettings["linkedGuilds"];
}>;
export declare const sendBotMessageFromDashboard: (payload: {
    guildId: string;
    channelId: string;
    content: string;
}) => Promise<{
    ok: true;
    messageId: string;
}>;
export declare const fetchStats: () => Promise<DashboardStats>;
export declare const fetchReviews: () => Promise<ReviewRecord[]>;
export declare const fetchTickets: () => Promise<any[]>;
export declare const fetchGiveaways: () => Promise<GiveawayRecord[]>;
export declare const createGiveawayFromDashboard: (payload: {
    guildId: string;
    channelId: string;
    prize: string;
    minutes: number;
    winnersCount: number;
}) => Promise<GiveawayRecord>;
export declare const drawGiveawayFromDashboard: (id: string) => Promise<GiveawayRecord>;
export declare const closeGiveawayFromDashboard: (id: string) => Promise<GiveawayRecord>;
export declare const fetchPartnerships: () => Promise<PartnershipServer[]>;
export declare const savePartnershipFromDashboard: (payload: PartnershipServer) => Promise<PartnershipServer>;
export declare const deletePartnershipFromDashboard: (id: string) => Promise<{
    ok: true;
}>;
export declare const fetchPartnershipApplications: () => Promise<PartnershipApplication[]>;
export declare const reviewPartnershipApplicationFromDashboard: (payload: {
    id: string;
    status: "approved" | "rejected";
    reviewNote?: string;
}) => Promise<PartnershipApplication>;
export declare const approvePartnershipAndCreateFromDashboard: (payload: {
    id: string;
    reviewNote?: string;
    featured?: boolean;
    enabled?: boolean;
    mutualPromotion?: boolean;
    bannerUrl?: string;
    tags?: string[];
}) => Promise<{
    application: PartnershipApplication;
    partnership: PartnershipServer;
}>;
export declare const fetchBalances: () => Promise<BalanceRecord[]>;
export declare const saveBalance: (payload: {
    userId: string;
    username: string;
    balance: number;
    note?: string;
}) => Promise<BalanceRecord>;
export declare const adjustBalanceFromDashboard: (payload: {
    userId: string;
    username: string;
    amount: number;
    note?: string;
}) => Promise<BalanceRecord>;
export declare const deleteBalanceFromDashboard: (userId: string) => Promise<{
    ok: true;
}>;
export declare const closeTicketFromDashboard: (id: string) => Promise<{
    ok: true;
}>;
export declare const fetchOpayStatus: () => Promise<{
    configured: boolean;
    stage: boolean;
}>;
export declare const fetchPayuniStatus: () => Promise<{
    configured: boolean;
    stage: boolean;
}>;
export declare const fetchStoreOrdersForDashboard: () => Promise<StoreOrderRecord[]>;
export declare const updateStoreOrderStatusFromDashboard: (id: string, status: StoreOrderRecord["status"]) => Promise<StoreOrderRecord>;
export declare const sendStoreOrderMessageFromDashboard: (id: string, message: string) => Promise<StoreOrderRecord>;
export declare const createOpayCheckout: (payload: {
    amount: number;
    itemName: string;
    tradeDesc: string;
    subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
}) => Promise<{
    action: string;
    fields: Record<string, string>;
}>;
export declare const createPayuniDirectCodeFromDashboard: (payload: {
    amount: number;
    itemName: string;
    tradeDesc: string;
    subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
}) => Promise<{
    ok: true;
    paymentCode?: string;
    expireAt?: string;
    message?: string;
}>;
