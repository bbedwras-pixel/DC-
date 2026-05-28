import crypto from "node:crypto";
import { env } from "./config.js";

type CreateCvsCheckoutInput = {
  amount: number;
  itemName: string;
  tradeDesc: string;
  merchantTradeNo?: string;
  returnUrl?: string;
  paymentInfoUrl?: string;
  clientBackUrl?: string;
  subPayment?: "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";
};

const formatTradeDate = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const buildMerchantTradeNo = () => {
  const raw = `DC${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return raw.slice(0, 20);
};

const dotNetEncode = (value: string) =>
  encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2a/g, "*");

const generateCheckMacValue = (fields: Record<string, string>) => {
  const sorted = Object.entries(fields)
    .filter(([key]) => key !== "CheckMacValue")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const raw = `HashKey=${env.opayHashKey}&${sorted}&HashIV=${env.opayHashIv}`;
  return crypto.createHash("sha256").update(dotNetEncode(raw)).digest("hex").toUpperCase();
};

export const isOpayConfigured = () =>
  Boolean(env.opayMerchantId && env.opayHashKey && env.opayHashIv && env.opayReturnUrl);

export const createCvsCheckout = (input: CreateCvsCheckoutInput) => {
  if (!isOpayConfigured()) {
    throw new Error("OPAY_NOT_CONFIGURED");
  }

  const fields: Record<string, string> = {
    MerchantID: env.opayMerchantId,
    MerchantTradeNo: (input.merchantTradeNo || buildMerchantTradeNo()).slice(0, 20),
    MerchantTradeDate: formatTradeDate(new Date()),
    PaymentType: "aio",
    TotalAmount: String(Math.max(1, Math.floor(input.amount))),
    TradeDesc: input.tradeDesc.slice(0, 200),
    ItemName: input.itemName.slice(0, 200),
    ReturnURL: input.returnUrl || env.opayReturnUrl,
    ChoosePayment: "CVS",
    EncryptType: "1",
    StoreExpireDate: "7"
  };

  if (input.subPayment && input.subPayment !== "CVS") {
    fields.ChooseSubPayment = input.subPayment;
  }
  if (input.paymentInfoUrl || env.opayPaymentInfoUrl) {
    fields.PaymentInfoURL = input.paymentInfoUrl || env.opayPaymentInfoUrl;
  }
  if (input.clientBackUrl || env.opayClientBackUrl) {
    fields.ClientBackURL = input.clientBackUrl || env.opayClientBackUrl;
  }
  fields.CheckMacValue = generateCheckMacValue(fields);

  return {
    action: env.opayStage
      ? "https://payment-stage.opay.tw/Cashier/AioCheckOut/V5"
      : "https://payment.opay.tw/Cashier/AioCheckOut/V5",
    fields
  };
};
