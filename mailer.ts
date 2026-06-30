// Pluggable one-time-password sender.
//
// The voting flow only needs `sendOtp(email, code)`. Delivery is abstracted so
// the provider can be swapped (Resend today, SMTP/SMS later) without touching
// the API handlers. The provider is chosen from environment variables at
// startup; if none is configured we fall back to a log-only sender so local
// development still works.

export interface OtpSender {
  readonly name: string;
  send(toEmail: string, code: string): Promise<void>;
}

function otpEmailHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="text-transform: uppercase; letter-spacing: -1px;">KKTC Belediye Anketi 2026</h2>
      <p>Oy kullanımınızı doğrulamak için aşağıdaki tek kullanımlık kodu girin:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background:#1a1a1a; color:#fff; padding:16px; text-align:center; font-family: monospace;">${code}</p>
      <p style="font-size: 12px; opacity: 0.7;">Bu kod 10 dakika içinde geçerliliğini yitirecektir. Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
      <p style="font-size: 12px; opacity: 0.7;">İletişim bilgileriniz oylarınızla ilişkilendirilmez; yalnızca tek kişi tek oy ilkesini korumak için kullanılır.</p>
    </div>
  `;
}

// Logs the code instead of sending. Used when no provider is configured
// (e.g. local development) so the flow remains testable.
class LogOnlySender implements OtpSender {
  readonly name = "log-only";
  async send(toEmail: string, code: string): Promise<void> {
    console.log(`[OTP LOG-ONLY] No mail provider configured. Code for ${toEmail}: ${code}`);
  }
}

class ResendSender implements OtpSender {
  readonly name = "resend";
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(toEmail: string, code: string): Promise<void> {
    // Use the REST API directly to avoid pulling in the SDK as a hard
    // dependency at build time. Resend's endpoint is a simple JSON POST.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [toEmail],
        subject: "KKTC Belediye Anketi - Doğrulama Kodu",
        html: otpEmailHtml(code),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend delivery failed (${res.status}): ${detail}`);
    }
  }
}

let cachedSender: OtpSender | null = null;

export function getOtpSender(): OtpSender {
  if (cachedSender) return cachedSender;

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_FROM_EMAIL || "onboarding@resend.dev";

  if (resendKey) {
    cachedSender = new ResendSender(resendKey, from);
  } else {
    cachedSender = new LogOnlySender();
  }

  console.log(`OTP sender initialized: ${cachedSender.name} (from: ${from})`);
  return cachedSender;
}
