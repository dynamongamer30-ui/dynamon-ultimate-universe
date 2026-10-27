export const NATIVE_TEXT_FIELDS = {
  brand: {
    title: "DYNAMON GAMER",
    edition: "ROYAL VOID V2",
    securitySubtitle: "SECURE DEVICE VERIFICATION",
  },
  login: {
    getKeyLabel: "Get Key",
    adminLabel: "Admin",
    verifyLabel: "Login / Verify",
    tutorialLabel: "Tutorial & Help",
    keyPlaceholder: "DG-XXXXXX",
    deviceNote: "One key per device",
    onlineNote: "Online verification",
  },
  community: {
    sectionTitle: "Community",
    sectionDescription: "Official Dynamon Gamer channels and website updates.",
    title: "DYNAMON GAMER",
    eyebrow: "STAY CONNECTED · OFFICIAL LINKS",
    description: "News, tutorials and community — managed from the official website.",
    loadingText: "Loading official links…",
    unavailableText: "Official links are temporarily unavailable.",
    retryLabel: "Retry links",
  },
  policy: {
    checkingTitle: "Checking availability",
    checkingMessage: "Connecting securely…",
    maintenanceTitle: "Maintenance",
    maintenanceMessage: "We are making improvements. Please try again shortly.",
    retryLabel: "Check again",
    closeLabel: "Close",
    unavailableTitle: "Connection required",
    unavailableMessage: "Connect to the internet to check app availability.",
    laterLabel: "Continue",
  },
};
export const NATIVE_LINKS = [
  ["getkey", "Get Key URL", "GetKey"],
  ["admin", "Admin URL", "Admin"],
  ["tutorial", "Tutorial URL", "Info"],
  ["instagram", "Instagram", "Instagram"],
  ["telegram", "Telegram", "Telegram"],
  ["youtube", "YouTube", "Youtube"],
  ["whatsapp", "WhatsApp", "Whatsapp"],
  ["website", "Website", "Website"],
] as const;
export type NativeUi = {
  schema: 1;
  brand: Record<string, string>;
  login: Record<string, string>;
  community: Record<string, string>;
  policy: Record<string, string>;
  links: Record<string, string>;
  social: { labels: Record<string, string> };
};
export function nativeUi(raw: unknown, legacy: Record<string, unknown>): NativeUi {
  const v = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Partial<NativeUi>) : {};
  const oldLinks = (legacy.Links || {}) as Record<string, string>;
  const oldTexts = (legacy.Texts || {}) as Record<string, string>;
  const oldBrand = (legacy.DexBranding || {}) as { links?: { title?: string; url?: string }[] };
  const website = oldBrand.links?.find((link) => link.title?.toLowerCase() === "website")?.url;
  return {
    schema: 1,
    brand: {
      ...NATIVE_TEXT_FIELDS.brand,
      ...(typeof legacy.Title === "string" && legacy.Title ? { title: legacy.Title } : {}),
      ...v.brand,
    },
    login: {
      ...NATIVE_TEXT_FIELDS.login,
      ...(oldTexts.BtnKey ? { getKeyLabel: oldTexts.BtnKey } : {}),
      ...(oldTexts.BtnTutorial ? { tutorialLabel: oldTexts.BtnTutorial } : {}),
      ...v.login,
    },
    community: { ...NATIVE_TEXT_FIELDS.community, ...v.community },
    policy: { ...NATIVE_TEXT_FIELDS.policy, ...v.policy },
    links: Object.fromEntries(
      NATIVE_LINKS.map(([id, , old]) => [
        id,
        v.links?.[id] ??
          oldLinks[old] ??
          (id === "website" ? website : undefined) ??
          (id === "tutorial"
            ? (legacy.TutorialUrl as string) || ""
            : id === "getkey"
              ? "https://generator.dynamongamer30.workers.dev/start"
              : ""),
      ]),
    ),
    social: {
      labels: {
        instagram: "Instagram",
        telegram: "Telegram",
        youtube: "YouTube",
        whatsapp: "WhatsApp",
        website: "Website",
        ...v.social?.labels,
      },
    },
  };
}
export function validateNativeUi(value: NativeUi) {
  for (const group of [
    value.brand,
    value.login,
    value.community,
    value.policy,
    value.social.labels,
  ])
    for (const text of Object.values(group))
      if (typeof text !== "string" || !text.trim() || text.length > 500)
        return "Use text between 1 and 500 characters.";
  for (const link of Object.values(value.links)) {
    if (typeof link !== "string") return "Use valid text for every link.";
    if (link.length > 2048) return "Links must be at most 2048 characters.";
    if (!link.trim()) continue;
    try {
      const url = new URL(link);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        !url.hostname.includes(".") ||
        /^(localhost|127\.|\[)/.test(url.hostname)
      )
        throw Error();
    } catch {
      return "Links must be complete HTTPS addresses without credentials or custom ports.";
    }
  }
  return null;
}
