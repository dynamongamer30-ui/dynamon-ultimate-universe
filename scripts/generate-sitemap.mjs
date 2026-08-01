// Regenerates public/sitemap.xml from src/lib/mods.ts's static slug list.
// Run: node scripts/generate-sitemap.mjs   (or: npm run sitemap)
// Re-run this after adding/removing/renaming a mod.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SITE_URL = "https://dynamongamer.space";

const modsSource = readFileSync(join(root, "src/lib/mods.ts"), "utf-8");
const slugs = [...modsSource.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const staticPages = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/mods", changefreq: "daily", priority: "0.9" },
  { path: "/achievements", changefreq: "weekly", priority: "0.5" },
  { path: "/generator", changefreq: "weekly", priority: "0.6" },
  { path: "/rewards", changefreq: "weekly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.3" },
  { path: "/contact", changefreq: "monthly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "monthly", priority: "0.2" },
];

const modPages = slugs.map((slug) => ({ path: `/mods/${slug}`, changefreq: "weekly", priority: "0.8" }));

const urls = [...staticPages, ...modPages];
const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`sitemap.xml written with ${urls.length} URLs (${modPages.length} mods).`);
