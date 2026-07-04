import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link, p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { d as playClick, g as useAuth, m as playSuccess, p as playSoft } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { N as LoaderCircle, a as User, j as Lock, k as Mail, lt as AtSign, p as Sparkles, rt as Check, ut as ArrowRight } from "../_libs/lucide-react.mjs";
import { l as useProfile, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as lovable } from "./lovable-B6gNMDHx.mjs";
import { t as AvatarPicker } from "./AvatarPicker-DESNKFbJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-BZoWaiB8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuthPage() {
	const { user, loading } = useAuth();
	const { profile, loading: profileLoading, refresh } = useProfile();
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("signin");
	const [step, setStep] = (0, import_react.useState)("credentials");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (loading || profileLoading) return;
		if (user && profile) navigate({ to: "/mods" });
		if (user && !profile) setStep("profile");
	}, [
		user,
		profile,
		loading,
		profileLoading,
		navigate
	]);
	const handleEmail = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			if (mode === "signup") {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: { emailRedirectTo: window.location.origin + "/auth" }
				});
				if (error) throw error;
				if (!data.session) {
					toast.success("Account created — check your email, then sign in.");
					setMode("signin");
					return;
				}
				playSuccess();
				toast.success("Account created — finish your profile.");
				setStep("profile");
			} else {
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (error) throw error;
				if (!data.session) throw new Error("Sign-in did not start. Please try again.");
				playSuccess();
				toast.success("Welcome back, Trainer.");
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setBusy(false);
		}
	};
	const handleGoogle = async () => {
		playClick();
		setBusy(true);
		try {
			const result = await lovable.auth.signInWithOAuth("google", {
				redirect_uri: window.location.origin + "/auth",
				extraParams: { prompt: "select_account" }
			});
			if (result.error) {
				toast.error(result.error.message || "Google sign-in failed");
				setBusy(false);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Google sign-in failed");
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-6xl gap-10 py-6 lg:grid-cols-[1.1fr_1.2fr] lg:items-start lg:py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				opacity: 0,
				y: 20
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "lg:sticky lg:top-24",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5" }), " Trainers only"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-5 font-display text-4xl font-black uppercase tracking-tight leading-[1.05] sm:text-5xl",
					children: ["Forge your ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gradient",
						children: "trainer identity."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-md text-muted-foreground",
					children: "One trainer, one username. Pick a profile avatar from 20 hand-crafted heroes and join the Dynamon vault."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-6 space-y-3 text-sm",
					children: [
						"Unique @username locked to your account",
						"20 aurora-ringed avatars to choose from",
						"Review mods, like comments, climb the wall",
						"Early access to every weekly drop"
					].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid h-6 w-6 place-items-center rounded-full text-primary-foreground",
							style: { background: "var(--gradient-primary)" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3" })
						}), t]
					}, t))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex items-center gap-2 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: step === "credentials" || !user,
							children: "1. Account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3 w-3 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: step === "profile" && !!user,
							children: "2. Profile"
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: {
				opacity: 0,
				y: 20
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "relative overflow-hidden edge-light rounded-2xl glass p-7 shadow-elev sm:p-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
				mode: "wait",
				children: step === "credentials" && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialsStep, {
					mode,
					setMode,
					email,
					setEmail,
					password,
					setPassword,
					busy,
					onEmail: handleEmail,
					onGoogle: handleGoogle
				}, "creds") : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileStep, { onDone: async () => {
					await refresh();
					navigate({ to: "/mods" });
				} }, "profile")
			})
		}, step)]
	}) });
}
function Chip({ active, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex items-center rounded-full border px-3 py-1 font-semibold uppercase tracking-wider ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`,
		children
	});
}
function CredentialsStep({ mode, setMode, email, setEmail, password, setPassword, busy, onEmail, onGoogle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			x: -10
		},
		animate: {
			opacity: 1,
			x: 0
		},
		exit: {
			opacity: 0,
			x: 10
		},
		className: "relative",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-extrabold uppercase tracking-tight",
				children: mode === "signin" ? "Welcome back" : "Create your account"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Continue with Google or email."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onGoogle,
				disabled: busy,
				className: "mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card disabled:opacity-60",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleIcon, {}), " Continue with Google"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-border" }),
					" or email ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-border" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: onEmail,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							placeholder: "you@email.com",
							autoComplete: "email",
							className: "w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							required: true,
							minLength: 6,
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "•••••••• (min 6 characters)",
							autoComplete: mode === "signin" ? "current-password" : "new-password",
							className: "w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "submit",
						disabled: busy,
						className: "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60",
						style: { background: "var(--gradient-primary)" },
						children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), mode === "signin" ? "Sign in" : "Continue"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-5 text-center text-xs text-muted-foreground",
				children: [
					mode === "signin" ? "New here?" : "Already a Trainer?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setMode(mode === "signin" ? "signup" : "signin"),
						className: "font-semibold text-primary hover:underline",
						children: mode === "signin" ? "Create an account" : "Sign in"
					})
				]
			})
		]
	});
}
function ProfileStep({ onDone }) {
	const { user } = useAuth();
	const [username, setUsername] = (0, import_react.useState)("");
	const [displayName, setDisplayName] = (0, import_react.useState)("");
	const [gender, setGender] = (0, import_react.useState)(null);
	const [avatarId, setAvatarId] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [usernameStatus, setUsernameStatus] = (0, import_react.useState)("idle");
	(0, import_react.useEffect)(() => {
		const u = username.trim();
		if (!u) {
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
	}, [username]);
	const submit = async (e) => {
		e.preventDefault();
		if (!user) {
			toast.error("Not signed in");
			return;
		}
		if (usernameStatus !== "ok") {
			toast.error("Pick a valid, available username");
			return;
		}
		if (!displayName.trim()) {
			toast.error("Display name is required");
			return;
		}
		if (!gender) {
			toast.error("Select a gender");
			return;
		}
		if (!avatarId) {
			toast.error("Pick an avatar");
			return;
		}
		setBusy(true);
		try {
			const { error } = await supabase.from("profiles").upsert({
				id: user.id,
				username: username.trim(),
				display_name: displayName.trim(),
				gender,
				avatar_url: avatarId
			});
			if (error) throw error;
			playSuccess();
			toast.success("Profile ready — welcome to the Universe!");
			onDone();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not save profile");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.form, {
		onSubmit: submit,
		initial: {
			opacity: 0,
			x: 10
		},
		animate: {
			opacity: 1,
			x: 0
		},
		exit: {
			opacity: 0,
			x: -10
		},
		className: "relative space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-extrabold uppercase tracking-tight",
				children: "Build your trainer"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Only takes a moment. You can update it anytime."
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
								placeholder: "ember_master",
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
							placeholder: "Ember Master",
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
						setAvatarId(null);
						playSoft();
					},
					className: `rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${gender === g ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`,
					children: g
				}, g))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
					children: "Pick your avatar"
				}), gender && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted-foreground",
					children: gender === "female" ? "10 female heroes" : gender === "male" ? "10 male heroes" : "All 20 heroes"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: gender ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarPicker, {
					value: avatarId,
					onChange: setAvatarId,
					gender
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground",
					children: "Pick a gender to see your heroes."
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "submit",
				disabled: busy,
				className: "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60",
				style: { background: "var(--gradient-primary)" },
				children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), "Enter the Universe"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-xs text-muted-foreground",
				children: [
					"By continuing you agree to our ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/disclaimer",
						className: "text-primary hover:underline",
						children: "Disclaimer & Safety"
					}),
					"."
				]
			})
		]
	});
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
function GoogleIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "h-4 w-4",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#4285F4",
				d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#34A853",
				d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#FBBC05",
				d: "M5.84 14.09A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.44.36-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#EA4335",
				d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
			})
		]
	});
}
//#endregion
export { AuthPage as component };
