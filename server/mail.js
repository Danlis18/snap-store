import nodemailer from "nodemailer";

// HTTPS delivery also works where outbound SMTP is unavailable (Railway Hobby).
// The injectable transport keeps tests local: no test emails leave the machine.
export function createMailService(env = process.env, { fetchImpl = fetch, transportFactory = nodemailer.createTransport } = {}) {
  const from = env.MAIL_FROM?.trim();
  const requested = env.MAIL_PROVIDER?.trim().toLowerCase();
  const provider = requested || (env.RESEND_API_KEY ? "resend" : "smtp");
  const required = provider === "resend"
    ? ["RESEND_API_KEY", "MAIL_FROM"]
    : ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
  const missing = required.filter((name) => !env[name]?.trim());
  if (!["smtp", "resend"].includes(provider)) missing.push("MAIL_PROVIDER");
  const ready = missing.length === 0;
  const smtp = ready && provider === "smtp" ? transportFactory({
    host: env.SMTP_HOST.trim(),
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  }) : null;

  return {
    ready, provider, missing,
    async sendMail({ to, subject, text, html, idempotencyKey }) {
      if (!ready) throw Object.assign(new Error("Mail is not configured"), { code: "MAIL_NOT_CONFIGURED" });
      if (smtp) {
        const result = await smtp.sendMail({ from, to, subject, text, ...(html ? { html } : {}) });
        if (result.rejected?.length) throw Object.assign(new Error("Recipient rejected"), { code: "MAIL_RECIPIENT_REJECTED" });
        return result;
      }
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text, ...(html ? { html } : {}) }),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.id) {
        // Never log provider response bodies, addresses, OTPs, or credentials.
        throw Object.assign(new Error("Email provider rejected the request"), { code: `MAIL_HTTP_${response.status}` });
      }
      return { messageId: result.id };
    },
  };
}

export function loginEmail(code, lang = "uk") {
  const en = lang === "en";
  const heading = en ? "Your SNAP sign-in code" : "Твій код входу в SNAP";
  const note = en
    ? "Valid for 10 minutes. Never share this code. If you did not request it, ignore this email."
    : "Діє 10 хвилин. Нікому не повідомляй цей код. Якщо ти його не запитував, просто ігноруй лист.";
  return {
    subject: en ? "SNAP — sign-in code" : "SNAP — код входу",
    text: `${heading}: ${code}\n${note}`,
    html: `<!doctype html><html lang="${en ? "en" : "uk"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${heading}</title></head><body style="margin:0;background-color:#f5f6f8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:16px;padding-right:16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding-top:28px;padding-bottom:28px;padding-left:24px;padding-right:24px"><p style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.5;color:#17191e;font-weight:700;letter-spacing:3px;margin-top:0">SNAP STORE</p><h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#17191e;margin-top:24px;margin-bottom:20px">${heading}</h1><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#ecf0ff" style="background-color:#ecf0ff;padding-top:20px;padding-bottom:20px;font-family:Courier New,Courier,monospace;font-size:32px;line-height:1.4;color:#2855ec;font-weight:700;letter-spacing:5px">${code}</td></tr></table><p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#555963;margin-top:20px;margin-bottom:0">${note}</p></td></tr></table></td></tr></table></body></html>`,
  };
}
