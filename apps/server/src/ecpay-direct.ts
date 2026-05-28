import crypto from "node:crypto";
import { env } from "./config.js";

export type DirectCodeSubPayment = "CVS" | "FAMILY" | "IBON" | "OKMART" | "HILIFE";

type CreateDirectCodeInput = {
  amount: number;
  itemName: string;
  tradeDesc: string;
  buyerName?: string;
  merchantTradeNo: string;
  subPayment: DirectCodeSubPayment;
};

type EcpayEnvelope = {
  MerchantID: string;
  RqHeader: {
    Timestamp: number;
  };
  Data: string;
};

type DirectCodeResult = {
  merchantTradeNo: string;
  providerTradeNo?: string;
  paymentCode: string;
  expireAt?: string;
  storeType: DirectCodeSubPayment;
  raw: unknown;
};

const encodeUpper = (value: string) => encodeURIComponent(value);

const encryptAes = (jsonPayload: unknown) => {
  const plain = encodeUpper(JSON.stringify(jsonPayload));
  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    Buffer.from(env.ecpayDirectHashKey, "utf8"),
    Buffer.from(env.ecpayDirectHashIv, "utf8")
  );
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
};

const decryptAes = (cipherText: string) => {
  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    Buffer.from(env.ecpayDirectHashKey, "utf8"),
    Buffer.from(env.ecpayDirectHashIv, "utf8")
  );
  decipher.setAutoPadding(true);
  const decoded = Buffer.concat([decipher.update(cipherText, "base64"), decipher.final()]).toString("utf8");
  return JSON.parse(decodeURIComponent(decoded)) as Record<string, any>;
};

const resolveStoreType = (subPayment: DirectCodeSubPayment) => {
  switch (subPayment) {
    case "IBON":
      return "ibon";
    case "FAMILY":
      return "family";
    case "OKMART":
      return "okmart";
    case "HILIFE":
      return "hilife";
    default:
      return "";
  }
};

const buildTradeDate = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const isDirectCodeConfigured = () =>
  Boolean(env.ecpayDirectMerchantId && env.ecpayDirectHashKey && env.ecpayDirectHashIv && env.ecpayDirectReturnUrl);

export const createDirectCode = async (input: CreateDirectCodeInput): Promise<DirectCodeResult> => {
  if (!isDirectCodeConfigured()) {
    throw new Error("ECPAY_DIRECT_NOT_CONFIGURED");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = {
    MerchantID: env.ecpayDirectMerchantId,
    ChoosePayment: "CVS",
    OrderInfo: {
      MerchantTradeNo: input.merchantTradeNo.slice(0, 20),
      MerchantTradeDate: buildTradeDate(new Date()),
      TotalAmount: Math.max(1, Math.floor(input.amount)),
      ReturnURL: env.ecpayDirectReturnUrl,
      TradeDesc: input.tradeDesc.slice(0, 200),
      ItemName: input.itemName.slice(0, 200)
    },
    CVSInfo: {
      StoreExpireDate: 7,
      Desc_1: input.buyerName?.slice(0, 20) || "",
      StoreType: resolveStoreType(input.subPayment)
    }
  };

  const envelope: EcpayEnvelope = {
    MerchantID: env.ecpayDirectMerchantId,
    RqHeader: { Timestamp: timestamp },
    Data: encryptAes(payload)
  };

  const endpoint = env.ecpayDirectStage
    ? "https://ecpayment-stage.ecpay.com.tw/1.0.0/Cashier/GenPaymentCode"
    : "https://ecpayment.ecpay.com.tw/1.0.0/Cashier/GenPaymentCode";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(envelope)
  });

  if (!response.ok) {
    throw new Error(`ECPAY_DIRECT_HTTP_${response.status}`);
  }

  const raw = await response.json() as {
    Data?: string;
    TransCode?: number;
    TransMsg?: string;
  };

  if (!raw.Data) {
    throw new Error(raw.TransMsg || "ECPAY_DIRECT_EMPTY_DATA");
  }

  const data = decryptAes(raw.Data);
  const rtnCode = Number(data?.RtnCode ?? data?.TransCode ?? 0);
  if (!(raw.TransCode === 1 && rtnCode === 1)) {
    throw new Error(String(data?.RtnMsg || raw.TransMsg || "ECPAY_DIRECT_FAILED"));
  }

  const cvsInfo = data?.CVSInfo ?? {};
  return {
    merchantTradeNo: String(data?.MerchantTradeNo ?? input.merchantTradeNo),
    providerTradeNo: String(data?.TradeNo ?? ""),
    paymentCode: String(cvsInfo?.PaymentNo ?? data?.PaymentNo ?? ""),
    expireAt: String(cvsInfo?.ExpireDate ?? data?.ExpireDate ?? ""),
    storeType: input.subPayment,
    raw: data
  };
};
