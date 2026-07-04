import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as useAuth } from "./useSiteSettings-BztHUruL.mjs";
import { C as RefreshCw, F as KeyRound, N as LoaderCircle, W as FileUp, c as TriangleAlert, ct as Ban, g as ShieldCheck, o as Upload, r as X, u as Trash2 } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as OwnerGate } from "./OwnerGate-DHXfeR7k.mjs";
import { n as cn, t as Button } from "./button-DRsC1qZi.mjs";
import { o as listBannedDevices, t as Input } from "./dgData-CAanFPDa.mjs";
import { c as setAdminKey, d as uploadPayload, o as getAdminKey, r as banDevice, s as listDevices, u as unbanDevice } from "./dgWorker-i6XEWvUe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-loader-CenuEK_G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
function LoaderGate() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderShell, {}) });
}
function LoaderShell() {
	const { user } = useAuth();
	const [adminKey, setKey] = (0, import_react.useState)(getAdminKey());
	const saveKey = (k) => {
		setAdminKey(k);
		setKey(k);
		toast.success("Admin key saved for this session");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-6 flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-bold",
				children: "OTA Loader"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Manage current build, payloads, and device bans via the License Worker."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden text-xs text-muted-foreground sm:inline",
					children: user?.email
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminKeyCard, {
			current: adminKey,
			onSave: saveKey
		}),
		adminKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 grid gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicesPanel, { onAuthFail: () => setKey("") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UploadPayloadPanel, { onAuthFail: () => setKey("") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BanPanel, { onAuthFail: () => setKey("") })
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-sm text-amber-200",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "mb-2 h-5 w-5" }), "Enter the License Worker admin key above to enable actions. The key is stored only in this browser session (sessionStorage)."]
		})
	] });
}
function AdminKeyCard({ current, onSave }) {
	const [v, setV] = (0, import_react.useState)(current);
	(0, import_react.useEffect)(() => {
		setV(current);
	}, [current]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-primary/20 bg-card/60 p-5 glow-primary",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4 text-primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-base font-bold",
						children: "License Worker admin key"
					}),
					current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto rounded-full border border-green-400/40 px-2 py-0.5 text-[11px] text-green-300",
						children: "Saved"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 mb-3 text-xs text-muted-foreground",
				children: [
					"Sent as ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "X-Admin"
					}),
					" on every Worker call. Session-only."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						placeholder: "Paste admin key",
						value: v,
						onChange: (e) => setV(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => onSave(v.trim()),
						disabled: !v.trim(),
						style: { background: "var(--gradient-primary)" },
						children: "Save"
					}),
					current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => onSave(""),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
					})
				]
			})
		]
	});
}
function DevicesPanel({ onAuthFail }) {
	const [data, setData] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const reload = async () => {
		setLoading(true);
		try {
			const r = await listDevices();
			setData(r);
		} catch (e) {
			const msg = e.message;
			if (/401|403|unauthor|forbidden/i.test(msg)) {
				toast.error("Admin key rejected — re-enter it");
				onAuthFail();
			} else toast.error(msg);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		reload();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card/60 p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-lg font-bold",
				children: "Current build & devices"
			}), data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Current build: ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-primary",
						children: String(data.current_build ?? "—")
					}),
					" · ",
					data.active?.length ?? 0,
					" active"
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				size: "sm",
				onClick: reload,
				disabled: loading,
				children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "mr-2 h-4 w-4" }), "Refresh"]
			})]
		}), !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-center py-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-primary" })
		}) : data.active.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "py-8 text-center text-sm text-muted-foreground",
			children: "No active devices."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs uppercase tracking-wider text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Fingerprint"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Build"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Last seen"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Status"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: data.active.map((d, i) => {
					const last = d.last_seen ?? d.lastSeen ?? d.time ?? d.ts;
					const build = d.build ?? d.current_build ?? "—";
					const status = String(d.status ?? "active");
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border/40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 pr-3 font-mono text-[11px]",
								children: d.fp
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 pr-3 font-mono text-xs",
								children: String(build)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 pr-3 text-xs text-muted-foreground",
								children: formatMaybeTime(last)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 pr-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full border border-green-400/40 px-2 py-0.5 text-[11px] text-green-300",
									children: status
								})
							})
						]
					}, `${d.fp}-${i}`);
				}) })]
			})
		})]
	});
}
function formatMaybeTime(v) {
	if (v == null) return "—";
	const n = typeof v === "number" ? v : Number(v);
	if (!Number.isFinite(n)) return String(v);
	const ms = n > 0xe8d4a51000 ? n : n * 1e3;
	return new Date(ms).toLocaleString();
}
function UploadPayloadPanel({ onAuthFail }) {
	const [form, setForm] = (0, import_react.useState)({
		build: "",
		ct_b64: "",
		iv_b64: "",
		sig_b64: "",
		key_b64: "",
		ct_sha: ""
	});
	const [busy, setBusy] = (0, import_react.useState)(false);
	const upd = (k, v) => setForm((f) => ({
		...f,
		[k]: v
	}));
	const readFileTo = async (k, file) => {
		const text = (await file.text()).trim();
		upd(k, text);
		toast.success(`Loaded ${file.name} into ${k}`);
	};
	const submit = async (e) => {
		e.preventDefault();
		for (const k of Object.keys(form)) if (!String(form[k]).trim()) return toast.error(`Missing ${k}`);
		setBusy(true);
		try {
			const r = await uploadPayload(form);
			toast.success(`Uploaded build ${form.build}`);
			console.log("uploadPayload response", r);
		} catch (err) {
			const msg = err.message;
			if (/401|403|unauthor|forbidden/i.test(msg)) {
				toast.error("Admin key rejected — re-enter it");
				onAuthFail();
			} else toast.error(msg);
		} finally {
			setBusy(false);
		}
	};
	const Field = ({ k, label, rows = 3 }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1 flex items-center justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "text-xs font-semibold text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-primary",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUp, { className: "h-3 w-3" }),
				" Load file",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					className: "hidden",
					onChange: (e) => e.target.files?.[0] && readFileTo(k, e.target.files[0])
				})
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
		rows,
		value: String(form[k]),
		onChange: (e) => upd(k, e.target.value),
		className: "font-mono text-xs"
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card/60 p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-1 font-display text-lg font-bold",
				children: "Upload OTA payload"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-4 text-xs text-muted-foreground",
				children: [
					"Pushes a new encrypted build to ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/admin/upload-payload"
					}),
					"."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "grid gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-xs font-semibold text-muted-foreground",
						children: "Build"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "mt-1",
						placeholder: "e.g. 42 or 1.2.3",
						value: String(form.build),
						onChange: (e) => upd("build", e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 md:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								k: "ct_b64",
								label: "ct_b64 (ciphertext)",
								rows: 4
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								k: "iv_b64",
								label: "iv_b64",
								rows: 4
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								k: "sig_b64",
								label: "sig_b64",
								rows: 4
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								k: "key_b64",
								label: "key_b64",
								rows: 4
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						k: "ct_sha",
						label: "ct_sha (hex)",
						rows: 2
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							disabled: busy,
							style: { background: "var(--gradient-primary)" },
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-2 h-4 w-4" }), "Upload payload"]
						})
					})
				]
			})
		]
	});
}
function BanPanel({ onAuthFail }) {
	const [banFp, setBanFp] = (0, import_react.useState)("");
	const [banReason, setBanReason] = (0, import_react.useState)("");
	const [unbanFp, setUnbanFp] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [banned, setBanned] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const reload = async () => {
		setLoading(true);
		try {
			setBanned(await listBannedDevices());
		} catch (e) {
			toast.error(e.message);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		reload();
	}, []);
	const handleErr = (e) => {
		const msg = e.message;
		if (/401|403|unauthor|forbidden/i.test(msg)) {
			toast.error("Admin key rejected — re-enter it");
			onAuthFail();
		} else toast.error(msg);
	};
	const doBan = async (e) => {
		e.preventDefault();
		const fp = banFp.trim();
		const reason = banReason.trim();
		if (!fp || !reason) return toast.error("Fingerprint and reason are required");
		if (!window.confirm(`Ban device\n${fp}\nReason: ${reason}?`)) return;
		setBusy(true);
		try {
			await banDevice(fp, reason);
			toast.success("Banned");
			setBanFp("");
			setBanReason("");
			await reload();
		} catch (e2) {
			handleErr(e2);
		} finally {
			setBusy(false);
		}
	};
	const doUnban = async (fp) => {
		if (!fp) return;
		if (!window.confirm(`Unban ${fp}?`)) return;
		setBusy(true);
		try {
			await unbanDevice(fp);
			toast.success("Unbanned");
			setUnbanFp("");
			await reload();
		} catch (e) {
			handleErr(e);
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card/60 p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-lg font-bold",
					children: "Ban manager"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Block or restore device fingerprints."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					onClick: reload,
					disabled: loading,
					children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "mr-2 h-4 w-4" }), "Refresh"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: doBan,
					className: "rounded-xl border border-red-400/20 bg-red-400/5 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "mb-3 flex items-center gap-2 text-sm font-bold text-red-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "h-4 w-4" }), "Ban device"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Fingerprint",
							value: banFp,
							onChange: (e) => setBanFp(e.target.value),
							className: "mb-2 font-mono text-xs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Reason",
							value: banReason,
							onChange: (e) => setBanReason(e.target.value),
							className: "mb-3"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							disabled: busy,
							className: "w-full bg-red-500 hover:bg-red-600",
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "mr-2 h-4 w-4" }), "Ban"]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						doUnban(unbanFp.trim());
					},
					className: "rounded-xl border border-green-400/20 bg-green-400/5 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "mb-3 flex items-center gap-2 text-sm font-bold text-green-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4" }), "Unban device"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Fingerprint",
							value: unbanFp,
							onChange: (e) => setUnbanFp(e.target.value),
							className: "mb-3 font-mono text-xs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							disabled: busy,
							className: "w-full bg-green-600 hover:bg-green-700",
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "mr-2 h-4 w-4" }), "Unban"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "mb-2 text-sm font-bold",
					children: "Banned devices"
				}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center py-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-primary" })
				}) : banned.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-6 text-center text-sm text-muted-foreground",
					children: "No banned devices."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "text-xs uppercase tracking-wider text-muted-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Fingerprint"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Reason"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "When"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3 text-right",
									children: "Action"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: banned.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border/40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 font-mono text-[11px]",
									children: b.fingerprint
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-xs",
									children: b.reason || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-xs text-muted-foreground",
									children: formatMaybeTime(b.time)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => doUnban(b.fingerprint),
										disabled: busy,
										className: "inline-flex items-center gap-1 rounded-md border border-green-400/40 px-2 py-1 text-[11px] text-green-300 hover:bg-green-400/10 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" }), "Unban"]
									})
								})
							]
						}, b.fingerprint)) })]
					})
				})]
			})
		]
	});
}
//#endregion
export { LoaderGate as component };
