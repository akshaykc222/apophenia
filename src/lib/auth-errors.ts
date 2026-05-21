export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "بيانات الدخول غير صحيحة. أنشئ الحساب من «إعداد أول مسؤول» أو أعد تعيين كلمة المرور في Supabase.";
  }
  if (lower.includes("email not confirmed")) {
    return "يرجى تأكيد البريد الإلكتروني من رابط Supabase أولاً.";
  }
  if (lower.includes("user already registered")) {
    return "هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول أو استعادة كلمة المرور.";
  }
  return message;
}
