const fields = {
  brand: ["title", "edition", "securitySubtitle"],
  login: [
    "getKeyLabel",
    "adminLabel",
    "verifyLabel",
    "tutorialLabel",
    "keyPlaceholder",
    "deviceNote",
    "onlineNote",
  ],
  community: [
    "sectionTitle",
    "sectionDescription",
    "title",
    "eyebrow",
    "description",
    "loadingText",
    "unavailableText",
    "retryLabel",
  ],
  policy: [
    "checkingTitle",
    "checkingMessage",
    "maintenanceTitle",
    "maintenanceMessage",
    "retryLabel",
    "closeLabel",
    "unavailableTitle",
    "unavailableMessage",
    "laterLabel",
  ],
};
const links = {
  getkey: "GetKey",
  admin: "Admin",
  tutorial: "Info",
  instagram: "Instagram",
  telegram: "Telegram",
  youtube: "Youtube",
  whatsapp: "Whatsapp",
  website: "Website",
};
export function safeLink(value) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname.includes(".") &&
      !u.hostname.endsWith(".local") &&
      !u.hostname.startsWith("[") &&
      !/^[\d.]+$/.test(u.hostname)
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}
export function publicUiConfig(config) {
  const raw = config.Ui?.schema === 1 ? config.Ui : {};
  const result = { schema: 1, links: {}, social: { labels: {} } };
  for (const [group, names] of Object.entries(fields)) {
    result[group] = {};
    for (const name of names) {
      const value = raw[group]?.[name];
      if (typeof value === "string" && value.trim())
        result[group][name] = value
          .replace(/[\x00-\x1f<>]/g, "")
          .trim()
          .slice(0, /Message|description|sectionDescription/.test(name) ? 500 : 96);
    }
  }
  for (const [id, legacy] of Object.entries(links)) {
    const value =
      raw.links && Object.hasOwn(raw.links, id)
        ? raw.links[id]
        : config.Links && Object.hasOwn(config.Links, legacy)
          ? config.Links[legacy]
          : id === "tutorial"
            ? config.TutorialUrl
            : id === "getkey"
              ? "https://generator.dynamongamer30.workers.dev/start"
              : "";
    result.links[id] = safeLink(value);
    if (["instagram", "telegram", "youtube", "whatsapp", "website"].includes(id)) {
      const label = raw.social?.labels?.[id];
      if (typeof label === "string")
        result.social.labels[id] = label
          .replace(/[\x00-\x1f<>]/g, "")
          .trim()
          .slice(0, 48);
    }
  }
  return result;
}
