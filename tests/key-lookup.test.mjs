import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
const source = (await readFile(new URL("../src/lib/dgData.ts", import.meta.url), "utf8"))
  .replace(/import \{ supabase \} from [^;]+;/, "const supabase = globalThis.__keyLookupFixture;")
  .replace(
    /import \{ extendedKeyData \} from [^;]+;/,
    "const extendedKeyData = () => { throw new Error('Unused by this read-only fixture'); };",
  );
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  const state = { requests: [], removed: 0, change: () => {} };
  const channel = {
    on(_event, _filter, handler) {
      state.change = handler;
      return channel;
    },
    subscribe() {
      return channel;
    },
  };
  return {
    state,
    client: {
      from(table) {
        assert.equal(table, "valid_keys");
        const request = { signal: null, retries: null, resolve: null };
        const promise = new Promise((resolve) => {
          request.resolve = resolve;
        });
        state.requests.push(request);
        const query = {
          select(fields) {
            assert.equal(fields, "id,data");
            return query;
          },
          abortSignal(signal) {
            request.signal = signal;
            return query;
          },
          retry(value) {
            request.retries = value;
            return promise;
          },
        };
        return query;
      },
      channel: () => channel,
      removeChannel: async () => {
        state.removed++;
      },
    },
  };
}
async function load(client, suffix) {
  globalThis.__keyLookupFixture = client;
  return import(
    "data:text/javascript;base64," +
      Buffer.from(stripTypeScriptTypes(source + `\n// ${suffix}`)).toString("base64")
  );
}
test("key realtime bursts coalesce and a superseded snapshot is never displayed", async () => {
  const { state, client } = fixture();
  const { listKeys } = await load(client, "burst");
  const values = [],
    errors = [];
  const stop = listKeys(
    (keys) => values.push(keys),
    (error) => errors.push(error),
  );
  for (let i = 0; i < 20; i++) state.change();
  assert.equal(state.requests.length, 1);
  state.requests[0].resolve({ data: [{ id: "LOCAL-OLD", data: {} }], error: null });
  await tick();
  assert.equal(state.requests.length, 2);
  assert.deepEqual(values, []);
  state.requests[1].resolve({ data: [{ id: "LOCAL-CURRENT", data: {} }], error: null });
  await tick();
  assert.equal(values.length, 1);
  assert.equal(values[0][0].key, "LOCAL-CURRENT");
  assert.equal(
    state.requests.every((request) => request.retries === false),
    true,
  );
  assert.deepEqual(errors, []);
  stop();
  assert.equal(state.removed, 1);
});
test("leaving the key view cancels its lookup and suppresses late data and errors", async () => {
  const { state, client } = fixture();
  const { listKeys } = await load(client, "dispose");
  const values = [],
    errors = [];
  const stop = listKeys(
    (keys) => values.push(keys),
    (error) => errors.push(error),
  );
  stop();
  assert.equal(state.requests[0].signal.aborted, true);
  state.requests[0].resolve({ data: null, error: { message: "Aborted" } });
  await tick();
  state.change();
  assert.equal(state.requests.length, 1);
  assert.deepEqual(values, []);
  assert.deepEqual(errors, []);
});
