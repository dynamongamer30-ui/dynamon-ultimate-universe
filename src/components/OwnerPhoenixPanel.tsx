import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { featureRpc } from "@/lib/featureRpc";

type Campaign = {
  slug: string;
  url_prefix: string;
  title: string;
  max_claims: number;
  claimed_count: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};
const fresh = (): Campaign => ({
  slug: "",
  url_prefix: "diwali-pass",
  title: "Diwali Pass",
  max_claims: 100,
  claimed_count: 0,
  active: false,
  starts_at: null,
  ends_at: null,
});
const input =
  "control-input min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";
const button = "touch-target rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40";
const localDate = (value: string | null) =>
  value
    ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
export function OwnerPhoenixPanel() {
  const { user } = useAuth();
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState<Campaign>(fresh);
  const [existing, setExisting] = useState(false);
  const [email, setEmail] = useState("");
  const [recipient, setRecipient] = useState<{ id: string; email: string } | null>(null);
  const [request, setRequest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const load = async () => {
    const id = identity.current;
    const [rows, stats] = await Promise.all([
      featureRpc<Campaign[]>("website_manage_campaign", { p_action: "list" }),
      featureRpc<Record<string, unknown>>("website_owner_automation"),
    ]);
    if (id !== identity.current) return;
    if (
      !Array.isArray(rows) ||
      rows.some(
        (r) =>
          typeof r.slug !== "string" ||
          !Number.isInteger(r.max_claims) ||
          !Number.isInteger(r.claimed_count),
      )
    )
      throw Error("Campaign response was incomplete. Retry loading.");
    setCampaigns(rows);
    setHealth(stats);
  };
  useEffect(() => {
    let active = true;
    setCampaigns([]);
    setHealth(null);
    setRecipient(null);
    setRequest(null);
    setEmail("");
    if (user?.id) {
      try {
        const pending = JSON.parse(sessionStorage.getItem(`dg:pending-pass:${user.id}`) || "null");
        if (
          pending &&
          typeof pending.request === "string" &&
          typeof pending.recipient?.id === "string" &&
          typeof pending.recipient?.email === "string"
        ) {
          setRequest(pending.request);
          setRecipient(pending.recipient);
          setEmail(pending.recipient.email);
        }
      } catch {
        /* recovery is optional */
      }
    }
    void load().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load owner tools.");
    });
    return () => {
      active = false;
    };
  }, [user?.id]);
  const run = async (task: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    const id = identity.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (e) {
      if (id === identity.current)
        setError(e instanceof Error ? e.message : "Request failed. Retry safely.");
    } finally {
      lock.current = false;
      if (id === identity.current) setBusy(false);
    }
  };
  const check = () =>
    void run(async () => {
      const id = identity.current;
      const result = await featureRpc<{ id: string; email: string } | null>(
        "website_find_account",
        { p_email: email.trim() },
      );
      if (id !== identity.current) return;
      if (!result || typeof result.id !== "string" || typeof result.email !== "string")
        throw Error("No registered account matches this email.");
      setRecipient(result);
      const requestId = crypto.randomUUID();
      setRequest(requestId);
      try {
        sessionStorage.setItem(
          `dg:pending-pass:${id}`,
          JSON.stringify({ request: requestId, recipient: result }),
        );
      } catch {
        /* in-memory retry still remains idempotent */
      }
    });
  const grant = () =>
    void run(async () => {
      if (!recipient || !request) return;
      const id = identity.current;
      const result = await featureRpc<{ ok: boolean; error?: string }>("website_grant_pass", {
        p_email: recipient.email,
        p_request_id: request,
      });
      if (id !== identity.current) return;
      if (result?.ok !== true)
        throw Error(
          result?.error ||
            "Grant was not confirmed. Retry uses the same request and cannot grant twice.",
        );
      setMessage(
        `Phoenix Pass confirmed for ${recipient.email}. It is available in My Rewards for 30 days.`,
      );
      try {
        sessionStorage.removeItem(`dg:pending-pass:${id}`);
      } catch {
        /* optional */
      }
      setRecipient(null);
      setRequest(null);
      setEmail("");
      await load();
    });
  const save = () =>
    void run(async () => {
      if (
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(draft.slug) ||
        !draft.title.trim() ||
        !Number.isInteger(draft.max_claims) ||
        draft.max_claims < Math.max(1, draft.claimed_count)
      )
        throw Error("Check the link name, heading and claim limit.");
      await featureRpc("website_save_campaign", {
        p_prefix: draft.url_prefix,
        p_slug: draft.slug,
        p_title: draft.title,
        p_max: draft.max_claims,
        p_active: draft.active,
        p_starts: draft.starts_at,
        p_ends: draft.ends_at,
      });
      setExisting(true);
      setMessage("Campaign saved. Existing claims and counts were preserved.");
      await load();
    });
  return (
    <section className="space-y-6" aria-label="Phoenix Pass owner tools">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h2 className="font-display text-2xl font-bold">Phoenix Pass</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Grant a 30-day pass to a registered account, or create a limited claim link. Claiming a
          pass does not spend it.
        </p>
        <label className="mt-5 block text-sm">
          Recipient email
          <input
            type="email"
            value={email}
            disabled={busy || !!recipient}
            onChange={(e) => setEmail(e.target.value)}
            className={`${input} mt-2`}
          />
        </label>
        {!recipient ? (
          <button disabled={busy || !email.trim()} onClick={check} className={`${button} mt-3`}>
            Find account
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-border p-4">
            <p>
              Grant one Phoenix Pass to <strong>{recipient.email}</strong>?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Retrying a failed confirmation uses the same request, so the recipient receives only
              one pass.
            </p>
            <div className="mt-3 flex gap-3">
              <button disabled={busy} onClick={grant} className={button}>
                Confirm grant / Retry
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  try {
                    sessionStorage.removeItem(`dg:pending-pass:${identity.current}`);
                  } catch {
                    /* optional */
                  }
                  setRecipient(null);
                  setRequest(null);
                }}
                className={button}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap justify-between gap-3">
          <h3 className="text-xl font-bold">Claim campaigns</h3>
          <button
            disabled={busy}
            className={button}
            onClick={() => {
              setDraft(fresh());
              setExisting(false);
            }}
          >
            New campaign
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {campaigns.map((c) => (
            <li key={c.slug} className="rounded-xl border border-border p-4">
              <strong>{c.title}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.claimed_count} claimed · {Math.max(0, c.max_claims - c.claimed_count)} remaining
                · {c.active ? "Enabled" : "Paused"}
              </p>
              <code className="mt-2 block break-all text-xs">/phoenix-pass/claim/{c.slug}</code>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  className={button}
                  onClick={() => {
                    setDraft(c);
                    setExisting(true);
                  }}
                >
                  Edit
                </button>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() => {
                    setDraft({ ...c, slug: "", claimed_count: 0, active: false });
                    setExisting(false);
                  }}
                >
                  Use as template
                </button>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      await featureRpc("website_manage_campaign", {
                        p_action: c.active ? "pause" : "resume",
                        p_slug: c.slug,
                      });
                      await load();
                    })
                  }
                >
                  {c.active ? "Pause" : "Resume"}
                </button>
                <button
                  disabled={busy}
                  className={`${button} text-destructive`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete ${c.title}? Its public link will close. Awarded passes and reward history will be preserved.`,
                      )
                    )
                      return;
                    void run(async () => {
                      await featureRpc("website_manage_campaign", {
                        p_action: "delete",
                        p_slug: c.slug,
                      });
                      if (draft.slug === c.slug) {
                        setDraft(fresh());
                        setExisting(false);
                      }
                      await load();
                      setMessage("Campaign deleted. Awarded rewards were preserved.");
                    });
                  }}
                >
                  Delete
                </button>
                <button
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${location.origin}/${c.url_prefix}/${c.slug}`,
                        );
                        setMessage("Claim link copied.");
                      } catch {
                        setMessage(`${location.origin}/${c.url_prefix}/${c.slug}`);
                      }
                    })
                  }
                >
                  Copy link
                </button>
              </div>
            </li>
          ))}
        </ul>
        <fieldset disabled={busy} className="mt-6 grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-bold">{existing ? "Edit campaign" : "New campaign"}</legend>
          <label className="text-sm">
            Link name
            <input
              value={draft.slug}
              disabled={existing}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}
              className={`${input} mt-2`}
              placeholder="community-october"
            />
          </label>
          <label className="text-sm">
            URL prefix
            <input
              value={draft.url_prefix}
              maxLength={60}
              onChange={(e) => setDraft({ ...draft, url_prefix: e.target.value.toLowerCase() })}
              className={`${input} mt-2`}
              placeholder="diwali-pass"
            />
          </label>
          <label className="text-sm">
            Heading
            <input
              value={draft.title}
              maxLength={100}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={`${input} mt-2`}
            />
          </label>
          <label className="text-sm">
            Total claim limit
            <input
              type="number"
              min={Math.max(1, draft.claimed_count)}
              max={100000}
              value={draft.max_claims}
              onChange={(e) => setDraft({ ...draft, max_claims: Number(e.target.value) })}
              className={`${input} mt-2`}
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Campaign enabled
          </label>
          {(["starts_at", "ends_at"] as const).map((field) => (
            <label key={field} className="text-sm">
              {field === "starts_at" ? "Starts" : "Ends"} (your local time, optional)
              <input
                type="datetime-local"
                value={localDate(draft[field])}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [field]: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className={`${input} mt-2`}
              />
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-xs text-muted-foreground">
          Campaigns save with this button so incomplete edits cannot accidentally open a public
          giveaway. Pausing preserves all existing claims. Existing reward receipts are always
          preserved.
        </p>
        <button disabled={busy} onClick={save} className={`${button} mt-4`}>
          Save campaign
        </button>
      </div>
      <details className="rounded-2xl border border-border bg-card p-5">
        <summary className="cursor-pointer font-bold">Owner guide and automation facts</summary>
        <p className="mt-3 text-sm text-muted-foreground">
          Find the exact registered email before granting. Publish a campaign only after checking
          the dates and total limit. Telegram membership verification protects campaign claims.
          Notification acknowledgement does not remove a reward from My Rewards. Manual
          announcements are preserved.
        </p>
        {health && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(health).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                <dd className="break-words text-sm">{v === null ? "No record" : String(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
      <p role="status" className="break-words text-sm">
        {busy ? "Working…" : message}
      </p>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <button disabled={busy} className={`${button} ml-3`} onClick={() => void run(load)}>
            Reload owner tools
          </button>
        </div>
      )}
    </section>
  );
}
