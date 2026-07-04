import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as useAuth, u as mods } from "./useSiteSettings-BztHUruL.mjs";
import { N as LoaderCircle, c as TriangleAlert, h as Shield, k as Mail, u as Trash2, y as Send } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as OwnerGate } from "./OwnerGate-DHXfeR7k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-3FHrToxO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminRoute() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMounted(true);
	}, []);
	if (!mounted) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminPage, {}) });
}
function AdminPage() {
	const { user } = useAuth();
	const [reports, setReports] = (0, import_react.useState)([]);
	const [stats, setStats] = (0, import_react.useState)({
		users: 0,
		comments: 0,
		favorites: 0,
		reports: 0
	});
	const [subs, setSubs] = (0, import_react.useState)([]);
	const [blastMod, setBlastMod] = (0, import_react.useState)(mods[0].slug);
	const [blastSubject, setBlastSubject] = (0, import_react.useState)("");
	const [blastBody, setBlastBody] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		(async () => {
			const [{ data: rep }, { count: usersCount }, { count: commentsCount }, { count: favCount }, { data: subsData }] = await Promise.all([
				supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50),
				supabase.from("profiles").select("*", {
					count: "exact",
					head: true
				}),
				supabase.from("comments").select("*", {
					count: "exact",
					head: true
				}),
				supabase.from("favorites").select("*", {
					count: "exact",
					head: true
				}),
				supabase.from("mod_subscribers").select("user_id, email")
			]);
			setReports(rep ?? []);
			setStats({
				users: usersCount ?? 0,
				comments: commentsCount ?? 0,
				favorites: favCount ?? 0,
				reports: (rep ?? []).filter((r) => r.status === "open").length
			});
			setSubs(subsData ?? []);
		})();
	}, []);
	const resolve = async (id, status) => {
		await supabase.from("reports").update({ status }).eq("id", id);
		await supabase.from("moderation_log").insert({
			actor_id: user.id,
			action: `report_${status}`,
			target_type: "report",
			target_id: id
		});
		setReports((prev) => prev.map((r) => r.id === id ? {
			...r,
			status
		} : r));
	};
	const deleteTarget = async (r) => {
		if (!confirm(`Delete this ${r.target_type}?`)) return;
		if (r.target_type === "comment") await supabase.from("comments").delete().eq("id", r.target_id);
		await supabase.from("moderation_log").insert({
			actor_id: user.id,
			action: "content_removed",
			target_type: r.target_type,
			target_id: r.target_id,
			details: `via report ${r.id}`
		});
		await resolve(r.id, "resolved");
		toast.success("Content removed");
	};
	const sendBlast = async () => {
		const subject = blastSubject.trim();
		const body = blastBody.trim();
		if (!subject || !body) {
			toast.error("Subject and body required");
			return;
		}
		if (subject.length > 120) {
			toast.error("Subject too long (max 120)");
			return;
		}
		if (body.length > 5e3) {
			toast.error("Body too long (max 5000)");
			return;
		}
		setSending(true);
		const recipients = subs.length;
		const { error } = await supabase.from("broadcasts").insert({
			author_id: user.id,
			mod_slug: blastMod,
			subject,
			body,
			recipients
		});
		if (error) {
			toast.error(error.message);
			setSending(false);
			return;
		}
		await supabase.from("moderation_log").insert({
			actor_id: user.id,
			action: "broadcast_queued",
			target_type: "mod",
			target_id: blastMod,
			details: `${recipients} recipients · ${subject}`
		});
		setSending(false);
		setBlastSubject("");
		setBlastBody("");
		toast.success(`Broadcast queued for ${recipients} subscriber${recipients === 1 ? "" : "s"}`, { description: "Configure Resend in an edge function to deliver real emails." });
	};
	const totalSubs = subs.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "edge-light rounded-2xl glass p-8 sm:p-12",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3.5 w-3.5" }), " Owner Console"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl",
					children: "Dashboard"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-2xl text-muted-foreground",
					children: "Moderate the community and notify trainers about new builds."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/admin-control",
					className: "mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary",
					style: { background: "var(--gradient-primary)" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }), " Open Control Panel"]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Trainers",
					value: stats.users
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Reviews",
					value: stats.comments
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Favorites",
					value: stats.favorites
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Open reports",
					value: stats.reports,
					accent: stats.reports > 0
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8 grid gap-6 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "edge-light rounded-2xl glass p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-display text-xl font-bold flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-5 w-5" }), " Broadcast new release"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: [
							"Notify all ",
							totalSubs,
							" email-opted-in trainers about a new mod build."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "mt-4 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
						children: "Mod"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: blastMod,
						onChange: (e) => setBlastMod(e.target.value),
						className: "mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm",
						children: mods.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: m.slug,
							children: [
								m.name,
								" — v",
								m.version
							]
						}, m.slug))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: blastSubject,
						onChange: (e) => setBlastSubject(e.target.value),
						placeholder: "Subject",
						className: "mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: blastBody,
						onChange: (e) => setBlastBody(e.target.value),
						placeholder: "Message body…",
						rows: 6,
						maxLength: 2e3,
						className: "mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: sendBlast,
						disabled: sending,
						className: "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60",
						style: { background: "var(--gradient-primary)" },
						children: [sending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" }), "Queue broadcast"]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "edge-light rounded-2xl glass p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "font-display text-xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 text-amber-400" }), " Reports queue"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-3 max-h-[520px] overflow-auto",
					children: [reports.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No reports yet."
					}), reports.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-2xl border p-4 ${r.status === "open" ? "border-amber-400/30 bg-amber-500/5" : "border-border bg-background/40 opacity-70"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold uppercase tracking-widest text-amber-300",
									children: r.reason
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: new Date(r.created_at).toLocaleString()
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: [
									r.target_type,
									" · ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
										className: "text-[10px]",
										children: r.target_id.slice(0, 8)
									})
								]
							}),
							r.details && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 whitespace-pre-line text-sm",
								children: r.details
							}),
							r.status === "open" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => deleteTarget(r),
									className: "inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" }), " Remove content"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => resolve(r.id, "dismissed"),
									className: "rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground",
									children: "Dismiss"
								})]
							}),
							r.status !== "open" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-xs uppercase tracking-widest text-muted-foreground",
								children: ["· ", r.status]
							})
						]
					}, r.id))]
				})]
			})]
		})
	] });
}
function Stat({ label, value, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `edge-light rounded-2xl glass p-6 text-center ${accent ? "ring-2 ring-amber-400/50" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs uppercase tracking-widest text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 font-display text-4xl font-black uppercase tracking-tight text-gradient",
			children: value
		})]
	});
}
//#endregion
export { AdminRoute as component };
