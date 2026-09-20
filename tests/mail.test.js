import { test } from "node:test";
import assert from "node:assert/strict";
import { createMailService, loginEmail } from "../server/mail.js";
import { getAdminEmails, storeOwnerEmail } from "../server/config.js";

test("Resend uses HTTPS, verified sender and private authorization, with stable outbox idempotency", async () => {
  let request;
  const mail = createMailService({ RESEND_API_KEY: "test-key", MAIL_FROM: "SNAP <shop@example.test>", MAIL_REPLY_TO: "owner@example.test" }, {
    fetchImpl: async (url, options) => {
      request = { url, ...options };
      return new Response(JSON.stringify({ id: "local-mail-1" }), { status: 200 });
    },
  });
  assert.equal(mail.ready, true);
  assert.equal(mail.provider, "resend");
  const result = await mail.sendMail({ to: "buyer@example.test", subject: "Local test", text: "Test only", idempotencyKey: "snap-order-local-1" });
  assert.equal(result.messageId, "local-mail-1");
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.headers.Authorization, "Bearer test-key");
  assert.equal(request.headers["Idempotency-Key"], "snap-order-local-1");
  assert.equal(request.redirect, "error");
  assert.deepEqual(JSON.parse(request.body), { from: "SNAP <shop@example.test>", to: ["buyer@example.test"], subject: "Local test", text: "Test only", reply_to: "owner@example.test" });
});

test("a rejected, malformed or incomplete email response cannot be reported as delivered", async () => {
  for (const [status, body] of [[403, '{"message":"sensitive provider response"}'], [200, '{}'], [502, '<html>bad gateway</html>']]) {
    const mail = createMailService({ RESEND_API_KEY: "test-key", MAIL_FROM: "shop@example.test" }, {
      fetchImpl: async () => new Response(body, { status }),
    });
    await assert.rejects(mail.sendMail({ to: "buyer@example.test", subject: "Local test", text: "Test only" }), (error) => {
      assert.equal(error.code, `MAIL_HTTP_${status}`);
      assert.ok(!error.message.includes("sensitive"));
      return true;
    });
  }
});

test("unconfigured mail stays unavailable and explicit provider choice is respected", async () => {
  const mail = createMailService({ MAIL_PROVIDER: "resend", SMTP_HOST: "smtp.example.test", SMTP_USER: "test", SMTP_PASS: "test" });
  assert.equal(mail.ready, false);
  assert.deepEqual(mail.missing, ["RESEND_API_KEY", "MAIL_FROM"]);
  await assert.rejects(mail.sendMail({}), { code: "MAIL_NOT_CONFIGURED" });
  assert.equal(createMailService({ MAIL_PROVIDER: "unknown", MAIL_FROM: "shop@example.test" }).ready, false);
});

test("SMTP remains compatible and a rejected recipient fails delivery", async () => {
  let sent;
  const env = { MAIL_PROVIDER: "smtp", RESEND_API_KEY: "unused", MAIL_FROM: "shop@example.test", SMTP_HOST: "smtp.example.test", SMTP_USER: "test", SMTP_PASS: "test" };
  const mail = createMailService(env, { transportFactory: () => ({ sendMail: async (message) => { sent = message; return { rejected: [] }; } }) });
  await mail.sendMail({ to: "buyer@example.test", subject: "Local test", text: "Only local" });
  assert.equal(mail.provider, "smtp");
  assert.equal(sent.from, "shop@example.test");
  const rejected = createMailService(env, { transportFactory: () => ({ sendMail: async () => ({ rejected: ["buyer@example.test"] }) }) });
  await assert.rejects(rejected.sendMail({ to: "buyer@example.test" }), { code: "MAIL_RECIPIENT_REJECTED" });
});

test("designated owner and additional configured admins form an exact normalized allowlist", () => {
  assert.equal(storeOwnerEmail, "danilolisnicuk9@gmail.com");
  assert.deepEqual(getAdminEmails({ ADMIN_EMAILS: " ADMIN@example.test, admin@example.test " }), [storeOwnerEmail, "admin@example.test"]);
  assert.ok(!getAdminEmails({}).includes("danilolisniuk9@gmail.com"));
  assert.ok(!getAdminEmails({}).includes("buyer@example.test"));
});

test("login email includes a code and expiry in both text and HTML, in the requested language", () => {
  for (const lang of ["uk", "en"]) {
    const mail = loginEmail("123456", lang);
    assert.match(mail.text, /123456/);
    assert.match(mail.html, /123456/);
    assert.match(mail.text, /10/);
  }
  assert.match(loginEmail("123456", "en").subject, /sign-in/);
});
