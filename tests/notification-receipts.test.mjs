import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

test("personal inbox scopes owner reads and confirms saved acknowledgements", async () => {
  const owner = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  const notice = (id, target_user_id) => ({
    id, target_user_id, title: id, body: "Fixture", created_at: "2026-10-31T00:00:00Z",
  });
  const rows = [notice("broadcast", null), notice("mine", owner), notice("other-user", other)];
  const receipts = new Set();
  let filter;
  let partial = false;
  const chain = {
    select() { return this; },
    order() { return this; },
    or(value) { filter = value; return this; },
    abortSignal() { return this; },
    retry() { return Promise.resolve({ data: rows, error: null }); },
  };
  globalThis.__notificationTest = {
    supabase: { from: () => chain },
    featureRpc: async (_name, { p_ids }) => {
      if (partial) return { ok: true, acknowledged: 0 };
      p_ids.forEach((id) => receipts.add(id));
      return { ok: true, acknowledged: p_ids.length };
    },
  };
  try {
    const source = stripTypeScriptTypes(
      await readFile(new URL("../src/lib/notifications.ts", import.meta.url), "utf8"),
    )
      .replace('import { featureRpc } from "./featureRpc";', "const { featureRpc } = globalThis.__notificationTest;")
      .replace('import { supabase } from "@/integrations/supabase/client";', "const { supabase } = globalThis.__notificationTest;");
    const { listNotifications, markRead } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    const inbox = await listNotifications(undefined, owner);
    assert.equal(filter, `target_user_id.is.null,target_user_id.eq.${owner}`);
    assert.deepEqual(inbox.map((n) => n.id), ["broadcast", "mine"]);
    await markRead(inbox.map((n) => n.id), owner);
    const refreshed = await listNotifications(undefined, owner);
    assert.equal(refreshed.filter((n) => !receipts.has(n.id)).length, 0);
    assert.equal((await listNotifications()).length, 3, "admin retains all recipients");
    partial = true;
    await assert.rejects(markRead(["mine"], owner), /Acknowledgement not confirmed/);
  } finally {
    delete globalThis.__notificationTest;
  }
});
