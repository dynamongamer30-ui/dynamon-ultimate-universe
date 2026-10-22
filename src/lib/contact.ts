export const SUPPORT_EMAIL = "info@dynamongamer.com";

export function supportDraftUrl(name: string, email: string, message: string) {
  const subject = `Dynamon Universe support — ${name
    .trim()
    .replace(/[\r\n]+/g, " ")
    .slice(0, 100)}`;
  const body = `Name: ${name.trim()}\nReply email: ${email.trim()}\n\n${message.trim()}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
