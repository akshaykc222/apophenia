import { getMyFatoorahConfig } from "./config";
import type {
  ExecutePaymentData,
  GetPaymentStatusData,
  InitiateSessionData,
  MyFatoorahApiResponse,
  SendPaymentData,
} from "./types";

async function mfRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<MyFatoorahApiResponse<T>> {
  const { apiKey, baseUrl, isConfigured } = getMyFatoorahConfig();
  if (!isConfigured || !apiKey) {
    throw new Error("MyFatoorah API key is not configured");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as MyFatoorahApiResponse<T>;
  if (!res.ok || !json.IsSuccess) {
    const detail =
      json.ValidationErrors?.map((e) => `${e.Name}: ${e.Error}`).join("; ") ||
      json.Message ||
      res.statusText;
    throw new Error(`MyFatoorah ${path}: ${detail}`);
  }

  return json;
}

export async function initiateSession(customerIdentifier: string) {
  const result = await mfRequest<InitiateSessionData>("/v2/InitiateSession", {
    CustomerIdentifier: customerIdentifier,
  });
  return result.Data;
}

/** Hosted payment page — returns InvoiceURL for browser redirect (Flutter url_launcher). */
export async function sendPayment(params: {
  invoiceValue: number;
  customerName: string;
  customerReference: string;
  callBackUrl: string;
  errorUrl: string;
  customerEmail?: string;
  customerMobile?: string;
  mobileCountryCode?: string;
  userDefinedField?: string;
  language?: "AR" | "EN";
}) {
  const { currency } = getMyFatoorahConfig();
  const mobile = (params.customerMobile ?? "").replace(/\D/g, "").slice(0, 11);

  const payload: Record<string, unknown> = {
    NotificationOption: "LNK",
    InvoiceValue: params.invoiceValue,
    DisplayCurrencyIso: currency,
    CustomerName: params.customerName,
    CustomerEmail: params.customerEmail ?? "",
    CustomerReference: params.customerReference,
    CallBackUrl: params.callBackUrl,
    ErrorUrl: params.errorUrl,
    UserDefinedField: params.userDefinedField ?? params.customerReference,
    Language: params.language ?? "AR",
  };

  if (mobile.length >= 7) {
    payload.MobileCountryCode = params.mobileCountryCode ?? "965";
    payload.CustomerMobile = mobile;
  }

  const result = await mfRequest<SendPaymentData>("/v2/SendPayment", payload);
  return result.Data;
}

export async function executePayment(params: {
  sessionId: string;
  invoiceValue: number;
  customerReference: string;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  callBackUrl: string;
  errorUrl: string;
  userDefinedField?: string;
}) {
  const { currency } = getMyFatoorahConfig();
  const result = await mfRequest<ExecutePaymentData>("/v2/ExecutePayment", {
    SessionId: params.sessionId,
    InvoiceValue: params.invoiceValue,
    DisplayCurrencyIso: currency,
    CustomerReference: params.customerReference,
    CustomerName: params.customerName,
    CustomerEmail: params.customerEmail ?? "",
    CustomerMobile: params.customerMobile ?? "",
    CustomerIdentifier: params.customerReference,
    CallBackUrl: params.callBackUrl,
    ErrorUrl: params.errorUrl,
    UserDefinedField: params.userDefinedField ?? params.customerReference,
    Language: "AR",
  });
  return result.Data;
}

export async function getPaymentStatusByInvoiceId(invoiceId: string) {
  const result = await mfRequest<GetPaymentStatusData>("/v2/GetPaymentStatus", {
    Key: invoiceId,
    KeyType: "InvoiceId",
  });
  return result.Data;
}
