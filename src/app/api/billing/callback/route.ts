import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPaymentStatusByInvoiceId } from "@/lib/myfatoorah/client";
import {
  activateSubscriptionForTransaction,
  markTransactionFailed,
} from "@/lib/myfatoorah/activate-subscription";

/** Browser redirect after MyFatoorah hosted payment (also used as CallBackUrl). */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const transactionId = searchParams.get("transactionId");
  const status = searchParams.get("status");

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: tx } = await service
    .from("payment_transactions")
    .select("id, status, invoice_id")
    .eq("id", transactionId)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (tx.status === "paid") {
    return NextResponse.redirect(
      new URL(`/billing/complete?transactionId=${transactionId}&result=success`, request.url)
    );
  }

  if (status === "failed") {
    await markTransactionFailed(service, transactionId);
    return NextResponse.redirect(
      new URL(`/billing/complete?transactionId=${transactionId}&result=failed`, request.url)
    );
  }

  if (tx.invoice_id) {
    try {
      const paymentStatus = await getPaymentStatusByInvoiceId(tx.invoice_id);
      const paid =
        paymentStatus.InvoiceStatus === "Paid" ||
        paymentStatus.TransactionStatus === "Succss" ||
        paymentStatus.TransactionStatus === "Success";

      if (paid) {
        await activateSubscriptionForTransaction(service, transactionId, {
          invoiceId: tx.invoice_id,
          paymentId: paymentStatus.PaymentId,
          mfReference: paymentStatus.InvoiceReference,
        });
        return NextResponse.redirect(
          new URL(`/billing/complete?transactionId=${transactionId}&result=success`, request.url)
        );
      }
    } catch {
      // Webhook may still activate; show pending page
    }
  }

  return NextResponse.redirect(
    new URL(`/billing/complete?transactionId=${transactionId}&result=pending`, request.url)
  );
}
