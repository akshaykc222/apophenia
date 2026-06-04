import { Resend } from "resend";

// Ensure this environment variable is set in your environment
const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");

export async function sendReceiptEmail(params: {
  toEmail: string;
  planName: string;
  transactionId: string;
  amount: number | null;
  expiresAt: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping email receipt sending.");
    return;
  }

  const { toEmail, planName, transactionId, amount, expiresAt } = params;

  try {
    const data = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ?? "Billing <billing@kuwaittoday.example>",
      to: toEmail,
      subject: `إيصال دفع: تفعيل اشتراك ${planName}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
          <h2>شكراً لاشتراكك!</h2>
          <p>لقد تم تفعيل اشتراكك بنجاح في خطة <strong>${planName}</strong>.</p>
          <ul>
            <li><strong>رقم العملية:</strong> ${transactionId}</li>
            ${amount !== null ? `<li><strong>المبلغ المدفوع:</strong> ${amount} د.ك</li>` : ""}
            ${expiresAt ? `<li><strong>تاريخ الانتهاء:</strong> ${new Date(expiresAt).toLocaleDateString("ar-KW")}</li>` : `<li><strong>صلاحية الاشتراك:</strong> مدى الحياة</li>`}
          </ul>
          <p>يمكنك الآن العودة إلى التطبيق والاستمتاع بجميع المميزات.</p>
        </div>
      `,
    });

    return data;
  } catch (error) {
    console.error("Failed to send receipt email:", error);
    throw error;
  }
}
