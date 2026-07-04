import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as useGamification, c as formatCount, d as playClick, g as useAuth, m as playSuccess, p as playSoft, s as elementTheme, u as mods } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { B as GitCommitHorizontal, H as Flag, J as Download, N as LoaderCircle, S as Reply, dt as ArrowLeft, et as CirclePlay, f as Star, h as Shield, it as Calendar, p as Sparkles, r as X, rt as Check, u as Trash2, y as Send, z as Heart } from "../_libs/lucide-react.mjs";
import { c as getAvatarUrl, i as SocialStrip, l as useProfile, n as OwnerBadge, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as FavoriteButton } from "./FavoriteButton-mWjx10mE.mjs";
import { t as Route } from "./mods._slug-DpTyg_oY.mjs";
import { t as UnlockKeyButton } from "./UnlockKeyButton-DX-Q4cpR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mods._slug-BxmSs1mp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var REACTIONS = [
	{
		key: "fire",
		emoji: "🔥",
		color: "text-orange-300"
	},
	{
		key: "water",
		emoji: "💧",
		color: "text-cyan-300"
	},
	{
		key: "thunder",
		emoji: "⚡",
		color: "text-sky-300"
	},
	{
		key: "leaf",
		emoji: "🌿",
		color: "text-lime-300"
	},
	{
		key: "spirit",
		emoji: "✨",
		color: "text-fuchsia-300"
	}
];
function ElementalReactions({ commentId }) {
	const { user } = useAuth();
	const [rows, setRows] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		supabase.from("comment_reactions").select("user_id, reaction").eq("comment_id", commentId).then(({ data }) => {
			if (!cancelled) setRows(data ?? []);
		});
		return () => {
			cancelled = true;
		};
	}, [commentId]);
	const toggle = async (reaction) => {
		if (!user) return;
		playSoft();
		if (rows.find((r) => r.user_id === user.id && r.reaction === reaction)) {
			setRows((p) => p.filter((r) => !(r.user_id === user.id && r.reaction === reaction)));
			await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id).eq("reaction", reaction);
		} else {
			setRows((p) => [...p, {
				user_id: user.id,
				reaction
			}]);
			await supabase.from("comment_reactions").insert({
				comment_id: commentId,
				user_id: user.id,
				reaction
			});
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-1.5",
		children: REACTIONS.map((r) => {
			const count = rows.filter((x) => x.reaction === r.key).length;
			const mine = !!user && rows.some((x) => x.user_id === user.id && x.reaction === r.key);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
				whileTap: { scale: .85 },
				onClick: () => toggle(r.key),
				disabled: !user,
				className: `inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${mine ? "border-primary/50 bg-primary/10" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"} disabled:opacity-50 disabled:cursor-not-allowed`,
				"aria-label": `React ${r.emoji}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: r.emoji }), count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: mine ? r.color : "",
					children: count
				})]
			}, r.key);
		})
	});
}
function ReportButton({ targetType, targetId, label = "Report" }) {
	const { user } = useAuth();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [reason, setReason] = (0, import_react.useState)("spam");
	const [details, setDetails] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const submit = async () => {
		if (!user) {
			toast.error("Sign in to report");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("reports").insert({
			reporter_id: user.id,
			target_type: targetType,
			target_id: targetId,
			reason,
			details: details || null
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Report submitted — thank you");
		setOpen(false);
		setDetails("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => setOpen(true),
		className: "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { className: "h-3 w-3" }),
			" ",
			label
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		className: "fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm px-4",
		onClick: () => setOpen(false),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .94,
				opacity: 0
			},
			animate: {
				scale: 1,
				opacity: 1
			},
			exit: {
				scale: .94,
				opacity: 0
			},
			onClick: (e) => e.stopPropagation(),
			className: "w-full max-w-md rounded-3xl glass p-6 shadow-elev",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-display text-lg font-bold",
						children: ["Report this ", targetType]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Owner will review it within 24h."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setOpen(false),
						className: "grid h-8 w-8 place-items-center rounded-full border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: reason,
					onChange: (e) => setReason(e.target.value),
					className: "mt-4 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "spam",
							children: "Spam or promotion"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "abuse",
							children: "Abusive / harassment"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "nsfw",
							children: "NSFW or inappropriate"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "misinformation",
							children: "Misleading info"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "other",
							children: "Other"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: details,
					onChange: (e) => setDetails(e.target.value),
					placeholder: "Add context (optional)",
					rows: 3,
					maxLength: 500,
					className: "mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setOpen(false),
						className: "flex-1 rounded-full border border-border px-4 py-2 text-sm",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: submit,
						disabled: busy,
						className: "flex-1 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60",
						style: { background: "var(--gradient-primary)" },
						children: busy ? "Sending…" : "Submit report"
					})]
				})
			]
		})
	}) })] });
}
function CommentsPanel({ slug }) {
	const { user } = useAuth();
	const { profile } = useProfile();
	const { award, grant } = useGamification();
	const [comments, setComments] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [body, setBody] = (0, import_react.useState)("");
	const [rating, setRating] = (0, import_react.useState)(5);
	const [hover, setHover] = (0, import_react.useState)(0);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [replyOpen, setReplyOpen] = (0, import_react.useState)(null);
	const [replyBody, setReplyBody] = (0, import_react.useState)("");
	const load = (0, import_react.useCallback)(async () => {
		setLoading(true);
		const { data: rawComments } = await supabase.from("comments").select("id, mod_slug, user_id, body, rating, created_at, parent_id").eq("mod_slug", slug).order("created_at", { ascending: false });
		const list = rawComments ?? [];
		if (list.length === 0) {
			setComments([]);
			setLoading(false);
			return;
		}
		const authorIds = [...new Set(list.map((c) => c.user_id))];
		const commentIds = list.map((c) => c.id);
		const [{ data: authors }, { data: likes }] = await Promise.all([supabase.from("profiles").select("id, username, display_name, avatar_url, is_owner").in("id", authorIds), supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds)]);
		const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
		const likeRows = likes ?? [];
		const enriched = list.map((c) => {
			const likesFor = likeRows.filter((l) => l.comment_id === c.id);
			return {
				...c,
				author: authorMap.get(c.user_id),
				likeCount: likesFor.length,
				likedByMe: !!user && likesFor.some((l) => l.user_id === user.id)
			};
		});
		setComments(enriched);
		setLoading(false);
	}, [slug, user]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const topLevel = (0, import_react.useMemo)(() => comments.filter((c) => !c.parent_id), [comments]);
	const repliesByParent = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const c of comments) if (c.parent_id) {
			const arr = map.get(c.parent_id) ?? [];
			arr.push(c);
			map.set(c.parent_id, arr);
		}
		for (const arr of map.values()) arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
		return map;
	}, [comments]);
	const ratings = topLevel.map((c) => c.rating).filter((r) => typeof r === "number");
	const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
	const submit = async (e) => {
		e.preventDefault();
		if (!user || !profile) {
			toast.error("Sign in and complete your profile first");
			return;
		}
		if (!body.trim()) return;
		setBusy(true);
		try {
			const { error } = await supabase.from("comments").insert({
				mod_slug: slug,
				user_id: user.id,
				body: body.trim(),
				rating,
				parent_id: null
			});
			if (error) throw error;
			setBody("");
			setRating(5);
			playSuccess();
			toast.success("Review posted");
			award(15, "Reviewed");
			grant("first_review");
			load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not post review");
		} finally {
			setBusy(false);
		}
	};
	const submitReply = async (parentId) => {
		if (!user || !profile) {
			toast.error("Sign in first");
			return;
		}
		if (!replyBody.trim()) return;
		const { error } = await supabase.from("comments").insert({
			mod_slug: slug,
			user_id: user.id,
			body: replyBody.trim(),
			rating: null,
			parent_id: parentId
		});
		if (error) {
			toast.error(error.message);
			return;
		}
		setReplyBody("");
		setReplyOpen(null);
		playSuccess();
		award(5, "Replied");
		load();
	};
	const toggleLike = async (c) => {
		if (!user) {
			toast.error("Sign in to like");
			return;
		}
		playSoft();
		setComments((prev) => prev.map((x) => x.id === c.id ? {
			...x,
			likedByMe: !x.likedByMe,
			likeCount: x.likeCount + (x.likedByMe ? -1 : 1)
		} : x));
		if (c.likedByMe) await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
		else await supabase.from("comment_likes").insert({
			comment_id: c.id,
			user_id: user.id
		});
	};
	const remove = async (c) => {
		if (!user || c.user_id !== user.id && !profile?.is_owner) return;
		if (!confirm("Delete this review?")) return;
		await supabase.from("comments").delete().eq("id", c.id);
		setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
	};
	const renderComment = (c, isReply = false) => {
		const avatar = getAvatarUrl(c.author?.avatar_url);
		const canRemove = user?.id === c.user_id || profile?.is_owner;
		const replies = repliesByParent.get(c.id) ?? [];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			exit: {
				opacity: 0,
				y: -10
			},
			className: `rounded-2xl border border-border bg-background/40 p-4 ${isReply ? "ml-6 border-l-2 border-l-primary/30" : ""}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 items-center gap-3",
						children: [avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: avatar,
							alt: "",
							className: `h-10 w-10 rounded-full object-cover ${c.author?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/30"}`
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid h-10 w-10 place-items-center rounded-full font-bold text-primary-foreground",
							style: { background: "var(--gradient-violet)" },
							children: (c.author?.display_name ?? "T")[0].toUpperCase()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate text-sm font-semibold",
									children: c.author?.display_name ?? "Trainer"
								}), c.author?.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerBadge, { size: "xs" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate text-[11px] text-muted-foreground",
								children: [
									"@",
									c.author?.username ?? "trainer",
									" · ",
									new Date(c.created_at).toLocaleDateString()
								]
							})]
						})]
					}), typeof c.rating === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex shrink-0 gap-0.5",
						children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-3.5 w-3.5 ${i < (c.rating ?? 0) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}` }, i))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground",
					children: c.body
				}),
				!isReply && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ElementalReactions, { commentId: c.id })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => toggleLike(c),
							className: `inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors ${c.likedByMe ? "border-rose-400/40 text-rose-400" : "text-muted-foreground hover:text-foreground"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: `h-3.5 w-3.5 ${c.likedByMe ? "fill-rose-400" : ""}` }), c.likeCount]
						}),
						!isReply && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setReplyOpen(replyOpen === c.id ? null : c.id);
								setReplyBody("");
							},
							className: "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reply, { className: "h-3.5 w-3.5" }), " Reply"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportButton, {
							targetType: "comment",
							targetId: c.id
						}),
						canRemove && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => remove(c),
							className: "ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" }), " Delete"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: replyOpen === c.id && !isReply && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						height: 0
					},
					animate: {
						opacity: 1,
						height: "auto"
					},
					exit: {
						opacity: 0,
						height: 0
					},
					className: "mt-3 overflow-hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: replyBody,
						onChange: (e) => setReplyBody(e.target.value),
						placeholder: `Reply to @${c.author?.username ?? "trainer"}…`,
						rows: 2,
						maxLength: 500,
						className: "w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setReplyOpen(null),
							className: "rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => submitReply(c.id),
							className: "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-primary-foreground",
							style: { background: "var(--gradient-primary)" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-3 w-3" }), " Post reply"]
						})]
					})]
				}) }),
				replies.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 space-y-3",
					children: replies.map((r) => renderComment(r, true))
				})
			]
		}, c.id);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "comments",
		className: "mt-14 scroll-mt-24",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 sm:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Community Rating",
					value: (avg || 0).toFixed(1),
					sub: `${ratings.length} ratings`,
					stars: Math.round(avg)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Reviews",
					value: String(topLevel.length),
					sub: "Be helpful. Be honest."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Likes",
					value: String(comments.reduce((s, c) => s + c.likeCount, 0)),
					sub: "One like per trainer per comment"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-3xl glass p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-xl font-bold",
					children: "Leave a review"
				}), !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth",
						className: "font-semibold text-primary hover:underline",
						children: "Sign in"
					}), " to leave a review and like other trainers' comments."]
				}) : !profile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground",
					children: [
						"Finish your ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							className: "font-semibold text-primary hover:underline",
							children: "trainer profile"
						}),
						" to post a review."
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
							children: "Your rating"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex gap-1",
							children: Array.from({ length: 5 }).map((_, i) => {
								const v = i + 1;
								const active = (hover || rating) >= v;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onMouseEnter: () => setHover(v),
									onMouseLeave: () => setHover(0),
									onClick: () => {
										setRating(v);
										playSoft();
									},
									className: "p-1",
									"aria-label": `Rate ${v} star`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-7 w-7 transition-all ${active ? "fill-[var(--gold)] text-[var(--gold)] scale-110" : "text-muted-foreground"}` })
								}, v);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: body,
							onChange: (e) => setBody(e.target.value),
							placeholder: "Share your experience…",
							rows: 4,
							maxLength: 1e3,
							className: "mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "submit",
							disabled: busy,
							onMouseDown: playClick,
							className: "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] glow-primary disabled:opacity-60",
							style: { background: "var(--gradient-primary)" },
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" }), "Post review"]
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-3xl glass p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-xl font-bold",
					children: "What trainers are saying"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 space-y-4",
					children: [
						loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground",
							children: "Loading reviews…"
						}),
						!loading && topLevel.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground",
							children: "No reviews yet. Be the first to share your experience."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
							initial: false,
							children: topLevel.map((c) => renderComment(c))
						})
					]
				})]
			})]
		})]
	});
}
function StatCard({ label, value, sub, stars }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-3xl glass p-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-widest text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-display text-5xl font-bold text-gradient",
				children: value
			}),
			typeof stars === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex justify-center gap-0.5",
				children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-4 w-4 ${i < stars ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}` }, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted-foreground",
				children: sub
			})
		]
	});
}
function ChangelogTimeline({ entries, glow }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-primary/30 to-transparent",
			"aria-hidden": true
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "space-y-5",
			children: entries.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.li, {
				initial: {
					opacity: 0,
					x: -10
				},
				whileInView: {
					opacity: 1,
					x: 0
				},
				viewport: { once: true },
				transition: { delay: i * .06 },
				className: "relative pl-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full text-primary-foreground",
					style: {
						background: "var(--gradient-primary)",
						boxShadow: glow
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitCommitHorizontal, { className: "h-3.5 w-3.5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl glass p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-display text-lg font-bold",
							children: ["v", c.version]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-3 w-3" }),
								" ",
								new Date(c.date).toLocaleDateString()
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-1.5 text-sm text-muted-foreground",
						children: c.notes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" }),
								" ",
								n
							]
						}, n))
					})]
				})]
			}, c.version))
		})]
	});
}
function ModDetail() {
	const { mod } = Route.useLoaderData();
	const { user } = useAuth();
	const { award, grant } = useGamification();
	const theme = elementTheme[mod.element];
	const [tab, setTab] = (0, import_react.useState)("overview");
	const handleGet = () => {
		if (!user) {
			toast.error("Sign in to download");
			return;
		}
		playClick();
		award(10, "Downloaded");
		grant("first_download");
		toast.success(`${mod.name} — download starting`, { description: "Build access is delivered through our community channels for safety." });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/mods",
			onMouseDown: playClick,
			className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Back to mods"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 20
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "edge-light relative overflow-hidden rounded-2xl border border-border bg-card",
				style: { boxShadow: theme.glow },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 z-10 opacity-40 mix-blend-overlay",
						style: { background: theme.gradient }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: mod.image,
						alt: mod.name,
						width: 1024,
						height: 1024,
						className: "relative aspect-square w-full object-cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-card to-transparent p-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${theme.chip}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }),
								" ",
								theme.label,
								" element"
							]
						})
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 20
				},
				animate: {
					opacity: 1,
					y: 0
				},
				transition: { delay: .1 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-block h-px w-8 bg-primary",
							"aria-hidden": true
						}), "Dynamons World · Mod APK"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl",
						children: mod.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-lg leading-relaxed text-muted-foreground text-pretty",
						children: mod.tagline
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 inline-flex rounded-lg border border-border bg-card p-1 text-xs font-bold",
						children: ["overview", "changelog"].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setTab(t);
								playClick();
							},
							className: `press rounded-md px-4 py-1.5 capitalize transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
							children: t
						}, t))
					}),
					tab === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 rounded-2xl glass p-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed text-muted-foreground",
							children: mod.description
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-5 grid gap-2 sm:grid-cols-2",
						children: mod.features.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })
							}), f]
						}, f))
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChangelogTimeline, {
							entries: mod.changelog,
							glow: theme.glow
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-7 flex flex-wrap gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: handleGet,
								className: "press inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }),
									" ",
									user ? "Download mod" : "Sign in to download"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnlockKeyButton, {
								variant: "outline",
								label: "Unlock Key"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FavoriteButton, { slug: mod.slug }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/disclaimer",
								onMouseDown: playClick,
								className: "press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }), " Safety notes"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid grid-cols-4 gap-3 text-center text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Downloads",
								value: `${formatCount(mod.downloads)}+`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Version",
								value: mod.version
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Size",
								value: mod.size
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Updated",
								value: new Date(mod.updated).toLocaleDateString()
							})
						]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-14",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-end justify-between",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-primary",
					children: "Gameplay"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "mt-1 font-display text-2xl font-extrabold uppercase tracking-tight",
					children: [
						"Watch the ",
						theme.label,
						" build in action"
					]
				})] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 overflow-hidden edge-light rounded-2xl glass",
				style: { boxShadow: theme.glow },
				children: mod.youtubeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative aspect-video w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						className: "absolute inset-0 h-full w-full",
						src: `https://www.youtube.com/embed/${mod.youtubeId}`,
						title: `${mod.name} gameplay`,
						allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
						allowFullScreen: true,
						loading: "lazy"
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative aspect-video w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: mod.image,
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover opacity-60"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 grid place-items-center bg-gradient-to-t from-background/90 to-background/30",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground",
									style: { background: "var(--gradient-primary)" },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CirclePlay, { className: "h-8 w-8" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 font-display text-lg font-bold",
									children: "Trailer dropping soon"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm text-muted-foreground",
									children: "Subscribe on YouTube to be the first to watch."
								})
							]
						})
					})]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommentsPanel, { slug: mod.slug }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-16",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-extrabold uppercase tracking-tight",
				children: "More from the vault"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 grid gap-4 sm:grid-cols-3",
				children: mods.filter((m) => m.slug !== mod.slug).slice(0, 3).map((m) => {
					const t = elementTheme[m.element];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/mods/$slug",
						params: { slug: m.slug },
						onMouseDown: playClick,
						className: "group relative overflow-hidden rounded-2xl glass",
						style: { boxShadow: t.glow },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: m.image,
							alt: m.name,
							width: 1024,
							height: 1024,
							loading: "lazy",
							className: "aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-sm font-bold",
								children: m.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground",
								children: [
									"v",
									m.version,
									" · ",
									t.label
								]
							})]
						})]
					}, m.slug);
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-16",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialStrip, {})
		})
	] });
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card/60 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[10px] uppercase tracking-widest text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm font-semibold",
			children: value
		})]
	});
}
//#endregion
export { ModDetail as component };
