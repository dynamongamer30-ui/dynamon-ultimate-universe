import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as DEFAULT_SOCIALS, n as DEFAULT_ANNOUNCEMENT, r as DEFAULT_BRANDING, u as mods, v as useSiteSettings } from "./useSiteSettings-BztHUruL.mjs";
import { F as KeyRound, G as Eye, K as EyeOff, L as Image, N as LoaderCircle, O as Megaphone, P as Link2, at as Box, dt as ArrowLeft, f as Star, h as Shield, v as Settings2, x as Save } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as OwnerGate } from "./OwnerGate-DHXfeR7k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-control-q-0Cv8J7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ControlRoute() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMounted(true);
	}, []);
	if (!mounted) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ControlPanel, {}) });
}
function ControlPanel() {
	const { branding, announcement, socials, overrides, refresh } = useSiteSettings();
	const [tab, setTab] = (0, import_react.useState)("branding");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/admin",
				className: "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Back to dashboard"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/admin-keys",
				className: "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-3.5 w-3.5" }), " Key System"]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mt-4 edge-light rounded-2xl glass p-6 sm:p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3.5 w-3.5" }), " Owner Control Panel"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl",
					children: "Edit everything, live."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm text-muted-foreground",
					children: "Tune branding, swap socials, push announcements and edit any field on every mod. Changes appear instantly across the site."
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 flex flex-wrap gap-2",
			children: [
				{
					id: "branding",
					label: "Branding & Hero",
					icon: Settings2
				},
				{
					id: "announcement",
					label: "Announcement",
					icon: Megaphone
				},
				{
					id: "socials",
					label: "Socials",
					icon: Link2
				},
				{
					id: "featured",
					label: "Featured Mod",
					icon: Star
				},
				{
					id: "mods",
					label: "Mods Editor",
					icon: Box
				}
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setTab(t.id),
				className: `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? "text-primary-foreground glow-primary" : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"}`,
				style: tab === t.id ? { background: "var(--gradient-primary)" } : void 0,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(t.icon, { className: "h-4 w-4" }),
					" ",
					t.label
				]
			}, t.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6",
			children: [
				tab === "branding" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandingEditor, {
					initial: branding,
					onSaved: refresh
				}),
				tab === "announcement" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnnouncementEditor, {
					initial: announcement,
					onSaved: refresh
				}),
				tab === "socials" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialsEditor, {
					initial: socials,
					onSaved: refresh
				}),
				tab === "featured" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeaturedEditor, { onSaved: refresh }),
				tab === "mods" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModsEditor, {
					overrides,
					onSaved: refresh
				})
			]
		})
	] });
}
async function saveSetting(key, value) {
	const { error } = await supabase.from("site_settings").upsert({
		key,
		value
	});
	if (error) {
		toast.error(error.message);
		return false;
	}
	toast.success("Saved");
	return true;
}
function BrandingEditor({ initial, onSaved }) {
	const [v, setV] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const f = (k) => (e) => setV({
		...v,
		[k]: e.target.value
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Branding & Hero copy",
		desc: "Site identity, hero headline, subtitle and CTAs.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Grid, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Site name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.siteName,
						onChange: f("siteName"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Site tagline (for meta)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.siteTagline,
						onChange: f("siteTagline"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Hero eyebrow",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.heroEyebrow,
						onChange: f("heroEyebrow"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Hero title (before highlight)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.heroTitle,
						onChange: f("heroTitle"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Hero highlight (gradient word)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.heroHighlight,
						onChange: f("heroHighlight"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Primary CTA label",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.primaryCta,
						onChange: f("primaryCta"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Secondary CTA label",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.secondaryCta,
						onChange: f("secondaryCta"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Active trainers stat",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.activeTrainers,
						onChange: f("activeTrainers"),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Average rating stat",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.avgRating,
						onChange: f("avgRating"),
						className: inp
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Hero subtitle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: v.heroSubtitle,
					onChange: f("heroSubtitle"),
					rows: 3,
					className: inp
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveRow, {
				saving,
				onReset: () => setV(DEFAULT_BRANDING),
				onSave: async () => {
					setSaving(true);
					if (await saveSetting("branding", v)) onSaved();
					setSaving(false);
				}
			})
		]
	});
}
function AnnouncementEditor({ initial, onSaved }) {
	const [v, setV] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Top announcement bar",
		desc: "Show a global banner above every page. Use it for new drops, maintenance or events.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: v.enabled,
					onChange: (e) => setV({
						...v,
						enabled: e.target.checked
					})
				}), " Enabled"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Message",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.message,
					onChange: (e) => setV({
						...v,
						message: e.target.value
					}),
					className: inp,
					placeholder: "New Fire Phoenix v2.0 just dropped — tap to view"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Link (optional)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.href,
					onChange: (e) => setV({
						...v,
						href: e.target.value
					}),
					className: inp,
					placeholder: "/mods/fire-phoenix"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Tone",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: v.tone,
					onChange: (e) => setV({
						...v,
						tone: e.target.value
					}),
					className: inp,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "info",
							children: "Info (primary)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "success",
							children: "Success (green)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "warning",
							children: "Warning (amber)"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveRow, {
				saving,
				onReset: () => setV(DEFAULT_ANNOUNCEMENT),
				onSave: async () => {
					setSaving(true);
					if (await saveSetting("announcement", v)) onSaved();
					setSaving(false);
				}
			})
		]
	});
}
function SocialsEditor({ initial, onSaved }) {
	const [v, setV] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Social channels",
		desc: "Update these any time — every page reflects the change instantly.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Grid, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "WhatsApp",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.whatsapp,
					onChange: (e) => setV({
						...v,
						whatsapp: e.target.value
					}),
					className: inp
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "YouTube",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.youtube,
					onChange: (e) => setV({
						...v,
						youtube: e.target.value
					}),
					className: inp
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Instagram",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.instagram,
					onChange: (e) => setV({
						...v,
						instagram: e.target.value
					}),
					className: inp
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Telegram",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.telegram,
					onChange: (e) => setV({
						...v,
						telegram: e.target.value
					}),
					className: inp
				})
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveRow, {
			saving,
			onReset: () => setV(DEFAULT_SOCIALS),
			onSave: async () => {
				setSaving(true);
				if (await saveSetting("socials", v)) onSaved();
				setSaving(false);
			}
		})]
	});
}
function FeaturedEditor({ onSaved }) {
	const [slug, setSlug] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		supabase.from("site_settings").select("value").eq("key", "featured").maybeSingle().then(({ data }) => {
			const v = data?.value;
			setSlug(v?.slug ?? "");
		});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Featured mod",
		desc: "Pinned to the top of the vault and shown as the hero card.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Mod",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				value: slug,
				onChange: (e) => setSlug(e.target.value),
				className: inp,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "— auto (top by popularity) —"
				}), mods.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: m.slug,
					children: m.name
				}, m.slug))]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveRow, {
			saving,
			onReset: () => setSlug(""),
			onSave: async () => {
				setSaving(true);
				if (await saveSetting("featured", { slug })) onSaved();
				setSaving(false);
			}
		})]
	});
}
function ModsEditor({ overrides, onSaved }) {
	const [openSlug, setOpenSlug] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: mods.map((m) => {
			const o = overrides[m.slug];
			const isOpen = openSlug === m.slug;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-hidden rounded-2xl glass",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setOpenSlug(isOpen ? null : m.slug),
					className: "flex w-full items-center gap-3 p-4 text-left hover:bg-card/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: m.image,
							alt: "",
							className: "h-12 w-12 rounded-lg object-cover"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-semibold",
								children: o?.name || m.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: [
									"v",
									o?.version || m.version,
									" · ",
									m.element
								]
							})]
						}),
						o?.hidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4 text-rose-300" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4 text-emerald-300" }),
						o?.featured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-4 w-4 text-amber-300" })
					]
				}), isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModRowEditor, {
					slug: m.slug,
					existing: o,
					onSaved
				})]
			}, m.slug);
		})
	});
}
function ModRowEditor({ slug, existing, onSaved }) {
	const base = mods.find((m) => m.slug === slug);
	const [v, setV] = (0, import_react.useState)({
		name: existing?.name ?? "",
		tagline: existing?.tagline ?? "",
		description: existing?.description ?? "",
		version: existing?.version ?? "",
		size: existing?.size ?? "",
		updated_date: existing?.updated_date ?? "",
		youtube_id: existing?.youtube_id ?? "",
		features: (existing?.features ?? []).join("\n"),
		changelog: JSON.stringify(existing?.changelog ?? [], null, 2),
		downloads_boost: existing?.downloads_boost ?? 0,
		likes_boost: existing?.likes_boost ?? 0,
		downloads_absolute: existing?.downloads_absolute ?? "",
		likes_absolute: existing?.likes_absolute ?? "",
		rating: existing?.rating ?? "",
		rating_count: existing?.rating_count ?? "",
		download_url: existing?.download_url ?? "",
		hidden: existing?.hidden ?? false,
		featured: existing?.featured ?? false
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const save = async () => {
		setSaving(true);
		let changelog = null;
		if (v.changelog.trim()) try {
			changelog = JSON.parse(v.changelog);
		} catch {
			toast.error("Changelog JSON is invalid");
			setSaving(false);
			return;
		}
		const features = v.features.split("\n").map((s) => s.trim()).filter(Boolean);
		const payload = {
			slug,
			name: v.name || null,
			tagline: v.tagline || null,
			description: v.description || null,
			version: v.version || null,
			size: v.size || null,
			updated_date: v.updated_date || null,
			youtube_id: v.youtube_id || null,
			features: features.length ? features : null,
			changelog,
			downloads_boost: Number(v.downloads_boost) || 0,
			likes_boost: Number(v.likes_boost) || 0,
			downloads_absolute: v.downloads_absolute === "" ? null : Number(v.downloads_absolute),
			likes_absolute: v.likes_absolute === "" ? null : Number(v.likes_absolute),
			rating: v.rating === "" ? null : Number(v.rating),
			rating_count: v.rating_count === "" ? null : Number(v.rating_count),
			download_url: v.download_url || null,
			hidden: v.hidden,
			featured: v.featured
		};
		const { error } = await supabase.from("mod_overrides").upsert(payload);
		if (error) toast.error(error.message);
		else {
			toast.success("Mod saved");
			onSaved();
		}
		setSaving(false);
	};
	const clear = async () => {
		if (!confirm("Reset this mod to defaults?")) return;
		await supabase.from("mod_overrides").delete().eq("slug", slug);
		toast.success("Reset");
		onSaved();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border/60 bg-background/30 p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap gap-4 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "inline-flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: v.hidden,
						onChange: (e) => setV({
							...v,
							hidden: e.target.checked
						})
					}), " Hide from site"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "inline-flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: v.featured,
						onChange: (e) => setV({
							...v,
							featured: e.target.checked
						})
					}), " Mark featured"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Grid, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Name (default: ${base.name})`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.name,
						onChange: (e) => setV({
							...v,
							name: e.target.value
						}),
						className: inp,
						placeholder: base.name
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Version (default: ${base.version})`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.version,
						onChange: (e) => setV({
							...v,
							version: e.target.value
						}),
						className: inp,
						placeholder: base.version
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Size (default: ${base.size})`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.size,
						onChange: (e) => setV({
							...v,
							size: e.target.value
						}),
						className: inp,
						placeholder: base.size
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Updated date`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.updated_date,
						onChange: (e) => setV({
							...v,
							updated_date: e.target.value
						}),
						className: inp,
						placeholder: base.updated
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "YouTube video ID",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.youtube_id,
						onChange: (e) => setV({
							...v,
							youtube_id: e.target.value
						}),
						className: inp,
						placeholder: "dQw4w9WgXcQ"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Download URL",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: v.download_url,
						onChange: (e) => setV({
							...v,
							download_url: e.target.value
						}),
						className: inp,
						placeholder: "https://…"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Set downloads to (live total auto-increments from here)`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: "0",
						value: v.downloads_absolute,
						onChange: (e) => setV({
							...v,
							downloads_absolute: e.target.value === "" ? "" : Number(e.target.value)
						}),
						className: inp,
						placeholder: String(base.downloads)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Downloads boost (+/-)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						value: v.downloads_boost,
						onChange: (e) => setV({
							...v,
							downloads_boost: Number(e.target.value)
						}),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Set likes to (live total auto-increments)`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: "0",
						value: v.likes_absolute,
						onChange: (e) => setV({
							...v,
							likes_absolute: e.target.value === "" ? "" : Number(e.target.value)
						}),
						className: inp,
						placeholder: String(base.baseLikes)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Likes boost (+/-)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						value: v.likes_boost,
						onChange: (e) => setV({
							...v,
							likes_boost: Number(e.target.value)
						}),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Rating (0–5, default: ${base.baseRating})`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						step: "0.1",
						min: "0",
						max: "5",
						value: v.rating,
						onChange: (e) => setV({
							...v,
							rating: e.target.value === "" ? "" : Number(e.target.value)
						}),
						className: inp
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Number of ratings / reviews",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: "0",
						value: v.rating_count,
						onChange: (e) => setV({
							...v,
							rating_count: e.target.value === "" ? "" : Number(e.target.value)
						}),
						className: inp,
						placeholder: "e.g. 1240"
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: `Tagline (default: ${base.tagline})`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: v.tagline,
					onChange: (e) => setV({
						...v,
						tagline: e.target.value
					}),
					className: inp,
					placeholder: base.tagline
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Description",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: v.description,
					onChange: (e) => setV({
						...v,
						description: e.target.value
					}),
					rows: 4,
					className: inp,
					placeholder: base.description
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Features (one per line)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: v.features,
					onChange: (e) => setV({
						...v,
						features: e.target.value
					}),
					rows: 4,
					className: inp,
					placeholder: base.features.join("\n")
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Changelog (JSON: [{version,date,notes:[]}])",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: v.changelog,
					onChange: (e) => setV({
						...v,
						changelog: e.target.value
					}),
					rows: 6,
					className: `${inp} font-mono text-xs`,
					placeholder: JSON.stringify(base.changelog, null, 2)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap items-center justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: clear,
					className: "rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-300",
					children: "Reset to defaults"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: save,
					disabled: saving,
					className: "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60",
					style: { background: "var(--gradient-primary)" },
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Save mod"]
				})]
			})
		]
	});
}
var inp = "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary";
function Card({ title, desc, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "edge-light rounded-2xl glass p-6 sm:p-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "font-display text-xl font-bold flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-5 w-5 text-primary" }), title]
			}),
			desc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: desc
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 space-y-4",
				children
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
			children: label
		}), children]
	});
}
function Grid({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-4 sm:grid-cols-2",
		children
	});
}
function SaveRow({ saving, onSave, onReset }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 flex justify-end gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: onReset,
			className: "rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground",
			children: "Reset defaults"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: onSave,
			disabled: saving,
			className: "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60",
			style: { background: "var(--gradient-primary)" },
			children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Save"]
		})]
	});
}
//#endregion
export { ControlRoute as component };
