import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link, p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { d as playClick, g as useAuth, m as playSuccess, p as playSoft } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { N as LoaderCircle, a as User, g as ShieldCheck, lt as AtSign, x as Save } from "../_libs/lucide-react.mjs";
import { c as getAvatarUrl, l as useProfile, n as OwnerBadge, o as VerifiedFounderChip, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as AvatarPicker } from "./AvatarPicker-DESNKFbJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-BitHH5RA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const { user, loading } = useAuth();
	const { profile, loading: profileLoading, refresh } = useProfile();
	const navigate = useNavigate();
	const [displayName, setDisplayName] = (0, import_react.useState)("");
	const [gender, setGender] = (0, import_react.useState)(null);
	const [avatarId, setAvatarId] = (0, import_react.useState)(null);
	const [username, setUsername] = (0, import_react.useState)("");
	const [usernameStatus, setUsernameStatus] = (0, import_react.useState)("idle");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (loading) return;
		if (!user) {
			navigate({ to: "/auth" });
			return;
		}
	}, [
		user,
		loading,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (profile) {
			setDisplayName(profile.display_name);
			setGender(profile.gender);
			setAvatarId(profile.avatar_url);
			setUsername(profile.username);
		}
	}, [profile]);
	(0, import_react.useEffect)(() => {
		const u = username.trim();
		if (!u || profile && u.toLowerCase() === profile.username.toLowerCase()) {
			setUsernameStatus("idle");
			return;
		}
		if (!/^[a-zA-Z0-9_]{3,24}$/.test(u)) {
			setUsernameStatus("invalid");
			return;
		}
		setUsernameStatus("checking");
		const t = setTimeout(async () => {
			const { data, error } = await supabase.rpc("username_available", { _username: u });
			if (error) {
				setUsernameStatus("idle");
				return;
			}
			setUsernameStatus(data ? "ok" : "taken");
		}, 350);
		return () => clearTimeout(t);
	}, [username, profile]);
	const submit = async (e) => {
		e.preventDefault();
		if (!user) return;
		if (!displayName.trim()) {
			toast.error("Display name required");
			return;
		}
		if (!gender) {
			toast.error("Pick a gender");
			return;
		}
		if (!avatarId) {
			toast.error("Pick an avatar");
			return;
		}
		if (username !== profile?.username && usernameStatus !== "ok") {
			toast.error("Username unavailable");
			return;
		}
		setBusy(true);
		try {
			const { error } = await supabase.from("profiles").update({
				username: username.trim(),
				display_name: displayName.trim(),
				gender,
				avatar_url: avatarId
			}).eq("id", user.id);
			if (error) throw error;
			playSuccess();
			toast.success("Profile updated");
			await refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not update");
		} finally {
			setBusy(false);
		}
	};
	if (loading || profileLoading || !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid place-items-center py-20 text-muted-foreground",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin" })
	}) });
	if (!profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md py-20 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl font-extrabold uppercase tracking-tight",
				children: "Finish setting up your trainer"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: "Pick a username, avatar and gender first."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/auth",
				className: "mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground",
				style: { background: "var(--gradient-primary)" },
				children: "Complete profile"
			})
		]
	}) });
	const avatarUrl = getAvatarUrl(avatarId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-6xl gap-8 py-6 lg:grid-cols-[1fr_1.5fr] lg:py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.aside, {
			initial: {
				opacity: 0,
				y: 12
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "relative overflow-hidden edge-light rounded-2xl glass p-6 lg:sticky lg:top-24",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex flex-col items-center text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [avatarUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: avatarUrl,
							alt: "",
							className: "h-32 w-32 rounded-full object-cover ring-4 ring-primary/40"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid h-32 w-32 place-items-center rounded-full text-4xl font-bold text-primary-foreground",
							style: { background: "var(--gradient-violet)" },
							children: displayName[0]?.toUpperCase() ?? "T"
						}), profile.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute -bottom-1 left-1/2 -translate-x-1/2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerBadge, { size: "md" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-6 font-display text-2xl font-extrabold uppercase tracking-tight",
						children: displayName || "Your name"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground",
						children: ["@", username || profile.username]
					}),
					profile.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap justify-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VerifiedFounderChip, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5" }), " Trusted Authority"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-xs text-muted-foreground",
						children: user.email
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.form, {
			initial: {
				opacity: 0,
				y: 12
			},
			animate: {
				opacity: 1,
				y: 0
			},
			onSubmit: submit,
			className: "space-y-6 edge-light rounded-2xl glass p-7 sm:p-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-extrabold uppercase tracking-tight",
					children: "Edit profile"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Update your name, avatar or username anytime."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Username",
						hint: "3–24 chars, letters, numbers, _",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtSign, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: username,
									onChange: (e) => setUsername(e.target.value),
									maxLength: 24,
									required: true,
									className: "w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-20 text-sm outline-none focus:border-primary"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsernameBadge, { status: usernameStatus })
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Display name",
						hint: "Shown on reviews",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: displayName,
								onChange: (e) => setDisplayName(e.target.value),
								maxLength: 40,
								required: true,
								className: "w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
							})]
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
					children: "Gender"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 grid grid-cols-3 gap-2",
					children: [
						"male",
						"female",
						"other"
					].map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setGender(g);
							playSoft();
						},
						className: `rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${gender === g ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`,
						children: g
					}, g))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
					children: "Avatar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarPicker, {
						value: avatarId,
						onChange: setAvatarId,
						gender
					})
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "submit",
					disabled: busy,
					onMouseDown: playClick,
					className: "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60",
					style: { background: "var(--gradient-primary)" },
					children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), "Save changes"]
				})
			]
		})]
	}) });
}
function Field({ label, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
				children: label
			}), hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[10px] text-muted-foreground/80",
				children: hint
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1.5",
			children
		})]
	});
}
function UsernameBadge({ status }) {
	if (status === "idle") return null;
	const s = {
		checking: {
			text: "checking…",
			c: "text-muted-foreground"
		},
		ok: {
			text: "available",
			c: "text-emerald-400"
		},
		taken: {
			text: "taken",
			c: "text-rose-400"
		},
		invalid: {
			text: "invalid",
			c: "text-amber-400"
		}
	}[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wider ${s.c}`,
		children: s.text
	});
}
//#endregion
export { ProfilePage as component };
