// Store owner explicitly designated for this repository. Authentication still
// requires a valid, single-use email code. Additional admins come from Railway.
export const storeOwnerEmail = "danilolisnicuk9@gmail.com";

export function getAdminEmails(env = process.env) {
  return [...new Set([storeOwnerEmail, ...(env.ADMIN_EMAILS || "").split(",")]
    .map((email) => email.trim().toLowerCase()).filter(Boolean))];
}
