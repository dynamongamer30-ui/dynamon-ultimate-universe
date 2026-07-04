import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as useAuth } from "./useSiteSettings-BztHUruL.mjs";
import { C as RefreshCw, F as KeyRound, N as LoaderCircle, Q as Clock, Z as Copy, b as Search, c as TriangleAlert, ct as Ban, g as ShieldCheck, p as Sparkles, r as X, u as Trash2, w as Plus } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as OwnerGate } from "./OwnerGate-DHXfeR7k.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { a as getConfig, c as listKeys, d as setIPWhitelist, f as setKeyDurationHours, h as unrevokeKey, i as extendKey, l as nowSeconds, m as setRateLimitEnabled, n as createManualKey, p as setMaintenance, r as deleteKey, s as listGenerationLogs, t as Input, u as revokeKey } from "./dgData-CAanFPDa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-keys-Do4ISc2L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function KeysAdminGate() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeysAdmin, {}) });
}
function KeysAdmin() {
	const { user } = useAuth();
	const [tab, setTab] = (0, import_react.useState)("keys");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-6 flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-bold",
				children: "Key System"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Live Supabase data (valid_keys)."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden text-xs text-muted-foreground sm:inline",
					children: user?.email
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-6 inline-flex rounded-full border border-border bg-card/60 p-1 text-xs font-semibold",
			children: [
				"keys",
				"config",
				"logs"
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setTab(t),
				className: `rounded-full px-4 py-1.5 capitalize transition-colors ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`,
				style: tab === t ? { background: "var(--gradient-primary)" } : void 0,
				children: t
			}, t))
		}),
		tab === "keys" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeysPanel, {}),
		tab === "config" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigPanel, {}),
		tab === "logs" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogsPanel, {})
	] });
}
function KeysPanel() {
	const [keys, setKeys] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [search, setSearch] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("all");
	(0, import_react.useEffect)(() => {
		return listKeys((list) => {
			setKeys(list.sort((a, b) => b.date - a.date));
			setLoading(false);
		});
	}, []);
	const stats = (0, import_react.useMemo)(() => {
		const now = nowSeconds();
		return {
			total: keys.length,
			active: keys.filter((k) => k.status === "active" && k.expiry > now).length,
			expired: keys.filter((k) => k.expiry <= now).length,
			activated: keys.filter((k) => k.activated).length,
			revoked: keys.filter((k) => k.status === "revoked").length
		};
	}, [keys]);
	const filtered = (0, import_react.useMemo)(() => {
		const now = nowSeconds();
		const q = search.trim().toLowerCase();
		return keys.filter((k) => {
			if (q && !(k.key.toLowerCase().includes(q) || k.fingerprint.toLowerCase().includes(q) || k.sourceIP.toLowerCase().includes(q))) return false;
			switch (filter) {
				case "active": return k.status === "active" && k.expiry > now;
				case "expired": return k.expiry <= now;
				case "revoked": return k.status === "revoked";
				case "activated": return k.activated;
				default: return true;
			}
		});
	}, [
		keys,
		search,
		filter
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 gap-3 sm:grid-cols-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
				label: "Total",
				value: stats.total,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
				label: "Active",
				value: stats.active,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 text-green-400" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
				label: "Expired",
				value: stats.expired,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4 text-amber-400" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
				label: "Activated",
				value: stats.activated,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
				label: "Revoked",
				value: stats.revoked,
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "h-4 w-4 text-red-400" })
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-4 lg:grid-cols-[1fr_320px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-border bg-card/60 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 min-w-[200px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Search by key, fingerprint, IP",
						value: search,
						onChange: (e) => setSearch(e.target.value),
						className: "pl-9"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "inline-flex rounded-full border border-border p-1 text-xs",
					children: [
						"all",
						"active",
						"expired",
						"revoked",
						"activated"
					].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilter(f),
						className: `rounded-full px-3 py-1 capitalize ${filter === f ? "text-primary-foreground" : "text-muted-foreground"}`,
						style: filter === f ? { background: "var(--gradient-primary)" } : void 0,
						children: f
					}, f))
				})]
			}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center py-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-primary" })
			}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "py-12 text-center text-sm text-muted-foreground",
				children: "No keys found."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs uppercase tracking-wider text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Key"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Created"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Expires"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Source"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Actions"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRow, { k }, k.key)) })]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ManualKeyForm, {})]
	})] });
}
function KeyRow({ k }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const now = nowSeconds();
	const isExpired = k.expiry <= now;
	const status = k.status === "revoked" ? {
		label: "Revoked",
		cls: "border-red-400/40 text-red-300"
	} : isExpired ? {
		label: "Expired",
		cls: "border-amber-400/40 text-amber-300"
	} : k.activated ? {
		label: "Activated",
		cls: "border-primary/40 text-primary"
	} : {
		label: "Active",
		cls: "border-green-400/40 text-green-300"
	};
	const copy = async () => {
		await navigator.clipboard.writeText(k.key);
		toast.success(`Copied ${k.key}`);
	};
	const doExtend = async (hours) => {
		setBusy(true);
		try {
			await extendKey(k.key, hours);
			toast.success(`Extended +${hours}h`);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};
	const doExtendCustom = async () => {
		const v = window.prompt("Extend by how many hours?", "24");
		const h = Number(v);
		if (!v || !Number.isFinite(h) || h <= 0) return;
		doExtend(h);
	};
	const doRevoke = async () => {
		setBusy(true);
		try {
			if (k.status === "revoked") {
				await unrevokeKey(k.key);
				toast.success("Unrevoked");
			} else {
				await revokeKey(k.key);
				toast.success("Revoked");
			}
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};
	const doDelete = async () => {
		if (!window.confirm(`Delete ${k.key}? This cannot be undone.`)) return;
		setBusy(true);
		try {
			await deleteKey(k.key);
			toast.success("Deleted");
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: "border-t border-border/40",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onDoubleClick: copy,
					className: "font-mono text-sm text-primary hover:underline",
					title: "Double-click to copy",
					children: k.key
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `rounded-full border px-2 py-0.5 text-[11px] ${status.cls}`,
					children: status.label
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3 font-mono text-[11px] text-muted-foreground",
				children: k.device ? k.device.slice(0, 12) + "…" : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3 text-xs text-muted-foreground",
				children: k.date ? (/* @__PURE__ */ new Date(k.date * 1e3)).toLocaleString() : "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3 text-xs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { unixSec: k.expiry })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3 text-xs text-muted-foreground",
				children: k.source || "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-3 pr-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: "Copy",
							onClick: copy,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: "+24h",
							disabled: busy,
							onClick: () => doExtend(24),
							children: "+1d"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: "+7d",
							disabled: busy,
							onClick: () => doExtend(168),
							children: "+7d"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: "Custom",
							disabled: busy,
							onClick: doExtendCustom,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: k.status === "revoked" ? "Unrevoke" : "Revoke",
							disabled: busy,
							onClick: doRevoke,
							children: k.status === "revoked" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "h-3.5 w-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
							title: "Delete",
							disabled: busy,
							onClick: doDelete,
							danger: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
						})
					]
				})
			})
		]
	});
}
function IconBtn({ children, onClick, title, disabled, danger }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick,
		disabled,
		title,
		className: `inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 ${danger ? "border-red-400/30 text-red-300 hover:bg-red-400/10" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`,
		children
	});
}
function Countdown({ unixSec }) {
	const [now, setNow] = (0, import_react.useState)(nowSeconds());
	(0, import_react.useEffect)(() => {
		const i = setInterval(() => setNow(nowSeconds()), 1e3);
		return () => clearInterval(i);
	}, []);
	if (!unixSec) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-muted-foreground",
		children: "—"
	});
	const diff = unixSec - now;
	if (diff <= 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-amber-400",
		children: "Expired"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "font-mono text-xs text-foreground",
		children: [
			Math.floor(diff / 3600),
			"h ",
			Math.floor(diff % 3600 / 60),
			"m ",
			diff % 60,
			"s"
		]
	});
}
function StatTile({ label, value, icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card/60 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-xs text-muted-foreground",
			children: [icon, label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 font-display text-2xl font-extrabold uppercase tracking-tight",
			children: value
		})]
	});
}
function ManualKeyForm() {
	const [prefix, setPrefix] = (0, import_react.useState)("DG");
	const [hours, setHours] = (0, import_react.useState)("24");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const submit = async (e) => {
		e.preventDefault();
		const h = Number(hours);
		if (!Number.isFinite(h) || h <= 0) {
			toast.error("Invalid hours");
			return;
		}
		setBusy(true);
		try {
			const key = await createManualKey(prefix, h);
			await navigator.clipboard.writeText(key).catch(() => {});
			toast.success(`Created ${key} (copied)`);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "h-fit rounded-2xl border border-primary/20 bg-card/60 p-4 glow-primary",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "mb-3 flex items-center gap-2 font-display text-base font-bold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 text-primary" }), " Add manual key"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-xs text-muted-foreground",
				children: "Writes one ValidKeys entry. Users normally generate keys through the worker gate."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "text-xs text-muted-foreground",
				children: "Prefix"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 mb-3 inline-flex rounded-full border border-border p-1 text-xs",
				children: [["DG", "VIP"].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setPrefix(p),
					className: `rounded-full px-3 py-1 ${prefix === p ? "text-primary-foreground" : "text-muted-foreground"}`,
					style: prefix === p ? { background: "var(--gradient-primary)" } : void 0,
					children: p
				}, p)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: ["DG", "VIP"].includes(prefix) ? "" : prefix,
					onChange: (e) => setPrefix(e.target.value.toUpperCase()),
					placeholder: "Custom",
					className: "ml-1 h-7 w-20 border-0 bg-transparent px-2 text-xs"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "text-xs text-muted-foreground",
				children: "Duration (hours)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				min: "1",
				value: hours,
				onChange: (e) => setHours(e.target.value),
				className: "mt-1 mb-3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex gap-1 text-xs",
				children: [
					{
						l: "1d",
						h: "24"
					},
					{
						l: "7d",
						h: "168"
					},
					{
						l: "30d",
						h: "720"
					}
				].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setHours(p.h),
					className: "rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-primary",
					children: p.l
				}, p.l))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "submit",
				disabled: busy,
				className: "w-full",
				style: { background: "var(--gradient-primary)" },
				children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-2 h-4 w-4" }), "Generate & copy"]
			})
		]
	});
}
function ConfigPanel() {
	const [cfg, setCfg] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [newIP, setNewIP] = (0, import_react.useState)("");
	const [hours, setHours] = (0, import_react.useState)("24");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const reload = async () => {
		setLoading(true);
		try {
			const c = await getConfig();
			setCfg(c);
			setHours(String(c.KeyDurationHours));
		} catch (e) {
			toast.error(e.message);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		reload();
	}, []);
	if (loading || !cfg) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex justify-center py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-primary" })
	});
	const toggleMaintenance = async () => {
		setBusy(true);
		try {
			await setMaintenance(!cfg.Maintenance);
			toast.success(cfg.Maintenance ? "Maintenance OFF" : "Maintenance ON");
			await reload();
		} finally {
			setBusy(false);
		}
	};
	const toggleRate = async () => {
		setBusy(true);
		try {
			await setRateLimitEnabled(!cfg.RateLimit.enabled);
			toast.success("Updated");
			await reload();
		} finally {
			setBusy(false);
		}
	};
	const saveHours = async () => {
		const n = Number(hours);
		if (!Number.isFinite(n) || n < 1) return toast.error("Invalid hours");
		setBusy(true);
		try {
			await setKeyDurationHours(n);
			toast.success("Saved");
			await reload();
		} finally {
			setBusy(false);
		}
	};
	const addIP = async () => {
		const ip = newIP.trim();
		if (!ip) return;
		if (cfg.IPWhitelist.includes(ip)) return toast.error("Already in list");
		setBusy(true);
		try {
			await setIPWhitelist([...cfg.IPWhitelist, ip]);
			setNewIP("");
			await reload();
		} finally {
			setBusy(false);
		}
	};
	const removeIP = async (ip) => {
		setBusy(true);
		try {
			await setIPWhitelist(cfg.IPWhitelist.filter((x) => x !== ip));
			await reload();
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-border bg-card/60 p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-4 font-display text-lg font-bold",
					children: "Switches"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					label: "Maintenance mode",
					desc: "Blocks /generate-key with 503.",
					on: cfg.Maintenance,
					onClick: toggleMaintenance,
					disabled: busy,
					warn: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-3 h-px bg-border/50" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					label: "Rate limiting",
					desc: "Throttle key generation per IP.",
					on: cfg.RateLimit.enabled,
					onClick: toggleRate,
					disabled: busy
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-5 h-px bg-border/50" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "text-sm font-semibold",
					children: "Key duration (hours)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs text-muted-foreground",
					children: "Default lifetime for newly generated keys."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: "1",
						value: hours,
						onChange: (e) => setHours(e.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: saveHours,
						disabled: busy,
						style: { background: "var(--gradient-primary)" },
						children: "Save"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-border bg-card/60 p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-1 font-display text-lg font-bold",
					children: "IP whitelist"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-4 text-xs text-muted-foreground",
					children: "IPs bypass rate limits. Empty = no whitelist."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "1.2.3.4",
						value: newIP,
						onChange: (e) => setNewIP(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && addIP()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: addIP,
						disabled: busy,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-4 space-y-1.5",
					children: [cfg.IPWhitelist.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "text-xs text-muted-foreground",
						children: "No IPs whitelisted."
					}), cfg.IPWhitelist.map((ip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: ip
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => removeIP(ip),
							className: "text-muted-foreground hover:text-red-400",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
						})]
					}, ip))]
				})
			]
		})]
	});
}
function Toggle({ label, desc, on, onClick, disabled, warn }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-sm font-semibold",
			children: [warn && on && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 text-amber-400" }), label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted-foreground",
			children: desc
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick,
			disabled,
			className: `relative h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-muted"} disabled:opacity-50`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}` })
		})]
	});
}
function LogsPanel() {
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [search, setSearch] = (0, import_react.useState)("");
	const reload = async () => {
		setLoading(true);
		try {
			setLogs(await listGenerationLogs(200));
		} catch (e) {
			toast.error(e.message);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		reload();
	}, []);
	const q = search.trim().toLowerCase();
	const filtered = q ? logs.filter((l) => l.key.toLowerCase().includes(q) || l.ip.toLowerCase().includes(q) || l.fingerprint.toLowerCase().includes(q)) : logs;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card/60 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex-1 min-w-[200px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Search key / IP / fingerprint",
					value: search,
					onChange: (e) => setSearch(e.target.value),
					className: "pl-9"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				size: "sm",
				onClick: reload,
				disabled: loading,
				children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "mr-2 h-4 w-4" }), "Refresh"]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-center py-12",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-primary" })
		}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "py-12 text-center text-sm text-muted-foreground",
			children: "No logs."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs uppercase tracking-wider text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "When"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Key"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "IP"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Fingerprint"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 text-xs text-muted-foreground",
							children: l.time ? (/* @__PURE__ */ new Date(l.time * 1e3)).toLocaleString() : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 font-mono text-primary",
							children: l.key
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 font-mono text-xs",
							children: l.ip || "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 font-mono text-[11px] text-muted-foreground",
							children: l.fingerprint ? l.fingerprint.slice(0, 16) + "…" : "—"
						})
					]
				}, l.id)) })]
			})
		})]
	});
}
//#endregion
export { KeysAdminGate as component };
