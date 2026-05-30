const defaultDashboardAccounts = (adminKey) => [
    {
        id: "account-admin",
        username: "admin",
        password: adminKey,
        role: "admin",
        enabled: true,
        displayName: "主管理員",
        authMode: "both",
        allowedGuildIds: ["*"]
    },
    {
        id: "account-owner",
        username: "owner",
        password: adminKey,
        role: "owner",
        enabled: true,
        displayName: "老闆",
        authMode: "both",
        allowedGuildIds: ["*"]
    },
    {
        id: "account-developer",
        username: "developer",
        password: adminKey,
        role: "developer",
        enabled: true,
        displayName: "開發者",
        authMode: "both",
        allowedGuildIds: ["*"]
    }
];
export const defaultGuildSettings = (guildId, adminKey) => ({
    guildId,
    linkedGuilds: [],
    adminKey,
    accounts: defaultDashboardAccounts(adminKey),
    storefront: {
        enabled: true,
        heroTitle: "星光商城",
        heroDescription: "把商品展示、會員註冊、購物車與開單付款流程放在同一個官方網站。",
        supportGoogleLogin: true,
        googleLoginConfigured: false,
        googleClientId: "",
        googleRedirectUrl: "",
        notificationChannelId: "",
        productAnnouncementGuildId: guildId,
        productAnnouncementChannelId: "",
        paymentMethods: [
            {
                id: "payment-cvs",
                label: "超商代碼繳費（歐付寶）",
                instructions: "送出後會跳轉到歐付寶建立超商代碼，完成後系統會回傳付款資訊。",
                accountInfo: "此付款方式不需要先手動填銀行帳戶，系統會建立超商代碼。",
                enabled: true
            },
            {
                id: "payment-cvs-direct",
                label: "超商代碼繳費（PAYUNi直出）",
                instructions: "送出後會直接由後端取號並回傳超商付款代碼，不走歐付寶頁面。",
                accountInfo: "此付款方式預留給 PAYUNi 直出代碼模式使用。",
                enabled: true
            },
            {
                id: "payment-bank",
                label: "銀行轉帳",
                instructions: "送出訂單後，管理員會回覆轉帳資訊與後續確認方式。",
                accountInfo: "中信銀行 822｜帳號 123456789012｜戶名請到後台自行改成你的真實資料",
                enabled: true
            }
        ]
    },
    brand: {
        serverName: "Nova Support Studio",
        tagline: "商城訂單、客服與自動化的整合控制台",
        primaryColor: "#ff7a18",
        secondaryColor: "#16c6ff",
        surfaceStyle: "glass"
    },
    moderation: {
        antiSpamEnabled: true,
        spamMessageLimit: 5,
        spamWindowSeconds: 8,
        timeoutMinutes: 10,
        logChannelId: ""
    },
    review: {
        enabled: true,
        channelId: "",
        panelTitle: "留下你的服務評價",
        panelDescription: "點擊星等並留下回饋，幫助我們把商城服務做得更好。",
        accentColor: "#f59e0b",
        thankYouMessage: "謝謝你的評價，我們已收到你的回饋。"
    },
    ticket: {
        enabled: true,
        categoryId: "",
        paidCategoryId: "",
        supportRoleId: "",
        autoRoleId: "",
        logChannelId: "",
        transcriptChannelId: "",
        allowDashboardClose: true,
        completedCountChannelId: "",
        completedCountLabel: "📊｜完成的票單數",
        panelTitle: "商城客服中心",
        panelDescription: "購買商品、抽獎領取、售後問題與一般詢問都可以在這裡快速建立工單。",
        buttonLabel: "建立工單",
        buttonEmoji: "🎫",
        maxOpenTicketsPerUser: 1,
        categories: [
            { id: "purchase", label: "開單購買", emoji: "🛒" },
            { id: "cart", label: "購物車", emoji: "🧺" },
            { id: "giveaway", label: "抽獎領取", emoji: "🎁" },
            { id: "question", label: "問題詢問", emoji: "❓" }
        ],
        products: [
            {
                id: "web-hosting-900",
                name: "網站託管",
                category: "服務方案",
                priceLabel: "900 元",
                description: "提供網站托管、基本維護與上線支援，適合需要穩定代管的顧客。",
                imageUrl: "",
                stockStatus: "in_stock",
                stockNote: "現貨供應中",
                enabled: true
            },
            {
                id: "bot-work-500",
                name: "機器人代做",
                category: "服務方案",
                priceLabel: "500 元",
                description: "客製化 Discord 機器人代做與流程串接，依需求協助規劃。",
                imageUrl: "",
                stockStatus: "in_stock",
                stockNote: "現貨供應中",
                enabled: true
            },
            {
                id: "site-work-700",
                name: "網站代做",
                category: "服務方案",
                priceLabel: "700 元",
                description: "網站版型與基礎前台製作服務，適合快速建立品牌頁面。",
                imageUrl: "",
                stockStatus: "in_stock",
                stockNote: "現貨供應中",
                enabled: true
            }
        ],
        blacklist: []
    },
    autoReplies: [
        {
            id: "pricing-guide",
            enabled: true,
            trigger: "價格表",
            response: "若要查看完整商品與價格，請開啟購物單，我們會提供最新報價與付款方式。",
            matchMode: "includes",
            ignoreCase: true,
            cooldownSeconds: 15
        }
    ],
    faq: [
        { id: "faq-payment", question: "付款方式有哪些？", answer: "目前支援 8591、銀行轉帳與 LINE Pay，詳細以客服回覆為準。" },
        { id: "faq-delivery", question: "多久會完成？", answer: "一般會依排單狀況於客服確認後盡快處理，尖峰時段可能稍有延遲。" }
    ]
});
//# sourceMappingURL=index.js.map