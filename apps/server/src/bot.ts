import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Interaction,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextBasedChannel,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  User,
  GuildChannelCreateOptions,
  OverwriteType
} from "discord.js";
import {
  AutoReplyRule,
  ChannelOverwriteSnapshot,
  GiveawayRecord,
  GuildSettings,
  PassOrderRecord,
  PartnershipApplication,
  PartnershipServer,
  ProductItem,
  ReviewRecord,
  ServerStructureBackup,
  StoreOrderRecord,
  TicketRecord,
  TicketStatus
} from "@dc/shared";
import { env } from "./config.js";
import { createDirectCode, isDirectCodeConfigured } from "./ecpay-direct.js";
import type { DirectCodeSubPayment } from "./ecpay-direct.js";
import {
  addGiveaway,
  addReview,
  addTicket,
  adjustTotalSpent,
  countOpenTicketsForUser,
  adjustBalance,
  findDirectCodeOrder,
  findDirectCodeOrderByMerchantTradeNo,
  findGiveaway,
  findBalance,
  findChannelBackup,
  findPassOrder,
  findQuickOpayOrder,
  findTicketByChannelId,
  findPartnership,
  findPartnershipApplication,
  getClosedTicketCount,
  getStorefrontRevenueSummary,
  listGiveaways,
  listPassOrders,
  listPartnershipApplications,
  listPartnerships,
  loadSettings,
  saveDirectCodeOrder,
  savePassOrder,
  savePartnership,
  savePartnershipApplication,
  saveQuickOpayOrder,
  saveChannelBackup,
  saveSettings,
  setBalance,
  updatePassOrderStatus,
  updatePartnershipApplicationStatus,
  updateGiveaway,
  updateTicket
} from "./storage.js";
import { createId, starText } from "./utils.js";
import type { QuickOpayOrderRecord } from "./storage.js";
import type { DirectCodeOrderRecord } from "./storage.js";

const reviewCommand = new SlashCommandBuilder()
  .setName("發送評價面板")
  .setDescription("發送評價面板")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const ticketCommand = new SlashCommandBuilder()
  .setName("發送工單面板")
  .setDescription("發送工單面板")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const selfServiceTicketCommand = new SlashCommandBuilder()
  .setName("發送自助開單面板")
  .setDescription("發送自助開單面板")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const counterCommand = new SlashCommandBuilder()
  .setName("建立票單統計")
  .setDescription("建立或更新完成票單數頻道")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const giveawayCommand = new SlashCommandBuilder()
  .setName("抽獎")
  .setDescription("建立抽獎活動")
  .addStringOption((option) => option.setName("獎品").setDescription("抽獎獎品").setRequired(true))
  .addIntegerOption((option) => option.setName("分鐘").setDescription("持續分鐘數").setRequired(true).setMinValue(1))
  .addIntegerOption((option) => option.setName("名額").setDescription("中獎人數").setRequired(true).setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const rerollCommand = new SlashCommandBuilder()
  .setName("重抽抽獎")
  .setDescription("重新抽出指定抽獎的得獎者")
  .addStringOption((option) => option.setName("抽獎編號").setDescription("抽獎 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const drawGiveawayCommand = new SlashCommandBuilder()
  .setName("手動開獎")
  .setDescription("立即手動開出指定抽獎")
  .addStringOption((option) => option.setName("抽獎編號").setDescription("抽獎 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const closeGiveawayCommand = new SlashCommandBuilder()
  .setName("手動關獎")
  .setDescription("立即關閉指定抽獎，不再接受參加")
  .addStringOption((option) => option.setName("抽獎編號").setDescription("抽獎 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const balanceCommand = new SlashCommandBuilder()
  .setName("餘額")
  .setDescription("查詢指定使用者的餘額")
  .addUserOption((option) => option.setName("使用者").setDescription("要查詢的使用者").setRequired(false));

const addBalanceCommand = new SlashCommandBuilder()
  .setName("餘額加值")
  .setDescription("替指定使用者增加餘額")
  .addUserOption((option) => option.setName("使用者").setDescription("要加值的使用者").setRequired(true))
  .addIntegerOption((option) => option.setName("金額").setDescription("增加多少餘額").setRequired(true).setMinValue(1))
  .addStringOption((option) => option.setName("備註").setDescription("加值備註").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const deductBalanceCommand = new SlashCommandBuilder()
  .setName("餘額扣款")
  .setDescription("替指定使用者扣除餘額")
  .addUserOption((option) => option.setName("使用者").setDescription("要扣款的使用者").setRequired(true))
  .addIntegerOption((option) => option.setName("金額").setDescription("扣除多少餘額").setRequired(true).setMinValue(1))
  .addStringOption((option) => option.setName("備註").setDescription("扣款備註").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const manageBalanceCommand = new SlashCommandBuilder()
  .setName("管理餘額")
  .setDescription("開啟指定顧客的餘額管理面板")
  .addUserOption((option) => option.setName("顧客").setDescription("要管理的顧客").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const backupChannelsCommand = new SlashCommandBuilder()
  .setName("備份頻道結構")
  .setDescription("備份目前 DC 伺服器的類別與頻道結構")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const restoreChannelsCommand = new SlashCommandBuilder()
  .setName("還原頻道結構")
  .setDescription("依照最近一次備份還原缺少的類別與頻道")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const listPartnersCommand = new SlashCommandBuilder()
  .setName("合作列表")
  .setDescription("在目前頻道發送合作伺服器列表");

const partnerInfoCommand = new SlashCommandBuilder()
  .setName("合作資訊")
  .setDescription("發送指定合作伺服器資訊")
  .addStringOption((option) => option.setName("編號").setDescription("合作伺服器 ID").setRequired(true));

const applyPartnerCommand = new SlashCommandBuilder()
  .setName("申請合作")
  .setDescription("提交合作申請")
  .addStringOption((option) => option.setName("伺服器名稱").setDescription("你的伺服器名稱").setRequired(true))
  .addStringOption((option) => option.setName("聯絡方式").setDescription("你的 Discord 或其他聯絡方式").setRequired(true))
  .addStringOption((option) => option.setName("邀請連結").setDescription("伺服器邀請連結").setRequired(true))
  .addStringOption((option) => option.setName("簡介").setDescription("伺服器簡介").setRequired(true))
  .addStringOption((option) => option.setName("合作內容").setDescription("你能提供的合作方式").setRequired(false));

const reviewPartnerCommand = new SlashCommandBuilder()
  .setName("審核合作")
  .setDescription("審核合作申請")
  .addStringOption((option) => option.setName("申請編號").setDescription("合作申請 ID").setRequired(true))
  .addStringOption((option) =>
    option
      .setName("結果")
      .setDescription("核准或拒絕")
      .setRequired(true)
      .addChoices({ name: "核准", value: "approved" }, { name: "拒絕", value: "rejected" }))
  .addStringOption((option) => option.setName("備註").setDescription("審核備註").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const createPassOrderCommand = new SlashCommandBuilder()
  .setName("建立通行證訂單")
  .setDescription("建立一筆 R 幣通行證訂單")
  .addStringOption((option) => option.setName("商品名稱").setDescription("通行證商品名稱").setRequired(true))
  .addIntegerOption((option) => option.setName("單價").setDescription("單筆價格").setRequired(true).setMinValue(0))
  .addIntegerOption((option) => option.setName("數量").setDescription("購買數量").setRequired(true).setMinValue(1))
  .addStringOption((option) => option.setName("roblox帳號").setDescription("Roblox 帳號").setRequired(true))
  .addStringOption((option) => option.setName("robloxid").setDescription("Roblox User ID").setRequired(true))
  .addStringOption((option) => option.setName("付款方式").setDescription("例如餘額、轉帳、歐付寶").setRequired(true));

const queryPassOrderCommand = new SlashCommandBuilder()
  .setName("查訂單")
  .setDescription("查詢指定通行證訂單")
  .addStringOption((option) => option.setName("訂單編號").setDescription("通行證訂單 ID").setRequired(true));

const queuePassOrderCommand = new SlashCommandBuilder()
  .setName("加入發貨隊列")
  .setDescription("把指定訂單加入發貨隊列")
  .addStringOption((option) => option.setName("訂單編號").setDescription("通行證訂單 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const deliveringPassOrderCommand = new SlashCommandBuilder()
  .setName("開始發貨")
  .setDescription("把指定訂單標記為發貨中")
  .addStringOption((option) => option.setName("訂單編號").setDescription("通行證訂單 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const completePassOrderCommand = new SlashCommandBuilder()
  .setName("發貨完成")
  .setDescription("把指定訂單標記為已完成發貨")
  .addStringOption((option) => option.setName("訂單編號").setDescription("通行證訂單 ID").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const storefrontStatsCommand = new SlashCommandBuilder()
  .setName("商城統計")
  .setDescription("查看商城網站的訂單與收入統計")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const payuniDirectCodeCommand = new SlashCommandBuilder()
  .setName("payuni超商代碼生成")
  .setDescription("直接生成一筆超商付款代碼")
  .addStringOption((option) => option.setName("商品名稱").setDescription("這筆代碼對應的商品名稱").setRequired(true))
  .addIntegerOption((option) => option.setName("金額").setDescription("付款金額").setRequired(true).setMinValue(1))
  .addStringOption((option) =>
    option
      .setName("超商類型")
      .setDescription("要生成哪一種超商代碼")
      .setRequired(true)
      .addChoices(
        { name: "全部超商同一代碼", value: "CVS" },
        { name: "7-11", value: "IBON" },
        { name: "全家", value: "FAMILY" },
        { name: "OK", value: "OKMART" },
        { name: "萊爾富", value: "HILIFE" }
      )
  )
  .addStringOption((option) => option.setName("顧客名稱").setDescription("給顧客看的稱呼").setRequired(false))
  .addStringOption((option) => option.setName("付款說明").setDescription("付款備註或說明").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const commands = [
  reviewCommand.toJSON(),
  ticketCommand.toJSON(),
  selfServiceTicketCommand.toJSON(),
  counterCommand.toJSON(),
  giveawayCommand.toJSON(),
  rerollCommand.toJSON(),
  drawGiveawayCommand.toJSON(),
  closeGiveawayCommand.toJSON(),
  balanceCommand.toJSON(),
  addBalanceCommand.toJSON(),
  deductBalanceCommand.toJSON(),
  manageBalanceCommand.toJSON(),
  backupChannelsCommand.toJSON(),
  restoreChannelsCommand.toJSON(),
  listPartnersCommand.toJSON(),
  partnerInfoCommand.toJSON(),
  applyPartnerCommand.toJSON(),
  reviewPartnerCommand.toJSON(),
  createPassOrderCommand.toJSON(),
  queryPassOrderCommand.toJSON(),
  queuePassOrderCommand.toJSON(),
  deliveringPassOrderCommand.toJSON(),
  completePassOrderCommand.toJSON(),
  storefrontStatsCommand.toJSON(),
  payuniDirectCodeCommand.toJSON()
];

const channelPrefixByCategory: Record<string, string> = {
  purchase: "購物單",
  cart: "購物車",
  giveaway: "領獎單",
  question: "問題單"
};

const statusLabelMap: Record<TicketStatus, string> = {
  pending: "待付款",
  paid: "已付款",
  processing: "處理中",
  completed: "已完成",
  cancelled: "已取消",
  closed: "已關閉"
};

const ticketStatusToneMap: Record<TicketStatus, { color: number; emoji: string; note: string }> = {
  pending: { color: 0xf59e0b, emoji: "🧾", note: "等待顧客完成付款或客服確認下一步。" },
  paid: { color: 0x3b82f6, emoji: "💳", note: "管理員已確認付款，訂單可以往下處理。" },
  processing: { color: 0x10b981, emoji: "🛠️", note: "客服正在處理這筆訂單或問題。" },
  completed: { color: 0x22c55e, emoji: "✅", note: "這筆工單已處理完成。" },
  cancelled: { color: 0x94a3b8, emoji: "🛑", note: "這筆工單已取消，不會再往下處理。" },
  closed: { color: 0x64748b, emoji: "📦", note: "工單已關閉並準備歸檔。" }
};

const formatCurrency = (value: number) => `NT$${Number(value || 0).toLocaleString("zh-TW")}`;

const selfServicePaymentMethods = ["超商代碼繳費（歐付寶）", "超商代碼直出", "中信無卡", "中信網銀轉帳", "郵政轉帳"] as const;
const cvsSubPaymentChoices = [
  { value: "CVS", label: "全部超商同一代碼" },
  { value: "IBON", label: "7-11 專屬代碼" },
  { value: "FAMILY", label: "全家 專屬代碼" },
  { value: "OKMART", label: "OK 專屬代碼" },
  { value: "HILIFE", label: "萊爾富 專屬代碼" }
] as const;

const getPublicAppBaseUrl = () => {
  const candidates = [env.opayClientBackUrl, env.webOrigins[0], `http://localhost:${env.port}`].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      return url.origin;
    } catch {
      continue;
    }
  }
  return `http://localhost:${env.port}`;
};

const parsePriceValue = (value?: string) => {
  const numeric = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildOrderReason = (ticket: TicketRecord) => {
  const lines = [
    `商品名稱：${ticket.productName || "尚未選擇"}`,
    `數量：${ticket.quantity ?? 1}`,
    `付款方式：${ticket.paymentMethod || "尚未選擇"}`,
    `付款金額：${formatCurrency(ticket.totalAmount ?? 0)}`
  ];
  if (ticket.paymentMethod?.includes("超商代碼")) {
    const cvsLabel = cvsSubPaymentChoices.find((item) => item.value === ticket.cvsSubPayment)?.label;
    lines.push(`超商代碼類型：${cvsLabel || "尚未選擇"}`);
  }
  if (ticket.opayPaymentCode) {
    lines.push(`超商付款代碼：${ticket.opayPaymentCode}`);
  }
  if (ticket.opayExpireAt) {
    lines.push(`繳費期限：${ticket.opayExpireAt}`);
  }
  return lines.join("\n");
};

const resolveManualPaymentInstruction = (settings: GuildSettings, paymentMethod: string) => {
  const matched =
    settings.storefront.paymentMethods.find((item) => item.enabled && item.label.trim() === paymentMethod.trim()) ||
    settings.storefront.paymentMethods.find((item) => item.enabled && item.label.includes(paymentMethod.trim()));
  if (matched) {
    return {
      label: matched.label,
      instructions: matched.instructions?.trim() || "請依照以下資訊完成匯款。",
      accountInfo: matched.accountInfo?.trim() || "目前尚未填寫收款資訊，請聯絡客服。"
    };
  }

  return {
    label: paymentMethod,
    instructions: `請使用 ${paymentMethod} 完成付款，完成後告知客服核對。`,
    accountInfo: "目前尚未填寫這個付款方式的收款資訊，請聯絡客服。"
  };
};

const ticketChannelSuffixMap: Partial<Record<TicketStatus, string>> = {
  pending: "未付款",
  paid: "已付款",
  processing: "處理中",
  completed: "已完成",
  cancelled: "已取消",
  closed: "關單"
};

const normalizeTicketNamePart = (value: string) =>
  value
    .replace(/^[^|｜]*[|｜]/, "")
    .replace(/#\d{4}$/i, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "")
    .slice(0, 40) || "顧客";

const autoReplyCooldowns = new Map<string, number>();
const spamTracker = new Map<string, number[]>();

const getManagedGuildIds = (settings: GuildSettings) =>
  Array.from(new Set([settings.guildId, ...settings.linkedGuilds.filter((item) => item.enabled && item.guildId).map((item) => item.guildId)]));

const resolveGuildSettings = (guildId?: string | null): GuildSettings | null => {
  if (!guildId) return null;
  const settings = loadSettings();
  if (guildId === settings.guildId) return settings;

  const linked = settings.linkedGuilds.find((item) => item.enabled && item.guildId === guildId);
  if (!linked) return null;

  return {
    ...settings,
    guildId,
    review: {
      ...settings.review,
      channelId: linked.reviewChannelId || settings.review.channelId
    },
    moderation: {
      ...settings.moderation,
      logChannelId: linked.moderationLogChannelId || settings.moderation.logChannelId
    },
    ticket: {
      ...settings.ticket,
      categoryId: linked.ticketCategoryId,
      paidCategoryId: linked.paidTicketCategoryId,
      supportRoleId: linked.supportRoleId || settings.ticket.supportRoleId,
      autoRoleId: linked.autoRoleId || settings.ticket.autoRoleId,
      logChannelId: linked.ticketLogChannelId || settings.ticket.logChannelId,
      transcriptChannelId: linked.transcriptChannelId || settings.ticket.transcriptChannelId,
      completedCountChannelId: linked.completedCountChannelId || settings.ticket.completedCountChannelId,
      completedCountLabel: linked.completedCountLabel || settings.ticket.completedCountLabel
    }
  };
};

const ensureManagedGuildInteraction = async (interaction: Interaction) => {
  if (resolveGuildSettings(interaction.guildId)) return true;
  await safeReply(interaction, "這個群組目前尚未批准，或尚未填好未付款 / 已付款工單分類區 ID。其他功能都會沿用主群組設定。");
  return false;
};

let activeDiscordClient: Client | null = null;

const registerCommandsForGuild = async (guildId: string) => {
  if (!env.discordToken || !env.clientId || !guildId || guildId === "local-dev-guild") return;
  const rest = new REST({ version: "10" }).setToken(env.discordToken);
  await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), { body: commands });
};

const syncGuildEntry = (guild: Guild) => {
  const settings = loadSettings();
  if (guild.id === settings.guildId) return;
  const existing = settings.linkedGuilds.find((item) => item.guildId === guild.id);
  if (existing) {
    if (existing.label === guild.name) return;
    saveSettings({
      ...settings,
      linkedGuilds: settings.linkedGuilds.map((item) => item.guildId === guild.id ? { ...item, label: guild.name } : item)
    });
    return;
  }

  saveSettings({
    ...settings,
    linkedGuilds: [
      ...settings.linkedGuilds,
      {
        guildId: guild.id,
        label: guild.name,
        enabled: false,
        reviewChannelId: "",
        ticketCategoryId: "",
        paidTicketCategoryId: "",
        supportRoleId: "",
        autoRoleId: "",
        ticketLogChannelId: "",
        transcriptChannelId: "",
        completedCountChannelId: "",
        completedCountLabel: settings.ticket.completedCountLabel,
        moderationLogChannelId: "",
        productAnnouncementChannelId: ""
      }
    ]
  });
};

const syncKnownGuilds = async (client: Client) => {
  const guilds = await client.guilds.fetch();
  for (const item of guilds.values()) {
    const guild = await item.fetch().catch(() => null);
    if (guild) syncGuildEntry(guild);
  }
};

const buildReviewEmbed = () => {
  const settings = loadSettings();
  return new EmbedBuilder()
    .setColor(settings.review.accentColor as `#${string}`)
    .setTitle(`🌟 ${settings.review.panelTitle}`)
    .setDescription(`${settings.review.panelDescription}\n\n請直接點下方星等按鈕，留下你這次購買或客服體驗的真實感受。`)
    .addFields(
      { name: "快速流程", value: "1. 選擇星等\n2. 輸入評價內容\n3. 送出後會同步到評價頻道", inline: true },
      { name: "評價用途", value: "幫助其他顧客判斷，也讓我們持續優化商品與客服。", inline: true }
    )
    .setFooter({ text: `${settings.brand.serverName}｜感謝你的支持` })
    .setTimestamp();
};

const buildReviewButtons = () =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    [1, 2, 3, 4, 5].map((value) =>
      new ButtonBuilder()
        .setCustomId(`review:${value}`)
        .setLabel(`${value} 星`)
        .setEmoji(value >= 4 ? "✨" : "⭐")
        .setStyle(value >= 4 ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );

const buildTicketPanel = () => {
  const settings = loadSettings();
  const embed = new EmbedBuilder()
    .setColor(settings.brand.primaryColor as `#${string}`)
    .setTitle(`🎫 ${settings.ticket.panelTitle}`)
    .setDescription(`${settings.ticket.panelDescription}\n\n請先點下方按鈕選擇工單類型，系統會依照你的內容自動建立專屬處理頻道。`)
    .addFields(
      settings.ticket.categories.map((category) => ({
        name: `${category.emoji} ${category.label}`,
        value: `建立 ${category.label} 工單，快速分流到對應處理流程`,
        inline: true
      }))
    )
    .setFooter({ text: `${settings.brand.serverName}｜工單建立後會同步記錄處理狀態` })
    .setTimestamp();

  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:create")
      .setLabel(settings.ticket.buttonLabel)
      .setEmoji(settings.ticket.buttonEmoji)
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, button };
};

const buildSelfServiceTicketPanel = () => {
  const settings = loadSettings();
  const embed = new EmbedBuilder()
    .setColor(settings.brand.primaryColor as `#${string}`)
    .setTitle(`🛒 自助開單面板`)
    .setDescription(`${settings.ticket.panelDescription}\n\n這個入口會讓顧客自己選擇對應的購買類型與資料，適合直接下單與自動化處理。`)
    .addFields(
      settings.ticket.categories.map((category) => ({
        name: `${category.emoji} ${category.label}`,
        value: `建立 ${category.label} 自助單，快速進入對應流程`,
        inline: true
      }))
    )
    .setFooter({ text: `${settings.brand.serverName}｜自助開單建立後會同步記錄處理狀態` })
    .setTimestamp();

  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:selfcreate")
      .setLabel("開始自助開單")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, button };
};

const buildTicketEmbed = (ticket: TicketRecord, openerLabel?: string) => {
  const settings = loadSettings();
  const tone = ticketStatusToneMap[ticket.status];
  const detailLines = [
    ticket.productName ? `商品：${ticket.productName}` : "",
    ticket.quantity ? `數量：${ticket.quantity}` : "",
    ticket.paymentMethod ? `付款：${ticket.paymentMethod}` : "",
    ticket.totalAmount ? `金額：${formatCurrency(ticket.totalAmount)}` : "",
    ticket.opayPaymentCode ? `超商代碼：${ticket.opayPaymentCode}` : "",
    ticket.opayExpireAt ? `期限：${ticket.opayExpireAt}` : ""
  ].filter(Boolean);
  return new EmbedBuilder()
    .setColor(tone.color)
    .setTitle(`${tone.emoji} ${ticket.categoryLabel}`)
    .setDescription(tone.note)
    .addFields(
      { name: "建立者", value: openerLabel ?? ticket.username, inline: true },
      { name: "訂單狀態", value: `${tone.emoji} ${statusLabelMap[ticket.status]}`, inline: true },
      { name: "工單編號", value: ticket.id, inline: true },
      { name: "工單內容", value: ticket.reason, inline: false },
      ...(detailLines.length ? [{ name: "訂單摘要", value: detailLines.join("\n"), inline: false }] : []),
      { name: "認領狀態", value: ticket.claimedBy ? `已由 ${ticket.claimedBy} 認領` : "尚未認領", inline: false },
      { name: "付款狀態", value: ticket.status === "paid" ? "管理員已確認付款" : "尚未確認付款", inline: false }
    )
    .setFooter({ text: "使用下方按鈕即可直接切換狀態或關閉工單" })
    .setTimestamp();
};

const openTicketCategoryPicker = async (
  interaction: ButtonInteraction,
  prompt: string,
  customId: "ticket:category" | "selfticket:category"
) => {
  const settings = resolveGuildSettings(interaction.guildId);
  if (!settings) {
    await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
    return false;
  }
  if (settings.ticket.blacklist.some((entry) => entry.userId === interaction.user.id)) {
    await interaction.reply({ content: "你目前無法建立工單，請聯絡管理員。", flags: MessageFlags.Ephemeral });
    return false;
  }
  if (countOpenTicketsForUser(interaction.user.id, interaction.guildId ?? undefined) >= settings.ticket.maxOpenTicketsPerUser) {
    await interaction.reply({ content: `你目前已有進行中的工單，最多同時開啟 ${settings.ticket.maxOpenTicketsPerUser} 張。`, flags: MessageFlags.Ephemeral });
    return false;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("選擇工單類型")
    .addOptions(
      settings.ticket.categories.map((category) => ({
        label: category.label,
        value: category.id,
        emoji: category.emoji,
        description: `建立 ${category.label}`
      }))
    );

  await interaction.reply({
    content: prompt,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    flags: MessageFlags.Ephemeral
  });
  return true;
};

const buildTicketActionRows = (ticketId: string) => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${ticketId}`).setLabel("認領").setEmoji("🫱").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setLabel("關單").setEmoji("🗂️").setStyle(ButtonStyle.Danger)
  ),
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket:status:${ticketId}:pending`).setLabel("未付款").setEmoji("🧾").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:status:${ticketId}:paid`).setLabel("已付款").setEmoji("💳").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket:status:${ticketId}:processing`).setLabel("處理中").setEmoji("🛠️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ticket:status:${ticketId}:completed`).setLabel("已完成").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ticket:status:${ticketId}:cancelled`).setLabel("已取消").setEmoji("🛑").setStyle(ButtonStyle.Secondary)
  )
];

export const buildGiveawayEmbed = (giveaway: GiveawayRecord) =>
  new EmbedBuilder()
    .setColor(giveaway.ended ? 0x94a3b8 : 0xf43f5e)
    .setTitle(giveaway.ended ? "🎊 抽獎結果" : "🎉 限時抽獎活動")
    .setDescription(`**獎品**｜${giveaway.prize}\n${giveaway.ended ? "抽獎已結束，請查看下方結果。" : "按下按鈕即可參加這次活動。"}\n`)
    .addFields(
      { name: "抽獎 ID", value: giveaway.id, inline: true },
      { name: "得獎名額", value: String(giveaway.winnersCount), inline: true },
      { name: "參加人數", value: String(giveaway.participants.length), inline: true },
      { name: "結束時間", value: `<t:${Math.floor(new Date(giveaway.endAt).getTime() / 1000)}:F>\n<t:${Math.floor(new Date(giveaway.endAt).getTime() / 1000)}:R>`, inline: false },
      {
        name: giveaway.ended ? "得獎結果" : "目前狀態",
        value: giveaway.ended
          ? (giveaway.winnerIds.length ? giveaway.winnerIds.map((id) => `<@${id}>`).join("、") : "這次沒有抽出得獎者")
          : "抽獎進行中，按下方按鈕即可加入名單。",
        inline: false
      }
    )
    .setFooter({ text: giveaway.ended ? "抽獎已結束" : "最後會自動更新成開獎結果" })
    .setTimestamp();

export const buildGiveawayButton = (giveawayId: string) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`giveaway:join:${giveawayId}`).setLabel("立即參加").setEmoji("🎉").setStyle(ButtonStyle.Success)
  );

const matchesRule = (content: string, rule: AutoReplyRule) => {
  const source = rule.ignoreCase ? content.toLowerCase() : content;
  const target = rule.ignoreCase ? rule.trigger.toLowerCase() : rule.trigger;
  if (rule.matchMode === "exact") return source === target;
  if (rule.matchMode === "startsWith") return source.startsWith(target);
  return source.includes(target);
};

const safeReply = async (interaction: Interaction, content: string) => {
  if (!interaction.isRepliable()) return;
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => null);
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => null);
};

const ensureTicketAdmin = async (interaction: ButtonInteraction) => {
  const settings = resolveGuildSettings(interaction.guildId);
  const supportRoleId = settings?.ticket.supportRoleId;
  if (!supportRoleId) {
    await interaction.reply({
      content: "目前還沒有設定客服身分組 ID，所以工單管理按鈕暫時不能使用。",
      flags: MessageFlags.Ephemeral
    }).catch(() => null);
    return false;
  }
  let hasSupportRole = false;
  if (supportRoleId && interaction.member && "roles" in interaction.member) {
    if (Array.isArray(interaction.member.roles)) {
      hasSupportRole = interaction.member.roles.includes(supportRoleId);
    } else if ("cache" in interaction.member.roles) {
      hasSupportRole = interaction.member.roles.cache.has(supportRoleId);
    }
  }

  if (hasSupportRole) {
    return true;
  }
  await interaction.reply({
    content: "這些工單管理按鈕目前只開放給指定客服身分組的人使用。",
    flags: MessageFlags.Ephemeral
  }).catch(() => null);
  return false;
};

const getCompletedCounterName = (guildId?: string) => {
  const settings = guildId ? resolveGuildSettings(guildId) : loadSettings();
  if (!settings) {
    return `📊｜完成的票單數：${getClosedTicketCount()}`;
  }
  return `${settings.ticket.completedCountLabel}：${getClosedTicketCount()}`;
};

const updateCompletedCounter = async (client: Client, guildId: string) => {
  const settings = resolveGuildSettings(guildId);
  if (!settings) return;
  if (!settings.ticket.completedCountChannelId) return;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;
  const channel = await guild.channels.fetch(settings.ticket.completedCountChannelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  const nextName = getCompletedCounterName(guildId);
  if (channel.name !== nextName) {
    await channel.setName(nextName).catch(() => null);
  }
};

export const concludeGiveaway = async (
  client: Client,
  giveawayId: string,
  mode: "scheduled" | "manual_draw" | "manual_close"
) => {
  const current = findGiveaway(giveawayId);
  if (!current || current.ended) return null;

  const winnerIds = mode === "manual_close" ? [] : drawWinners(current.participants, current.winnersCount);
  updateGiveaway(current.id, (item) => ({ ...item, ended: true, winnerIds }));
  const next = findGiveaway(giveawayId);
  const channel = await client.channels.fetch(current.channelId).catch(() => null);
  if (channel?.isSendable()) {
    const winnersText = winnerIds.length > 0 ? winnerIds.map((id) => `<@${id}>`).join("、") : "無得獎者";
    const title = mode === "manual_close" ? "抽獎已手動關閉" : mode === "manual_draw" ? "抽獎已手動開獎" : "抽獎結束";
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(mode === "manual_close" ? "#94a3b8" : "#10b981")
          .setTitle(title)
          .setDescription(
            mode === "manual_close"
              ? `獎品：${current.prize}\n這個抽獎已由管理員手動關閉。`
              : `獎品：${current.prize}\n得獎者：${winnersText}`
          )
          .addFields({ name: "抽獎 ID", value: current.id, inline: true })
      ]
    });
  }
  if (next && current.messageId) {
    const channel = await client.channels.fetch(current.channelId).catch(() => null);
    if (channel?.isTextBased() && "messages" in channel) {
      const message = await channel.messages.fetch(current.messageId).catch(() => null);
      if (message?.editable) {
        await message.edit({ embeds: [buildGiveawayEmbed(next)], components: [] }).catch(() => null);
      }
    }
  }
  return next;
};

export const scheduleGiveawayEnd = (client: Client, giveaway: GiveawayRecord) => {
  if (giveaway.ended) return;
  const delay = new Date(giveaway.endAt).getTime() - Date.now();
  const run = async () => {
    await concludeGiveaway(client, giveaway.id, "scheduled");
  };

  if (delay <= 0) {
    void run();
    return;
  }
  setTimeout(() => void run(), delay);
};

const drawWinners = (participants: string[], count: number) => {
  const pool = [...new Set(participants)];
  const winners: string[] = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
};

const createCounterChannel = async (interaction: ChatInputCommandInteraction) => {
  const baseSettings = loadSettings();
  const settings = resolveGuildSettings(interaction.guildId);
  if (!settings) {
    await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
    return;
  }
  const existing = settings.ticket.completedCountChannelId
    ? await interaction.guild?.channels.fetch(settings.ticket.completedCountChannelId).catch(() => null)
    : null;

  let channel = existing;
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    channel = await interaction.guild?.channels.create({
      name: getCompletedCounterName(interaction.guildId ?? undefined),
      type: ChannelType.GuildVoice,
      parent: settings.ticket.categoryId || undefined,
      permissionOverwrites: [
        {
          id: interaction.guild!.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        }
      ]
    });
  }

  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.reply({ content: "建立統計頻道失敗。", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.guildId === baseSettings.guildId) {
    saveSettings({
      ...baseSettings,
      ticket: { ...baseSettings.ticket, completedCountChannelId: channel.id }
    });
  } else {
    saveSettings({
      ...baseSettings,
      linkedGuilds: baseSettings.linkedGuilds.map((item) =>
        item.guildId === interaction.guildId ? { ...item, completedCountChannelId: channel.id } : item
      )
    });
  }

  await channel.setName(getCompletedCounterName(interaction.guildId ?? undefined)).catch(() => null);
  await interaction.reply({ content: `完成票單數頻道已建立：<#${channel.id}>`, flags: MessageFlags.Ephemeral });
};

const generateTranscript = async (channel: TextBasedChannel, ticket: TicketRecord) => {
  const settings = resolveGuildSettings(ticket.guildId);
  if (!settings) return;
  if (!settings.ticket.transcriptChannelId || !("messages" in channel)) return;
  const transcriptChannel = await channel.client.channels.fetch(settings.ticket.transcriptChannelId).catch(() => null);
  if (!transcriptChannel?.isSendable()) return;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const transcript = messages
    ? [...messages.values()]
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((message) => `[${new Date(message.createdTimestamp).toLocaleString("zh-TW")}] ${message.author.tag}: ${message.content || "(附件或 Embed)"}`)
        .join("\n")
    : "無法讀取聊天紀錄。";

  await transcriptChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(settings.brand.primaryColor as `#${string}`)
        .setTitle(`工單存檔：${ticket.categoryLabel}`)
        .setDescription(ticket.reason)
        .addFields(
          { name: "建立者", value: ticket.username, inline: true },
          { name: "狀態", value: statusLabelMap[ticket.status], inline: true },
          { name: "工單編號", value: ticket.id, inline: true }
        )
    ]
  });

  const chunks = transcript.match(/[\s\S]{1,1800}/g) ?? [];
  for (const chunk of chunks) {
    await transcriptChannel.send(`\`\`\`\n${chunk}\n\`\`\``);
  }
};

const giveAutoRole = async (member: GuildMember) => {
  const settings = resolveGuildSettings(member.guild.id);
  if (!settings) return;
  if (!settings.ticket.autoRoleId) return;
  const role = await member.guild.roles.fetch(settings.ticket.autoRoleId).catch(() => null);
  if (!role) return;
  await member.roles.add(role).catch((error) => {
    console.error("Failed to assign auto role:", error);
  });
};

const balanceText = (target: User) => {
  const balance = findBalance(target.id);
  if (!balance) {
    return `${target} 目前餘額為 0。`;
  }
  return `${target} 目前餘額為 ${balance.balance}，總消費金額為 ${balance.totalSpent ?? 0}。${balance.note ? `\n備註：${balance.note}` : ""}`;
};

const buildBalanceManageEmbed = (target: User) => {
  const record = findBalance(target.id);
  return new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle(`💼 ${target.displayName} 的餘額資訊`)
    .setDescription("這裡會同步顯示顧客餘額、總消費金額與最後備註，適合給管理員快速調整。")
    .setThumbnail(target.displayAvatarURL({ extension: "png", size: 256 }))
    .addFields(
      { name: "用戶", value: `${target}`, inline: false },
      { name: "目前餘額", value: formatCurrency(record?.balance ?? 0), inline: true },
      { name: "累積消費", value: formatCurrency(record?.totalSpent ?? 0), inline: true },
      { name: "備註", value: record?.note?.trim() || "目前沒有備註", inline: false }
    )
    .setFooter({ text: "使用下方按鈕快速調整餘額與總消費金額" })
    .setTimestamp();
};

const buildBalanceManageRows = (userId: string) => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`balance:modal:add:${userId}`).setLabel("增加餘額").setEmoji("➕").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`balance:modal:deduct:${userId}`).setLabel("減少餘額").setEmoji("➖").setStyle(ButtonStyle.Danger)
  ),
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`balance:modal:spent_add:${userId}`).setLabel("增加總消費").setEmoji("📈").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`balance:modal:spent_deduct:${userId}`).setLabel("減少總消費").setEmoji("📉").setStyle(ButtonStyle.Danger)
  )
];

const buildPayuniDirectCodeEmbed = (params: {
  itemName: string;
  amount: number;
  subPayment: DirectCodeSubPayment;
  buyerName: string;
  paymentCode?: string;
  expireAt?: string;
  merchantTradeNo: string;
}) => {
  const cvsLabel = cvsSubPaymentChoices.find((item) => item.value === params.subPayment)?.label || params.subPayment;
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("PAYUNi 超商代碼已建立")
    .setDescription("這筆代碼已經建立完成，可以直接把下面資訊傳給顧客。")
    .addFields(
      { name: "商品名稱", value: params.itemName, inline: true },
      { name: "付款金額", value: formatCurrency(params.amount), inline: true },
      { name: "超商類型", value: cvsLabel, inline: true },
      { name: "顧客名稱", value: params.buyerName, inline: true },
      { name: "付款代碼", value: params.paymentCode || "未取得", inline: false },
      { name: "繳費期限", value: params.expireAt || "未取得", inline: false },
      { name: "訂單編號", value: params.merchantTradeNo, inline: false }
    )
    .setFooter({ text: "顧客不需要登入網站，拿這組代碼就能去超商繳費。" })
    .setTimestamp();
};

const showBalanceManageModal = async (interaction: ButtonInteraction, mode: string, userId: string) => {
  const modal = new ModalBuilder().setCustomId(`balanceModal:${mode}:${userId}`).setTitle("管理餘額");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("金額")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("note")
        .setLabel("備註")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
};

const syncTicketChannelNameByTarget = async (channel: { name?: string; setName: (name: string) => Promise<unknown> }, ticket: TicketRecord) => {
  const suffix = ticketChannelSuffixMap[ticket.status];
  if (!suffix) return;
  const ownerName = normalizeTicketNamePart(ticket.username);
  const nextName = `${ownerName}-${suffix}`.slice(0, 90);
  if ("name" in channel && channel.name === nextName) return;
  await channel.setName(nextName).catch(() => null);
};

const syncTicketChannelName = async (interaction: ButtonInteraction, ticket: TicketRecord) => {
  if (!interaction.channel || !("setName" in interaction.channel)) return;
  await syncTicketChannelNameByTarget(interaction.channel, ticket);
};

const syncTicketChannelCategoryByTarget = async (
  guild: Guild,
  channel: { parentId?: string | null; setParent: (channelId: string) => Promise<unknown> },
  ticket: TicketRecord
) => {
  const settings = resolveGuildSettings(ticket.guildId);
  if (!settings) return;
  const targetCategoryId =
    ticket.status === "pending"
      ? settings.ticket.categoryId
      : ["paid", "processing", "completed", "closed"].includes(ticket.status)
        ? (settings.ticket.paidCategoryId || settings.ticket.categoryId)
        : settings.ticket.categoryId;
  if (!targetCategoryId) return;
  if ("parentId" in channel && channel.parentId === targetCategoryId) return;
  const parentChannel = await guild.channels.fetch(targetCategoryId).catch(() => null);
  if (parentChannel?.type !== ChannelType.GuildCategory) return;
  await channel.setParent(parentChannel.id).catch(() => null);
};

const syncTicketChannelCategory = async (interaction: ButtonInteraction, ticket: TicketRecord) => {
  if (!interaction.guild || !interaction.channel || !("setParent" in interaction.channel)) return;
  await syncTicketChannelCategoryByTarget(interaction.guild, interaction.channel, ticket);
};

const syncTicketPanelEmbeds = async (client: Client, ticket: TicketRecord) => {
  const settings = resolveGuildSettings(ticket.guildId);
  if (!settings) return;

  const publicChannel = await client.channels.fetch(ticket.channelId).catch(() => null);
  if (ticket.publicPanelMessageId && publicChannel?.isTextBased() && "messages" in publicChannel) {
    const message = await publicChannel.messages.fetch(ticket.publicPanelMessageId).catch(() => null);
    if (message?.editable) {
      await message.edit({
        embeds: [buildTicketEmbed(ticket)],
        components: ticket.status === "closed" ? [] : buildTicketActionRows(ticket.id)
      }).catch(() => null);
    }
  }

  if (ticket.adminPanelMessageId && settings.ticket.logChannelId) {
    const adminChannel = await client.channels.fetch(settings.ticket.logChannelId).catch(() => null);
    if (adminChannel?.isTextBased() && "messages" in adminChannel) {
      const message = await adminChannel.messages.fetch(ticket.adminPanelMessageId).catch(() => null);
      if (message?.editable) {
        await message.edit({
          embeds: [buildTicketEmbed(ticket)],
          components: []
        }).catch(() => null);
      }
    }
  }
};

export const handleQuickOpayOrderUpdate = async (order: QuickOpayOrderRecord) => {
  if (!activeDiscordClient || !order.channelId) return;
  const channel = await activeDiscordClient.channels.fetch(order.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) return;

  const ticket = order.ticketId ? findTicketByChannelId(order.channelId) : null;
  if (ticket && order.status === "payment_code_ready") {
    updateTicket(ticket.id, (current) => ({
      ...current,
      quickOpayOrderId: order.id,
      paymentMethod: "超商代碼繳費（歐付寶）",
      cvsSubPayment: order.subPayment,
      opayPaymentCode: order.opayPaymentCode,
      opayExpireAt: order.opayExpireAt,
      reason: buildOrderReason({
        ...current,
        quickOpayOrderId: order.id,
        paymentMethod: "超商代碼繳費（歐付寶）",
        cvsSubPayment: order.subPayment,
        opayPaymentCode: order.opayPaymentCode,
        opayExpireAt: order.opayExpireAt
      })
    }));
  }

  if (ticket && order.status === "paid") {
    updateTicket(ticket.id, (current) => ({
      ...current,
      status: "paid",
      quickOpayOrderId: order.id,
      paymentMethod: "超商代碼繳費（歐付寶）",
      cvsSubPayment: order.subPayment,
      opayPaymentCode: order.opayPaymentCode ?? current.opayPaymentCode,
      opayExpireAt: order.opayExpireAt ?? current.opayExpireAt,
      reason: buildOrderReason({
        ...current,
        status: "paid",
        quickOpayOrderId: order.id,
        paymentMethod: "超商代碼繳費（歐付寶）",
        cvsSubPayment: order.subPayment,
        opayPaymentCode: order.opayPaymentCode ?? current.opayPaymentCode,
        opayExpireAt: order.opayExpireAt ?? current.opayExpireAt
      })
    }));
  }

  const refreshedTicket = order.ticketId ? findTicketByChannelId(order.channelId) : null;
  if (refreshedTicket) {
    if ("setParent" in channel) {
      const guild = await activeDiscordClient.guilds.fetch(refreshedTicket.guildId).catch(() => null);
      if (guild) {
        await syncTicketChannelCategoryByTarget(guild, channel, refreshedTicket);
      }
    }
    if ("setName" in channel) {
      await syncTicketChannelNameByTarget(channel, refreshedTicket);
    }
    await syncTicketPanelEmbeds(activeDiscordClient, refreshedTicket);
  }

  if (order.status === "payment_code_ready") {
    const cvsLabel = cvsSubPaymentChoices.find((item) => item.value === order.subPayment)?.label || "超商代碼";
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#f59e0b")
          .setTitle("🏪 超商付款代碼已建立")
          .setDescription(`${order.username ? `<@${order.userId}> ` : ""}你的付款代碼已產生，可以直接前往超商完成繳費。`)
          .addFields(
            { name: "商品名稱", value: order.itemName, inline: true },
            { name: "付款金額", value: formatCurrency(order.amount), inline: true },
            { name: "超商類型", value: cvsLabel, inline: true },
            { name: "付款代碼", value: order.opayPaymentCode || "等待歐付寶回傳", inline: false },
            { name: "繳費期限", value: order.opayExpireAt || "等待歐付寶回傳", inline: false }
          )
          .setFooter({ text: "付款完成後，系統會自動把工單切換成已付款。" })
      ]
    }).catch(() => null);
  }

  if (order.status === "paid") {
    await channel.send(`✅ <@${order.userId}> 這筆超商代碼訂單已自動辨識為已付款，客服可以繼續往下處理。`).catch(() => null);
  }
};

export const handleDirectCodeOrderUpdate = async (order: DirectCodeOrderRecord) => {
  if (!activeDiscordClient || !order.channelId) return;
  const channel = await activeDiscordClient.channels.fetch(order.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) return;

  const ticket = findTicketByChannelId(order.channelId);
  if (!ticket) return;

  if (order.status === "code_ready") {
    updateTicket(ticket.id, (current) => ({
      ...current,
      status: "pending",
      paymentMethod: "超商代碼直出",
      cvsSubPayment: order.subPayment,
      opayPaymentCode: order.paymentCode,
      opayExpireAt: order.expireAt,
      reason: buildOrderReason({
        ...current,
        status: "pending",
        paymentMethod: "超商代碼直出",
        cvsSubPayment: order.subPayment,
        opayPaymentCode: order.paymentCode,
        opayExpireAt: order.expireAt
      })
    }));
  }

  if (order.status === "paid") {
    updateTicket(ticket.id, (current) => ({
      ...current,
      status: "paid",
      paymentMethod: "超商代碼直出",
      cvsSubPayment: order.subPayment,
      opayPaymentCode: order.paymentCode ?? current.opayPaymentCode,
      opayExpireAt: order.expireAt ?? current.opayExpireAt,
      reason: buildOrderReason({
        ...current,
        status: "paid",
        paymentMethod: "超商代碼直出",
        cvsSubPayment: order.subPayment,
        opayPaymentCode: order.paymentCode ?? current.opayPaymentCode,
        opayExpireAt: order.expireAt ?? current.opayExpireAt
      })
    }));
  }

  const refreshed = findTicketByChannelId(order.channelId);
  if (!refreshed) return;
  if ("setName" in channel) {
    await syncTicketChannelNameByTarget(channel, refreshed);
  }
  if ("setParent" in channel) {
    const guild = await activeDiscordClient.guilds.fetch(refreshed.guildId).catch(() => null);
    if (guild) {
      await syncTicketChannelCategoryByTarget(guild, channel, refreshed);
    }
  }
  await syncTicketPanelEmbeds(activeDiscordClient, refreshed);

  if (order.status === "code_ready") {
    const cvsLabel = cvsSubPaymentChoices.find((item) => item.value === order.subPayment)?.label || "超商代碼";
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#16a34a")
          .setTitle("⚡ 直出代碼已建立")
          .setDescription(`<@${order.userId}> 你的超商付款代碼已直接建立完成。`)
          .addFields(
            { name: "商品名稱", value: order.itemName, inline: true },
            { name: "付款金額", value: formatCurrency(order.amount), inline: true },
            { name: "超商類型", value: cvsLabel, inline: true },
            { name: "付款代碼", value: order.paymentCode || "未取得", inline: false },
            { name: "繳費期限", value: order.expireAt || "未取得", inline: false }
          )
          .setFooter({ text: "這筆代碼由直出代碼模組建立，顧客可直接前往超商付款。" })
      ]
    }).catch(() => null);
  }

  if (order.status === "paid") {
    await channel.send(`✅ <@${order.userId}> 這筆直出超商代碼已自動辨識為已付款。`).catch(() => null);
  }
};

const buildPartnershipEmbed = (partnership: PartnershipServer) =>
  new EmbedBuilder()
    .setColor(partnership.featured ? "#f59e0b" : "#38bdf8")
    .setTitle(partnership.serverName)
    .setDescription(partnership.description || "合作伺服器")
    .addFields(
      { name: "合作編號", value: partnership.id, inline: true },
      { name: "聯絡方式", value: partnership.contact || "未提供", inline: true },
      { name: "互推狀態", value: partnership.mutualPromotion ? "互推中" : "一般合作", inline: true }
    )
    .setURL(partnership.inviteUrl)
    .setImage(partnership.bannerUrl || null)
    .setFooter({ text: partnership.tags.length > 0 ? `標籤：${partnership.tags.join(" / ")}` : "合作伺服器名單" });

const buildApplicationEmbed = (application: PartnershipApplication) =>
  new EmbedBuilder()
    .setColor(application.status === "approved" ? "#10b981" : application.status === "rejected" ? "#ef4444" : "#f59e0b")
    .setTitle(`合作申請：${application.serverName}`)
    .setDescription(application.description)
    .addFields(
      { name: "申請編號", value: application.id, inline: true },
      { name: "聯絡人", value: application.ownerName, inline: true },
      { name: "聯絡方式", value: application.contact, inline: true },
      { name: "邀請連結", value: application.inviteUrl, inline: false },
      { name: "合作內容", value: application.benefits || "未提供", inline: false },
      { name: "狀態", value: application.status, inline: true },
      { name: "審核備註", value: application.reviewNote || "尚未處理", inline: true }
    );

const buildPassOrderEmbed = (order: PassOrderRecord) =>
  new EmbedBuilder()
    .setColor(order.status === "completed" ? "#10b981" : order.status === "delivering" ? "#38bdf8" : "#f59e0b")
    .setTitle(`通行證訂單：${order.productName}`)
    .addFields(
      { name: "訂單編號", value: order.id, inline: true },
      { name: "狀態", value: order.status, inline: true },
      { name: "購買者", value: order.username, inline: true },
      { name: "Roblox 帳號", value: `${order.robloxUsername} (${order.robloxUserId})`, inline: false },
      { name: "數量 / 總價", value: `${order.quantity} / ${order.totalPrice}`, inline: true },
      { name: "付款方式", value: order.paymentMethod || "未填寫", inline: true },
      { name: "備註", value: order.note || "無", inline: false }
    )
    .setFooter({ text: order.fulfilledBy ? `發貨人：${order.fulfilledBy}` : "等待處理中" });

type RestoredMessageSnapshot = {
  authorTag: string;
  content: string;
  createdAt: string;
};

type RestoredChannelSnapshot = ServerStructureBackup["channels"][number] & {
  messages?: RestoredMessageSnapshot[];
};

type RestoredStructureBackup = Omit<ServerStructureBackup, "channels"> & {
  channels: RestoredChannelSnapshot[];
};

const serializeOverwrites = (channel: {
  permissionOverwrites: {
    cache: Map<string, { id: string; type: number; allow: { bitfield: bigint }; deny: { bitfield: bigint } }>;
  };
}): ChannelOverwriteSnapshot[] =>
  [...channel.permissionOverwrites.cache.values()].map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type === OverwriteType.Member ? "member" : "role",
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString()
  }));

const createMessageSnapshots = async (channel: any) => {
  if (!channel.isTextBased() || !("messages" in channel)) {
    return [];
  }

  const fetchedMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!fetchedMessages) {
    return [];
  }

  return [...fetchedMessages.values()]
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map((message) => ({
      authorTag: message.author.tag,
      content: message.content || (message.attachments.size > 0 ? "[附件]" : "[Embed 或系統訊息]"),
      createdAt: new Date(message.createdTimestamp).toISOString()
    }));
};

const createGuildStructureBackup = async (interaction: ChatInputCommandInteraction): Promise<RestoredStructureBackup> => {
  const fetched = await interaction.guild!.channels.fetch();
  const channels = [...fetched.values()].filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));
  const categories = channels
    .filter((channel) => channel.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((channel) => ({
      name: channel.name,
      position: channel.rawPosition,
      overwrites: serializeOverwrites(channel)
    }));

  const restorableChannels: RestoredStructureBackup["channels"] = await Promise.all(
    channels
      .filter((channel) => [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement].includes(channel.type))
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(async (channel): Promise<RestoredChannelSnapshot> => ({
      name: channel.name,
      type:
        channel.type === ChannelType.GuildVoice
          ? "voice"
          : channel.type === ChannelType.GuildAnnouncement
            ? "announcement"
            : "text",
      position: channel.rawPosition,
      parentName: channel.parent?.type === ChannelType.GuildCategory ? channel.parent.name : undefined,
      topic: "topic" in channel ? channel.topic ?? undefined : undefined,
      nsfw: "nsfw" in channel ? Boolean(channel.nsfw) : undefined,
      rateLimitPerUser: "rateLimitPerUser" in channel ? (channel.rateLimitPerUser ?? undefined) : undefined,
      bitrate: "bitrate" in channel ? channel.bitrate : undefined,
      userLimit: "userLimit" in channel ? channel.userLimit : undefined,
      overwrites: serializeOverwrites(channel),
      messages: channel.type === ChannelType.GuildVoice ? [] : await createMessageSnapshots(channel)
    }))
  );

  return {
    guildId: interaction.guildId!,
    guildName: interaction.guild!.name,
    createdAt: new Date().toISOString(),
    categories,
    channels: restorableChannels
  };
};

const hydrateOverwrites = (overwrites: ChannelOverwriteSnapshot[]) =>
  overwrites.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type === "member" ? OverwriteType.Member : OverwriteType.Role,
    allow: BigInt(overwrite.allow),
    deny: BigInt(overwrite.deny)
  }));

const restoreGuildStructure = async (interaction: ChatInputCommandInteraction, backup: RestoredStructureBackup) => {
  const fetched = await interaction.guild!.channels.fetch();
  const existingChannels = [...fetched.values()].filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));

  const categoryMap = new Map<string, string>();
  let restoredCategories = 0;
  let restoredChannels = 0;

  for (const category of backup.categories) {
    const existing = existingChannels.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === category.name);
    if (existing) {
      categoryMap.set(category.name, existing.id);
      continue;
    }

    const created = await interaction.guild!.channels.create({
      name: category.name,
      type: ChannelType.GuildCategory,
      position: category.position,
      permissionOverwrites: hydrateOverwrites(category.overwrites)
    });
    categoryMap.set(category.name, created.id);
    existingChannels.push(created);
    restoredCategories += 1;
  }

  for (const channel of backup.channels) {
    const targetType =
      channel.type === "voice"
        ? ChannelType.GuildVoice
        : channel.type === "announcement"
          ? ChannelType.GuildAnnouncement
          : ChannelType.GuildText;
    const parentId = channel.parentName ? categoryMap.get(channel.parentName) : undefined;
    const existing = existingChannels.find(
      (item) =>
        item.type === targetType &&
        item.name === channel.name &&
        (item.parent?.type === ChannelType.GuildCategory ? item.parent.name : undefined) === channel.parentName
    );
    if (existing) continue;

    const baseOptions: GuildChannelCreateOptions = {
      name: channel.name,
      type: targetType,
      parent: parentId,
      position: channel.position,
      permissionOverwrites: hydrateOverwrites(channel.overwrites)
    };

    const typeSpecific =
      targetType === ChannelType.GuildVoice
        ? { bitrate: channel.bitrate, userLimit: channel.userLimit }
        : {
            topic: channel.topic,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser
          };

    const created = await interaction.guild!.channels.create({
      ...baseOptions,
      ...typeSpecific
    });
    existingChannels.push(created);
    restoredChannels += 1;

    if ((targetType === ChannelType.GuildText || targetType === ChannelType.GuildAnnouncement) && channel.messages && channel.messages.length > 0 && created.isTextBased() && "send" in created) {
      await created.send("以下為最近一次備份時保留的頻道訊息紀錄：").catch(() => null);
      const transcript = channel.messages
        .map((message: RestoredMessageSnapshot) => `[${new Date(message.createdAt).toLocaleString("zh-TW")}] ${message.authorTag}: ${message.content}`)
        .join("\n");
      const chunks = transcript.match(/[\s\S]{1,1800}/g) ?? [];
      for (const chunk of chunks) {
        await created.send(`\`\`\`\n${chunk}\n\`\`\``).catch(() => null);
      }
    }
  }

  return { restoredCategories, restoredChannels };
};

export const createDiscordClient = () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
  });

  client.once(Events.ClientReady, async (readyClient) => {
    activeDiscordClient = readyClient;
    await syncKnownGuilds(readyClient);
    const guilds = await readyClient.guilds.fetch();
    const guildIds = [...guilds.keys()].filter((item) => item !== "local-dev-guild");

    for (const guildId of guildIds) {
      await registerCommandsForGuild(guildId).catch((error) => {
        console.error(`Failed to register commands for guild ${guildId}:`, error);
      });
    }

    const settings = loadSettings();
    const managedGuildIds = getManagedGuildIds(settings).filter((item) => item !== "local-dev-guild");
    for (const guildId of managedGuildIds) {
      await updateCompletedCounter(readyClient, guildId);
    }
    listGiveaways().filter((item) => !item.ended).forEach((item) => scheduleGiveawayEnd(readyClient, item));
    console.log(`Discord bot ready as ${readyClient.user.tag}`);
  });

  client.on(Events.GuildCreate, async (guild) => {
    syncGuildEntry(guild);
    await registerCommandsForGuild(guild.id).catch((error) => {
      console.error(`Failed to register commands for new guild ${guild.id}:`, error);
    });
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    await giveAutoRole(member);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }
      if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
        return;
      }
      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
        return;
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("reviewModal:")) await submitReview(interaction);
        if (interaction.customId.startsWith("ticketModal:") || interaction.customId.startsWith("selfticketModal:"))
          await submitTicket(interaction);
        if (interaction.customId.startsWith("balanceModal:")) await submitBalanceManageModal(interaction);
      }
    } catch (error) {
      console.error("Interaction handler error:", error);
      await safeReply(interaction, "操作失敗，請檢查設定後再試一次。");
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    const settings = resolveGuildSettings(message.guildId);
    if (!settings) return;

    if (settings.moderation.antiSpamEnabled) {
      const trackerKey = `${message.guildId}:${message.author.id}`;
      const now = Date.now();
      const windowMs = settings.moderation.spamWindowSeconds * 1000;
      const recent = (spamTracker.get(trackerKey) ?? []).filter((timestamp) => now - timestamp <= windowMs);
      recent.push(now);
      spamTracker.set(trackerKey, recent);

      if (recent.length >= settings.moderation.spamMessageLimit) {
        await message.delete().catch(() => null);

        if (message.member?.moderatable) {
          await message.member.timeout(settings.moderation.timeoutMinutes * 60 * 1000, "Anti-spam triggered").catch(() => null);
        }

        if (settings.moderation.logChannelId) {
          const logChannel = await message.guild.channels.fetch(settings.moderation.logChannelId).catch(() => null);
          if (logChannel?.isSendable()) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor("#ef4444")
                  .setTitle("防刷頻觸發")
                  .setDescription(`使用者 ${message.author.tag} 因短時間內大量發言被處置。`)
                  .addFields(
                    { name: "訊息門檻", value: `${settings.moderation.spamMessageLimit} 則`, inline: true },
                    { name: "時間窗口", value: `${settings.moderation.spamWindowSeconds} 秒`, inline: true },
                    { name: "禁言時間", value: `${settings.moderation.timeoutMinutes} 分鐘`, inline: true }
                  )
              ]
            });
          }
        }

        await message.channel.send(`${message.author} 因刷頻已被系統暫時限制發言。`).catch(() => null);
        spamTracker.set(trackerKey, []);
        return;
      }
    }

    for (const rule of settings.autoReplies) {
      if (!rule.enabled || !matchesRule(message.content, rule)) continue;
      const cooldownKey = `${message.guildId}:${rule.id}`;
      const now = Date.now();
      if ((autoReplyCooldowns.get(cooldownKey) ?? 0) > now) continue;
      autoReplyCooldowns.set(cooldownKey, now + rule.cooldownSeconds * 1000);
      await message.reply({ content: rule.response });
      break;
    }
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.isTextBased()) return;
    const ticket = findTicketByChannelId(channel.id);
    if (!ticket) return;
    if (ticket.status === "completed" || ticket.status === "cancelled" || ticket.status === "closed") {
      await updateCompletedCounter(client, ticket.guildId);
      return;
    }
    updateTicket(ticket.id, (current) => ({ ...current, status: "closed", closedAt: new Date().toISOString() }));
    await updateCompletedCounter(client, ticket.guildId);
  });

  return client;
};

const handleSlashCommand = async (interaction: ChatInputCommandInteraction) => {
  if (!(await ensureManagedGuildInteraction(interaction))) return;

  if (interaction.commandName === "發送評價面板") {
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({ embeds: [buildReviewEmbed()], components: [buildReviewButtons()] });
    }
    await interaction.reply({ content: "評價面板已發送。", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "發送工單面板") {
    const { embed, button } = buildTicketPanel();
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({ embeds: [embed], components: [button] });
    }
    await interaction.reply({ content: "工單面板已發送。", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "發送自助開單面板") {
    const { embed, button } = buildSelfServiceTicketPanel();
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({ embeds: [embed], components: [button] });
    }
    await interaction.reply({ content: "自助開單面板已發送。", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "建立票單統計") {
    await createCounterChannel(interaction);
    return;
  }

  if (interaction.commandName === "抽獎") {
    const prize = interaction.options.getString("獎品", true);
    const minutes = interaction.options.getInteger("分鐘", true);
    const winnersCount = interaction.options.getInteger("名額", true);
    const endAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    if (!interaction.channel?.isSendable()) {
      await interaction.reply({ content: "目前無法在這個頻道建立抽獎。", flags: MessageFlags.Ephemeral });
      return;
    }

    const giveawayId = createId("giveaway");
    const message = await interaction.channel.send({
      embeds: [
        buildGiveawayEmbed({
          id: giveawayId,
          guildId: interaction.guildId!,
          channelId: interaction.channelId,
          messageId: "",
          prize,
          winnersCount,
          endAt,
          participants: [],
          ended: false,
          winnerIds: [],
          createdBy: interaction.user.id
        })
      ],
      components: [buildGiveawayButton(giveawayId)]
    });

    const giveaway: GiveawayRecord = {
      id: giveawayId,
      guildId: interaction.guildId!,
      channelId: interaction.channelId,
      messageId: message.id,
      prize,
      winnersCount,
      endAt,
      participants: [],
      ended: false,
      winnerIds: [],
      createdBy: interaction.user.id
    };

    addGiveaway(giveaway);
    scheduleGiveawayEnd(interaction.client, giveaway);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf43f5e)
          .setTitle("🎉 抽獎已建立")
          .setDescription(`新的抽獎活動已經送出到目前頻道，成員現在可以直接參加。`)
          .addFields(
            { name: "抽獎 ID", value: giveawayId, inline: true },
            { name: "獎品", value: prize, inline: true },
            { name: "名額", value: `${winnersCount} 位`, inline: true },
            { name: "截止時間", value: `<t:${Math.floor(new Date(endAt).getTime() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: "到時間後會自動開獎，也可以手動開獎或關獎" })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "重抽抽獎") {
    const giveawayId = interaction.options.getString("抽獎編號", true);
    const giveaway = findGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.reply({ content: "找不到這個抽獎 ID。", flags: MessageFlags.Ephemeral });
      return;
    }

    const winnerIds = drawWinners(giveaway.participants, giveaway.winnersCount);
    updateGiveaway(giveaway.id, (item) => ({ ...item, winnerIds, ended: true }));
    const winnersText = winnerIds.length > 0 ? winnerIds.map((id) => `<@${id}>`).join("、") : "無人參加";
    await interaction.reply({ content: `重新抽獎完成，得獎者：${winnersText}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "手動開獎") {
    const giveawayId = interaction.options.getString("抽獎編號", true);
    const next = await concludeGiveaway(interaction.client, giveawayId, "manual_draw");
    if (!next) {
      await interaction.reply({ content: "找不到這個抽獎，或抽獎已經結束。", flags: MessageFlags.Ephemeral });
      return;
    }
    const winnersText = next.winnerIds.length > 0 ? next.winnerIds.map((id) => `<@${id}>`).join("、") : "無人參加";
    await interaction.reply({ content: `手動開獎完成，得獎者：${winnersText}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "手動關獎") {
    const giveawayId = interaction.options.getString("抽獎編號", true);
    const next = await concludeGiveaway(interaction.client, giveawayId, "manual_close");
    if (!next) {
      await interaction.reply({ content: "找不到這個抽獎，或抽獎已經結束。", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `抽獎 ${next.id} 已手動關閉。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "餘額") {
    const target = interaction.options.getUser("使用者") ?? interaction.user;
    await interaction.reply({ embeds: [buildBalanceManageEmbed(target)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "餘額加值") {
    const target = interaction.options.getUser("使用者", true);
    const amount = interaction.options.getInteger("金額", true);
    const note = interaction.options.getString("備註") ?? "";
    const balance = adjustBalance({
      userId: target.id,
      username: target.tag,
      amount,
      note
    });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("➕ 餘額加值完成")
          .setDescription(`已成功替 ${target} 增加餘額。`)
          .addFields(
            { name: "調整金額", value: formatCurrency(amount), inline: true },
            { name: "目前餘額", value: formatCurrency(balance.balance), inline: true },
            { name: "備註", value: note || "無", inline: false }
          )
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "餘額扣款") {
    const target = interaction.options.getUser("使用者", true);
    const amount = interaction.options.getInteger("金額", true);
    const note = interaction.options.getString("備註") ?? "";
    const balance = adjustBalance({
      userId: target.id,
      username: target.tag,
      amount: -amount,
      note
    });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("➖ 餘額扣款完成")
          .setDescription(`已成功替 ${target} 扣除餘額。`)
          .addFields(
            { name: "扣除金額", value: formatCurrency(amount), inline: true },
            { name: "目前餘額", value: formatCurrency(balance.balance), inline: true },
            { name: "備註", value: note || "無", inline: false }
          )
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "管理餘額") {
    const target = interaction.options.getUser("顧客", true);
    await interaction.reply({
      embeds: [buildBalanceManageEmbed(target)],
      components: buildBalanceManageRows(target.id),
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "備份頻道結構") {
    const backup = await createGuildStructureBackup(interaction);
    saveChannelBackup(backup);
    await interaction.reply({
      content: `已備份 ${backup.guildName} 的頻道結構。\n類別：${backup.categories.length} 個\n頻道：${backup.channels.length} 個`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "還原頻道結構") {
    const backup = findChannelBackup(interaction.guildId!) as RestoredStructureBackup | undefined;
    if (!backup) {
      await interaction.reply({ content: "目前找不到頻道備份，請先執行 /備份頻道結構。", flags: MessageFlags.Ephemeral });
      return;
    }
    const result = await restoreGuildStructure(interaction, backup);
    await interaction.reply({
      content: `頻道結構還原完成。\n補回類別：${result.restoredCategories} 個\n補回頻道：${result.restoredChannels} 個`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "商城統計") {
    const summary = getStorefrontRevenueSummary();
    const embed = new EmbedBuilder()
      .setColor(0x2563eb)
      .setTitle("商城營運統計")
      .setDescription("這裡會統計商城網站目前的訂單量、待付款量與已確認收入。")
      .addFields(
        { name: "總訂單數", value: `${summary.storefrontTotalOrders}`, inline: true },
        { name: "待付款訂單", value: `${summary.storefrontPendingOrders}`, inline: true },
        { name: "已確認訂單", value: `${summary.storefrontPaidOrders}`, inline: true },
        { name: "累積收入", value: `${summary.storefrontRevenue}`, inline: true },
        { name: "今日收入", value: `${summary.storefrontTodayRevenue}`, inline: true },
        { name: "資料來源", value: "商城網站訂單 / 已付款、處理中、已完成 訂單", inline: false }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "payuni超商代碼生成") {
    const itemName = interaction.options.getString("商品名稱", true);
    const amount = interaction.options.getInteger("金額", true);
    const subPayment = interaction.options.getString("超商類型", true) as DirectCodeSubPayment;
    const buyerName =
      interaction.options.getString("顧客名稱")?.trim() ||
      (interaction.member && "displayName" in interaction.member ? interaction.member.displayName : undefined) ||
      interaction.user.globalName ||
      interaction.user.username;
    const tradeDesc = interaction.options.getString("付款說明")?.trim() || `${itemName} PAYUNi 超商代碼`;

    if (!isDirectCodeConfigured()) {
      await interaction.reply({
        content: "直出超商代碼模組目前還沒有設定完成。請先在 .env 填入直出代碼金流參數後，再使用這個指令。",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const now = new Date().toISOString();
    const orderId = createId("direct-code");
    const merchantTradeNo = `DC${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
    const directOrder: DirectCodeOrderRecord = {
      id: orderId,
      provider: "ecpay",
      merchantTradeNo,
      itemName,
      tradeDesc,
      buyerName,
      amount: Math.max(1, amount),
      subPayment,
      guildId: interaction.guildId ?? undefined,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      username: interaction.user.tag,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    saveDirectCodeOrder(directOrder);

    try {
      const result = await createDirectCode({
        amount: directOrder.amount,
        itemName: directOrder.itemName,
        tradeDesc: directOrder.tradeDesc,
        buyerName: directOrder.buyerName,
        merchantTradeNo: directOrder.merchantTradeNo,
        subPayment: directOrder.subPayment
      });

      const saved = saveDirectCodeOrder({
        ...directOrder,
        status: "code_ready",
        providerTradeNo: result.providerTradeNo,
        paymentCode: result.paymentCode,
        expireAt: result.expireAt,
        rawPayload: JSON.stringify(result.raw),
        updatedAt: new Date().toISOString()
      });

      await interaction.editReply({
        content: "PAYUNi 超商代碼已直接生成完成。",
        embeds: [
          buildPayuniDirectCodeEmbed({
            itemName: saved.itemName,
            amount: saved.amount,
            subPayment: saved.subPayment,
            buyerName: saved.buyerName,
            paymentCode: saved.paymentCode,
            expireAt: saved.expireAt,
            merchantTradeNo: saved.merchantTradeNo
          })
        ]
      });
    } catch (error) {
      console.error("PAYUNi direct code command failed:", error);
      saveDirectCodeOrder({
        ...directOrder,
        status: "failed",
        updatedAt: new Date().toISOString()
      });
      await interaction.editReply({
        content: `PAYUNi 超商代碼生成失敗：${error instanceof Error ? error.message : "未知錯誤"}`
      });
    }
    return;
  }

  if (interaction.commandName === "合作列表") {
    const items = listPartnerships().filter((item) => item.enabled);
    if (items.length === 0) {
      await interaction.reply({ content: "目前還沒有上架中的合作伺服器。", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.channel?.isSendable()) {
      for (const item of items) {
        await interaction.channel.send({ embeds: [buildPartnershipEmbed(item)] });
      }
    }
    await interaction.reply({ content: `已發送 ${items.length} 個合作伺服器資訊。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "合作資訊") {
    const id = interaction.options.getString("編號", true);
    const item = findPartnership(id);
    if (!item) {
      await interaction.reply({ content: "找不到這個合作伺服器編號。", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({ embeds: [buildPartnershipEmbed(item)] });
    }
    await interaction.reply({ content: `已發送 ${item.serverName} 的合作資訊。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "申請合作") {
    const now = new Date().toISOString();
    const application = savePartnershipApplication({
      id: createId("partner_app"),
      serverName: interaction.options.getString("伺服器名稱", true),
      ownerName: interaction.user.tag,
      ownerUserId: interaction.user.id,
      contact: interaction.options.getString("聯絡方式", true),
      inviteUrl: interaction.options.getString("邀請連結", true),
      description: interaction.options.getString("簡介", true),
      benefits: interaction.options.getString("合作內容") ?? "",
      reviewNote: "",
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    await interaction.reply({ content: `合作申請已送出，申請編號：${application.id}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "審核合作") {
    const id = interaction.options.getString("申請編號", true);
    const result = interaction.options.getString("結果", true) as "approved" | "rejected";
    const reviewNote = interaction.options.getString("備註") ?? "";
    const application = findPartnershipApplication(id);
    if (!application) {
      await interaction.reply({ content: "找不到這筆合作申請。", flags: MessageFlags.Ephemeral });
      return;
    }

    const reviewed = updatePartnershipApplicationStatus({ id, status: result, reviewNote });
    if (!reviewed) {
      await interaction.reply({ content: "合作申請更新失敗。", flags: MessageFlags.Ephemeral });
      return;
    }

    if (result === "approved") {
      const existing = listPartnerships().find((item) => item.sourceApplicationId === reviewed.id);
      if (!existing) {
        savePartnership({
          id: createId("partner"),
          serverName: reviewed.serverName,
          description: reviewed.description,
          inviteUrl: reviewed.inviteUrl,
          bannerUrl: "",
          contact: reviewed.contact,
          tags: [],
          mutualPromotion: true,
          featured: false,
          enabled: true,
          sourceApplicationId: reviewed.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    await interaction.reply({
      embeds: [buildApplicationEmbed(reviewed)],
      content: result === "approved" ? "合作申請已核准，並已加入合作伺服器名單。" : "合作申請已拒絕。",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "建立通行證訂單") {
    const productName = interaction.options.getString("商品名稱", true);
    const unitPrice = interaction.options.getInteger("單價", true);
    const quantity = interaction.options.getInteger("數量", true);
    const robloxUsername = interaction.options.getString("roblox帳號", true);
    const robloxUserId = interaction.options.getString("robloxid", true);
    const paymentMethod = interaction.options.getString("付款方式", true);
    const totalPrice = unitPrice * quantity;
    const order: PassOrderRecord = {
      id: createId("pass_order"),
      userId: interaction.user.id,
      username: interaction.user.tag,
      guildId: interaction.guildId!,
      channelId: interaction.channelId,
      productId: productName,
      productName,
      category: "Robux通行證",
      quantity,
      unitPrice,
      totalPrice,
      robloxUserId,
      robloxUsername,
      paymentMethod,
      note: "",
      status: paymentMethod === "餘額" ? "paid" : "pending_payment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: paymentMethod === "餘額" ? new Date().toISOString() : undefined
    };
    savePassOrder(order);
    await interaction.reply({ embeds: [buildPassOrderEmbed(order)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "查訂單") {
    const id = interaction.options.getString("訂單編號", true);
    const order = findPassOrder(id);
    if (!order) {
      await interaction.reply({ content: "找不到這筆通行證訂單。", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ embeds: [buildPassOrderEmbed(order)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "加入發貨隊列") {
    const id = interaction.options.getString("訂單編號", true);
    const order = updatePassOrderStatus({ id, status: "queued", fulfilledBy: interaction.user.tag });
    if (!order) {
      await interaction.reply({ content: "找不到這筆通行證訂單。", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `訂單 ${order.id} 已加入發貨隊列。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "開始發貨") {
    const id = interaction.options.getString("訂單編號", true);
    const order = updatePassOrderStatus({ id, status: "delivering", fulfilledBy: interaction.user.tag });
    if (!order) {
      await interaction.reply({ content: "找不到這筆通行證訂單。", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `訂單 ${order.id} 已標記為發貨中。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === "發貨完成") {
    const id = interaction.options.getString("訂單編號", true);
    const order = updatePassOrderStatus({ id, status: "completed", fulfilledBy: interaction.user.tag });
    if (!order) {
      await interaction.reply({ content: "找不到這筆通行證訂單。", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `訂單 ${order.id} 已標記為發貨完成。`, embeds: [buildPassOrderEmbed(order)], flags: MessageFlags.Ephemeral });
    return;
  }
};

const handleButtonInteraction = async (interaction: ButtonInteraction) => {
  if (interaction.customId.startsWith("review:")) {
    const stars = interaction.customId.split(":")[1];
    const modal = new ModalBuilder().setCustomId(`reviewModal:${stars}`).setTitle("提交評價");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("reviewContent").setLabel("請輸入評價內容").setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId.startsWith("giveaway:join:")) {
    const giveawayId = interaction.customId.split(":")[2];
    const giveaway = findGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.reply({ content: "找不到這個抽獎。", flags: MessageFlags.Ephemeral });
      return;
    }
    if (giveaway.ended) {
      await interaction.reply({ content: "這個抽獎已經結束。", flags: MessageFlags.Ephemeral });
      return;
    }
    if (giveaway.participants.includes(interaction.user.id)) {
      await interaction.reply({ content: "你已經參加過這個抽獎了。", flags: MessageFlags.Ephemeral });
      return;
    }

    updateGiveaway(giveawayId, (item) => ({ ...item, participants: [...item.participants, interaction.user.id] }));
    const refreshed = findGiveaway(giveawayId);
    if (refreshed) {
      await interaction.update({ embeds: [buildGiveawayEmbed(refreshed)], components: [buildGiveawayButton(giveawayId)] });
    }
    await safeReply(interaction, "你已成功參加抽獎。");
    return;
  }

  if (interaction.customId.startsWith("balance:modal:")) {
    const [, , mode, userId] = interaction.customId.split(":");
    const target = await interaction.client.users.fetch(userId).catch(() => null);
    if (!target) {
      await interaction.reply({ content: "找不到這位顧客。", flags: MessageFlags.Ephemeral });
      return;
    }
    await showBalanceManageModal(interaction, mode, userId);
    return;
  }

  if (interaction.customId === "ticket:create") {
    await openTicketCategoryPicker(interaction, "請先選擇要建立的工單類型。", "ticket:category");
    return;
  }

  if (interaction.customId === "ticket:selfcreate") {
    await openTicketCategoryPicker(interaction, "請先選擇要建立的自助開單類型。", "selfticket:category");
    return;
  }

  if (interaction.customId.startsWith("ticket:claim:")) {
    if (!(await ensureTicketAdmin(interaction))) return;
    const ticketId = interaction.customId.split(":")[2];
    updateTicket(ticketId, (ticket) => ({ ...ticket, claimedBy: interaction.user.tag }));
    const refreshed = findTicketByChannelId(interaction.channelId);
    if (refreshed) {
      await syncTicketPanelEmbeds(interaction.client, refreshed);
    }
    await interaction.reply({ content: `已由 ${interaction.user} 認領此工單。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId.startsWith("ticket:status:")) {
    if (!(await ensureTicketAdmin(interaction))) return;
    const [, , ticketId, status] = interaction.customId.split(":");
    const nextStatus = status as TicketStatus;
    updateTicket(ticketId, (ticket) => ({
      ...ticket,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date().toISOString() : ticket.completedAt
    }));
    const refreshed = findTicketByChannelId(interaction.channelId);
    if (refreshed) {
      await syncTicketChannelCategory(interaction, refreshed);
      await syncTicketChannelName(interaction, refreshed);
      await syncTicketPanelEmbeds(interaction.client, refreshed);
    }
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send(
        nextStatus === "paid"
          ? `工單狀態已更新為「${statusLabelMap[nextStatus]}」，管理員已確認付款。`
          : `工單狀態已更新為「${statusLabelMap[nextStatus]}」。`
      );
    }
    if (nextStatus === "completed") {
      await updateCompletedCounter(interaction.client, interaction.guildId!);
    }
    await interaction.reply({ content: `工單狀態已切換成 ${statusLabelMap[nextStatus]}。`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId.startsWith("ticket:close:")) {
    if (!(await ensureTicketAdmin(interaction))) return;
    const ticketId = interaction.customId.split(":")[2];
    const ticket = findTicketByChannelId(interaction.channelId);
    updateTicket(ticketId, (current) => ({
      ...current,
      status: "closed",
      closedAt: new Date().toISOString()
    }));
    const refreshed = findTicketByChannelId(interaction.channelId);
    if (refreshed) {
      await syncTicketChannelCategory(interaction, refreshed);
      await syncTicketChannelName(interaction, refreshed);
      await syncTicketPanelEmbeds(interaction.client, refreshed);
    }

    await interaction.reply({ content: "工單已關閉，頻道將在 5 秒後刪除。", flags: MessageFlags.Ephemeral });
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send("此工單已關閉，頻道將在 5 秒後刪除。");
    }

    if (ticket && interaction.channel?.isTextBased()) {
      await generateTranscript(interaction.channel, {
        ...ticket,
        status: ticket.status === "completed" ? ticket.status : "closed",
        closedAt: new Date().toISOString()
      });
    }

    if (interaction.channel && "delete" in interaction.channel) {
      setTimeout(async () => {
        const liveChannel = interaction.guild?.channels.cache.get(interaction.channelId) ?? interaction.channel;
        if (liveChannel && "delete" in liveChannel) {
          await liveChannel.delete("Ticket closed by support").catch((error) => {
            console.error("Delete ticket channel failed:", error);
          });
        }
      }, 5000);
    }
    return;
  }
};

const handleSelectMenu = async (interaction: StringSelectMenuInteraction) => {
  if (interaction.customId === "ticket:category" || interaction.customId === "selfticket:category") {
    const categoryId = interaction.values[0];
    const settings = resolveGuildSettings(interaction.guildId);
    if (!settings) {
      await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
      return;
    }
    const isSelfService = interaction.customId === "selfticket:category";
    const modal = new ModalBuilder()
      .setCustomId(`${isSelfService ? "selfticketModal" : "ticketModal"}:${categoryId}`)
      .setTitle(isSelfService ? "建立自助開單" : "建立工單");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("ticketReason")
          .setLabel(
            isSelfService
              ? "請輸入你的訂購或付款需求"
              : categoryId === "giveaway"
                ? "請輸入領獎資訊"
                : "請描述你的問題"
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
    return;
  }

  const ticket = findTicketByChannelId(interaction.channelId);
  if (!ticket) return;
  const settings = resolveGuildSettings(ticket.guildId);
  if (!settings) {
    await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
    return;
  }

  return;
};

const submitReview = async (interaction: Interaction) => {
  if (!interaction.isModalSubmit()) return;
  const settings = resolveGuildSettings(interaction.guildId);
  if (!settings) {
    await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
    return;
  }
  const stars = Number(interaction.customId.split(":")[1]);
  const content = interaction.fields.getTextInputValue("reviewContent");
  const review: ReviewRecord = {
    id: createId("review"),
    guildId: interaction.guildId ?? settings.guildId,
    userId: interaction.user.id,
    username: interaction.user.tag,
    avatarUrl: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
    stars,
    content,
    createdAt: new Date().toISOString()
  };
  addReview(review);

  if (settings.review.channelId) {
    const channel = await interaction.guild?.channels.fetch(settings.review.channelId).catch(() => null);
    if (channel?.isSendable()) {
      const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 256 });
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(settings.review.accentColor as `#${string}`)
            .setAuthor({ name: `${interaction.user.tag}｜顧客評價`, iconURL: avatarUrl })
            .setTitle(content.length <= 120 ? `「${content}」` : `「${content.slice(0, 117)}...」`)
            .setDescription(`**顧客評語**\n> ${content.replace(/\n/g, "\n> ")}`)
            .addFields(
              { name: "評分", value: starText(stars), inline: true },
              { name: "提交時間", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: "顧客", value: `${interaction.user}`, inline: true }
            )
            .setThumbnail(avatarUrl)
            .setFooter({ text: `${settings.brand.serverName}｜感謝顧客留下真實回饋` })
            .setTimestamp()
        ]
      });
    }
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(settings.review.accentColor as `#${string}`)
        .setTitle("✨ 評價已送出")
        .setDescription(`${settings.review.thankYouMessage}\n\n你的評分：${starText(stars)}`)
        .setFooter({ text: "感謝你願意留下真實回饋" })
        .setTimestamp()
    ],
    flags: MessageFlags.Ephemeral
  });
};

const createTicketTextChannel = async (
  guild: Guild,
  settings: GuildSettings,
  channelPrefix: string,
  username: string,
  userId: string
) => {
  let parentId: string | undefined;
  if (settings.ticket.categoryId) {
    const parentChannel = await guild.channels.fetch(settings.ticket.categoryId).catch(() => null);
    if (!parentChannel) {
      throw new Error("INVALID_TICKET_CATEGORY");
    }
    if (parentChannel.type !== ChannelType.GuildCategory) {
      throw new Error("TICKET_CATEGORY_NOT_CATEGORY");
    }
    parentId = parentChannel.id;
  }

  if (settings.ticket.supportRoleId) {
    const supportRole = await guild.roles.fetch(settings.ticket.supportRoleId).catch(() => null);
    if (!supportRole) {
      throw new Error("INVALID_SUPPORT_ROLE");
    }
  }

  return guild.channels.create({
    name: `${channelPrefix}-${username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: userId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      ...(settings.ticket.supportRoleId
        ? [{
            id: settings.ticket.supportRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }]
        : [])
    ]
  });
};

const submitTicket = async (interaction: Interaction) => {
  if (!interaction.isModalSubmit() || !interaction.guild) return;
  const settings = resolveGuildSettings(interaction.guildId);
  if (!settings) {
    await interaction.reply({ content: "這個群組目前還沒有加入多群組設定。", flags: MessageFlags.Ephemeral });
    return;
  }
  const categoryId = interaction.customId.split(":")[1];
  const selected = settings.ticket.categories.find((item) => item.id === categoryId) ?? settings.ticket.categories[0];
  const channelPrefix = channelPrefixByCategory[categoryId] ?? "工單";

  const reason =
    categoryId === "purchase" || categoryId === "cart"
      ? [
          `${categoryId === "purchase" ? "付款方式" : "預計付款方式"}：${interaction.fields.getTextInputValue("paymentMethod")}`,
          `商品名稱：${interaction.fields.getTextInputValue("productName")}`,
          `數量：${interaction.fields.getTextInputValue("quantity")}`,
          `遊戲 ID：${interaction.fields.getTextInputValue("gameId")}`
        ].join("\n")
      : interaction.fields.getTextInputValue("ticketReason");

  let channel: TextChannel;
  try {
    channel = await createTicketTextChannel(interaction.guild, settings, channelPrefix, interaction.user.username, interaction.user.id);
  } catch (error) {
    console.error("Create ticket channel failed:", error);
    const message =
      error instanceof Error && error.message === "INVALID_TICKET_CATEGORY"
        ? "工單分類區 ID 無效，請回網站檢查。"
        : error instanceof Error && error.message === "TICKET_CATEGORY_NOT_CATEGORY"
          ? "你填的工單分類區 ID 不是分類頻道，請改成真正的分類區 ID。"
          : error instanceof Error && error.message === "INVALID_SUPPORT_ROLE"
            ? "客服身分組 ID 無效，請回網站檢查。"
            : "建立工單頻道失敗，請檢查機器人是否擁有 Manage Channels、View Channels、Send Messages 權限。";
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const ticketId = createId("ticket");
  const ticket: TicketRecord = {
    id: ticketId,
    guildId: interaction.guildId ?? settings.guildId,
    channelId: channel.id,
    userId: interaction.user.id,
    username: interaction.user.tag,
    categoryId: selected.id,
    categoryLabel: selected.label,
    reason,
    status: categoryId === "purchase" || categoryId === "cart" ? "pending" : "processing",
    createdAt: new Date().toISOString()
  };
  const publicPanel = await channel.send({
    content: settings.ticket.supportRoleId ? `<@&${settings.ticket.supportRoleId}>` : undefined,
    embeds: [buildTicketEmbed(ticket, `${interaction.user}`)],
    components: buildTicketActionRows(ticketId)
  });

  let adminPanelMessageId: string | undefined;

  if (settings.ticket.logChannelId) {
    const logChannel = await interaction.guild.channels.fetch(settings.ticket.logChannelId).catch(() => null);
    if (logChannel?.isSendable()) {
      const adminPanel = await logChannel.send({
        embeds: [buildTicketEmbed(ticket, `${interaction.user}`)],
        components: []
      }).catch(() => null);
      adminPanelMessageId = adminPanel?.id;

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(settings.brand.primaryColor as `#${string}`)
            .setTitle("新工單建立")
            .setDescription(reason)
            .addFields(
              { name: "使用者", value: interaction.user.tag, inline: true },
              { name: "類型", value: selected.label, inline: true },
              { name: "頻道", value: `<#${channel.id}>`, inline: true }
            )
        ]
      });
    }
  }

  addTicket({
    ...ticket,
    publicPanelMessageId: publicPanel.id,
    adminPanelMessageId
  });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(ticketStatusToneMap[ticket.status].color)
        .setTitle("🎫 工單已建立")
        .setDescription(`你的 ${selected.label} 工單已成功建立，客服會在專屬頻道接手處理。`)
        .addFields(
          { name: "工單頻道", value: `<#${channel.id}>`, inline: true },
          { name: "目前狀態", value: `${ticketStatusToneMap[ticket.status].emoji} ${statusLabelMap[ticket.status]}`, inline: true },
          { name: "工單編號", value: ticket.id, inline: true }
        )
        .setFooter({ text: "稍後可在工單內追蹤付款、認領與處理進度" })
        .setTimestamp()
    ],
    flags: MessageFlags.Ephemeral
  });
};

const submitBalanceManageModal = async (interaction: Interaction) => {
  if (!interaction.isModalSubmit()) return;
  const [, mode, userId] = interaction.customId.split(":");
  const target = await interaction.client.users.fetch(userId).catch(() => null);
  if (!target) {
    await interaction.reply({ content: "找不到這位顧客。", flags: MessageFlags.Ephemeral });
    return;
  }

  const amount = Number(interaction.fields.getTextInputValue("amount"));
  const note = interaction.fields.getTextInputValue("note") ?? "";
  if (!Number.isFinite(amount) || amount < 0) {
    await interaction.reply({ content: "請輸入有效的金額。", flags: MessageFlags.Ephemeral });
    return;
  }

  if (mode === "add" || mode === "deduct") {
    adjustBalance({
      userId,
      username: target.tag,
      amount: mode === "deduct" ? -Math.floor(amount) : Math.floor(amount),
      note
    });
  } else if (mode === "spent_add" || mode === "spent_deduct") {
    adjustTotalSpent({
      userId,
      username: target.tag,
      amount: mode === "spent_deduct" ? -Math.floor(amount) : Math.floor(amount),
      note
    });
  } else {
    await interaction.reply({ content: "未知的餘額操作。", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    embeds: [buildBalanceManageEmbed(target)],
    components: buildBalanceManageRows(userId),
    flags: MessageFlags.Ephemeral
  });
};

export const createStorefrontOrderTicket = async (client: Client, order: StoreOrderRecord) => {
  const settings = resolveGuildSettings(loadSettings().guildId);
  if (!settings) return null;
  const guild = await client.guilds.fetch(settings.guildId).catch(() => null);
  if (!guild) return null;

  let parentId: string | undefined;
  if (settings.ticket.categoryId) {
    const parentChannel = await guild.channels.fetch(settings.ticket.categoryId).catch(() => null);
    if (parentChannel?.type === ChannelType.GuildCategory) {
      parentId = parentChannel.id;
    }
  }

  const supportRole = settings.ticket.supportRoleId
    ? await guild.roles.fetch(settings.ticket.supportRoleId).catch(() => null)
    : null;

  let channel: TextChannel;
  try {
    channel = await guild.channels.create({
      name: `網站訂單-${order.customerDisplayName || order.customerUsername}`.slice(0, 90),
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        ...(supportRole
          ? [{
              id: supportRole.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
              ]
            }]
          : [])
      ]
    });
  } catch (error) {
    console.error("Create storefront ticket channel failed:", error);
    return null;
  }

  const reason = [
    `商城訂單編號：${order.id}`,
    `顧客帳號：${order.customerUsername}`,
    `顧客名稱：${order.customerDisplayName}`,
    `付款方式：${order.paymentMethodLabel}`,
    `交付帳號：${order.deliveryAccount || "未填"}`,
    `聯絡方式：${order.contact || "未填"}`,
    `商品內容：${order.items.map((item) => `${item.name} x${item.quantity}`).join("、")}`,
    `總金額：${order.totalAmount} NT`,
    `顧客備註：${order.note || "無"}`
  ].join("\n");

  const ticketId = createId("ticket");
  const ticket: TicketRecord = {
    id: ticketId,
    guildId: guild.id,
    channelId: channel.id,
    userId: order.customerId,
    username: `商城顧客｜${order.customerUsername}`,
    categoryId: "purchase",
    categoryLabel: "網站訂單",
    reason,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const publicPanel = await channel.send({
    content: supportRole ? `<@&${supportRole.id}>` : undefined,
    embeds: [buildTicketEmbed(ticket, order.customerDisplayName)],
    components: buildTicketActionRows(ticketId)
  }).catch(() => null);

  let adminPanelMessageId: string | undefined;

  if (settings.ticket.logChannelId) {
    const logChannel = await guild.channels.fetch(settings.ticket.logChannelId).catch(() => null);
    if (logChannel?.isSendable()) {
      const adminPanel = await logChannel.send({
        embeds: [buildTicketEmbed(ticket, order.customerDisplayName)],
        components: []
      }).catch(() => null);
      adminPanelMessageId = adminPanel?.id;

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(settings.brand.primaryColor as `#${string}`)
            .setTitle("商城網站新訂單")
            .setDescription(reason)
            .addFields(
              { name: "訂單編號", value: order.id, inline: true },
              { name: "內部頻道", value: `<#${channel.id}>`, inline: true },
              { name: "付款方式", value: order.paymentMethodLabel, inline: true }
            )
        ]
      }).catch(() => null);
    }
  }

  addTicket({
    ...ticket,
    publicPanelMessageId: publicPanel?.id,
    adminPanelMessageId
  });

  return {
    ticketId: ticket.id,
    ticketChannelId: channel.id
  };
};

export const sendStorefrontOrderNotification = async (client: Client, order: StoreOrderRecord) => {
  const settings = resolveGuildSettings(loadSettings().guildId);
  if (!settings?.storefront.notificationChannelId) return false;
  const channel = await client.channels.fetch(settings.storefront.notificationChannelId).catch(() => null);
  if (!channel?.isSendable()) return false;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(settings.brand.primaryColor as `#${string}`)
        .setTitle("商城網站新訂單通知")
        .setDescription(order.items.map((item) => `${item.name} x${item.quantity}`).join("、"))
        .addFields(
          { name: "顧客", value: `${order.customerDisplayName} (${order.customerUsername})`, inline: true },
          { name: "付款方式", value: order.paymentMethodLabel, inline: true },
          { name: "總金額", value: `${order.totalAmount} NT`, inline: true },
          { name: "交付帳號", value: order.deliveryAccount || "未填", inline: true },
          { name: "聯絡方式", value: order.contact || "未填", inline: true },
          { name: "對應訂單頻道", value: order.ticketChannelId ? `<#${order.ticketChannelId}>` : "尚未建立", inline: false }
        )
        .setFooter({ text: `商城訂單編號：${order.id}` })
        .setTimestamp()
    ]
  }).catch(() => null);

  return true;
};

export const sendProductAnnouncement = async (client: Client, product: ProductItem) => {
  const baseSettings = loadSettings();
  const targetGuildId = baseSettings.storefront.productAnnouncementGuildId || baseSettings.guildId;
  const targetGuildSettings = resolveGuildSettings(targetGuildId);
  if (!targetGuildSettings) return false;

  const linkedGuild = baseSettings.linkedGuilds.find((item) => item.enabled && item.guildId === targetGuildId);
  const targetChannelId = targetGuildId === baseSettings.guildId
    ? baseSettings.storefront.productAnnouncementChannelId
    : linkedGuild?.productAnnouncementChannelId || baseSettings.storefront.productAnnouncementChannelId;

  if (!targetChannelId) return false;

  const channel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!channel?.isSendable()) return false;

  const embed = new EmbedBuilder()
    .setColor(targetGuildSettings.brand.secondaryColor as `#${string}`)
    .setTitle(`新貨上架｜${product.name || "未命名商品"}`)
    .setDescription(product.description?.trim() || "後台已上架新商品，現在可以直接查看並下單。")
    .addFields(
      { name: "分類", value: product.category?.trim() || "未分類", inline: true },
      { name: "價格", value: product.priceLabel?.trim() || "未設定", inline: true },
      { name: "狀態", value: product.featured ? "精選商品" : "一般商品", inline: true },
      { name: "庫存", value: product.stockStatus === "out_of_stock" ? "缺貨中" : product.stockStatus === "restocking" ? "補貨中" : "現貨供應", inline: true }
    )
    .setFooter({ text: `商品 ID：${product.id}` })
    .setTimestamp();

  if (product.imageUrl?.trim()) {
    embed.setImage(product.imageUrl.trim());
  }

  await channel.send({
    content: "新貨通知",
    embeds: [embed]
  }).catch(() => null);

  return true;
};

export const startDiscordBot = async () => {
  if (!env.discordToken) {
    console.warn("DISCORD_TOKEN 未設定，將只啟動 API 與網站功能。");
    return null;
  }
  const client = createDiscordClient();
  await client.login(env.discordToken);
  return client;
};

export const getDiscordClient = () => activeDiscordClient;
