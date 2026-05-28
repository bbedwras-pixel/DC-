import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const required = (key: string, fallback = "") => process.env[key] ?? fallback;
const parseOrigins = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const isPrivateHttpOrigin = (value: string) => {
  try {
    const url = new URL(value);
    const { protocol, hostname } = url;
    if (!["http:", "https:"].includes(protocol)) return false;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

export const env = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: required("DISCORD_GUILD_ID", "local-dev-guild"),
  port: Number(required("PORT", "3001")),
  dataDir: required("DATA_DIR"),
  webOrigin: required("WEB_ORIGIN", "http://localhost:5173"),
  webOrigins: parseOrigins(required("WEB_ORIGIN", "http://localhost:5173")),
  defaultAdminKey: required("DEFAULT_ADMIN_KEY", "change-me"),
  opayMerchantId: required("OPAY_MERCHANT_ID"),
  opayHashKey: required("OPAY_HASH_KEY"),
  opayHashIv: required("OPAY_HASH_IV"),
  opayStage: required("OPAY_STAGE", "true") === "true",
  opayReturnUrl: required("OPAY_RETURN_URL"),
  opayPaymentInfoUrl: required("OPAY_PAYMENT_INFO_URL"),
  opayClientBackUrl: required("OPAY_CLIENT_BACK_URL", "http://localhost:5173"),
  ecpayDirectMerchantId: required("ECPAY_DIRECT_MERCHANT_ID"),
  ecpayDirectHashKey: required("ECPAY_DIRECT_HASH_KEY"),
  ecpayDirectHashIv: required("ECPAY_DIRECT_HASH_IV"),
  ecpayDirectStage: required("ECPAY_DIRECT_STAGE", "true") === "true",
  ecpayDirectReturnUrl: required("ECPAY_DIRECT_RETURN_URL"),
  payuniMerchantId: required("PAYUNI_MERCHANT_ID"),
  payuniHashKey: required("PAYUNI_HASH_KEY"),
  payuniHashIv: required("PAYUNI_HASH_IV"),
  payuniStage: required("PAYUNI_STAGE", "true") === "true",
  payuniNotifyUrl: required("PAYUNI_NOTIFY_URL"),
  payuniReturnUrl: required("PAYUNI_RETURN_URL"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUrl: required("GOOGLE_REDIRECT_URL"),
  discordClientSecret: required("DISCORD_CLIENT_SECRET"),
  discordOauthRedirectUrl: required("DISCORD_OAUTH_REDIRECT_URL"),
  isPrivateHttpOrigin
};
