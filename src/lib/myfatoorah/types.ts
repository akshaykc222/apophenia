export interface MyFatoorahApiResponse<T> {
  IsSuccess: boolean;
  Message: string;
  ValidationErrors?: { Name: string; Error: string }[];
  Data: T;
}

export interface SendPaymentData {
  InvoiceId: number;
  InvoiceURL: string;
  CustomerReference: string;
  UserDefinedField: string;
}

export interface InitiateSessionData {
  SessionId: string;
  CountryCode: string;
  CustomerTokens?: unknown[];
}

export interface ExecutePaymentData {
  InvoiceId: number;
  IsDirectPayment: boolean;
  PaymentURL: string;
  CustomerReference: string;
  UserDefinedField: string;
  RecurringId?: string;
}

export interface GetPaymentStatusData {
  InvoiceId: number;
  InvoiceStatus: string;
  InvoiceReference: string;
  CustomerReference: string;
  CreatedDate: string;
  ExpiryDate: string;
  InvoiceValue: number;
  Comments: string;
  CustomerName: string;
  CustomerMobile: string;
  CustomerEmail: string;
  TransactionDate: string;
  PaymentGateway: string;
  ReferenceId: string;
  TrackId: string;
  TransactionId: string;
  PaymentId: string;
  AuthorizationId: string;
  TransactionStatus: string;
  TransationValue: string;
  CustomerServiceCharge: string;
  DueValue: string;
  PaidCurrency: string;
  PaidCurrencyValue: string;
  VatAmount: string;
  IpAddress: string;
  Country: string;
  Currency: string;
  Error: string;
  CardNumber: string;
  ErrorCode: string;
}

export interface WebhookV2Event {
  Event: {
    Code: number;
    Name: string;
    CountryIsoCode: string;
    CreationDate: string;
    Reference: string;
  };
  Data: WebhookPaymentStatusData;
}

export interface WebhookPaymentStatusData {
  Invoice: {
    Id: string;
    Status: string;
    Reference: string;
    CreationDate?: string;
    ExpirationDate?: string;
    UserDefinedField?: string;
    ExternalIdentifier?: string;
    MetaData?: Record<string, string>;
  };
  Transaction: {
    Id: string;
    Status: string;
    PaymentMethod?: string;
    PaymentId: string;
    ReferenceId?: string;
    TrackId?: string;
    AuthorizationId?: string;
    TransactionDate?: string;
    Error?: { Code?: string; Message?: string };
  };
  Customer?: {
    Name?: string;
    Mobile?: string;
    Email?: string;
  };
  Amount?: Record<string, string>;
}
