import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setupEngagement, uuid } from "../fixtures/engagement-sql.mjs";

// Opt-in native integration suite. It creates its own disposable cluster and
// never accepts a database URL, existing data directory or external hostname.
const bin = process.env.ENGAGEMENT_PG_BIN;
const executable = (name) => path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const env = { ...process.env };
for (const key of Object.keys(env)) if (key.startsWith("PG")) delete env[key];
env.PGCLIENTENCODING = "UTF8";

function processRun(file, args, input, application = "fixture-control", timeout = 20000) {
  const child = spawn(file, args, {
    windowsHide: true,
    env: { ...env, PGAPPNAME: application },
    stdio: "pipe",
  });
  let stdout = "",
    stderr = "",
    timedOut = false;
  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });
  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });
  const deadline = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeout);
  const done = new Promise((resolve) => {
    child.on("error", (error) => {
      clearTimeout(deadline);
      resolve({ code: -1, stdout, stderr: error.message, timedOut });
    });
    // pg_ctl's detached Windows server can inherit pipe handles after pg_ctl
    // itself exits. Do not wait for that server's lifetime to close the pipes.
    const controller = path.basename(file).startsWith("pg_ctl");
    child.on(controller ? "exit" : "close", (code) => {
      clearTimeout(deadline);
      if (controller) {
        child.stdin.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
      }
      resolve({ code, stdout, stderr, timedOut });
    });
  });
  if (input !== undefined) child.stdin.end(input);
  return { child, done, output: () => stdout };
}
async function succeed(process) {
  const result = await process.done;
  assert.equal(result.code, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(result.timedOut, false);
  return result.stdout;
}
async function until(predicate, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}
const jsonLine = (output) =>
  JSON.parse(
    output
      .trim()
      .split(/\r?\n/)
      .findLast((line) => /^[\[{]/.test(line)),
  );

test(
  "native engagement transactions across independent PostgreSQL sessions",
  { skip: !bin, timeout: 120000 },
  async (t) => {
    for (const name of ["initdb", "postgres", "pg_ctl", "psql"]) await access(executable(name));
    const artifactRoot = process.env.ENGAGEMENT_PG_ARTIFACTS || tmpdir();
    await mkdir(artifactRoot, { recursive: true });
    const directory = await mkdtemp(path.join(artifactRoot, "dg-engagement-pg-"));
    const cluster = path.join(directory, "cluster");
    const listener = createServer();
    await new Promise((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(0, "127.0.0.1", resolve);
    });
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    let started = false;
    const sessions = new Set();
    const args = [
      "-X",
      "-qAt",
      "-w",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      "127.0.0.1",
      "-p",
      String(port),
      "-U",
      "fixture_owner",
      "-d",
      "postgres",
    ];
    const sql = (query, application) =>
      succeed(processRun(executable("psql"), args, query, application));
    const recordSql = (mod = "mod-1", user = uuid(1)) => `
    set role authenticated;
    select set_config('request.jwt.claim.sub','${user}',false);
    select json_agg(r) from public.record_engagement('mod_like','${mod}') r;
  `;
    const record = async (mod, user) => jsonLine(await sql(recordSql(mod, user)))[0];
    const snapshot = async (user = uuid(1)) =>
      jsonLine(
        await sql(`
    select json_build_object(
      'xp',(select xp from public.user_xp where user_id='${user}'),
      'events',(select count(*) from public.user_engagement_events where user_id='${user}'),
      'badges',(select count(*) from public.user_achievements where user_id='${user}')
    );
  `),
      );
    const reset = async (seedXP = false) =>
      sql(`
    truncate public.user_engagement_events,public.user_xp,public.user_achievements,
      public.favorites,public.mod_likes,public.mod_ratings;
    insert into public.mod_likes values ('${uuid(1)}','mod-1'),('${uuid(1)}','mod-2'),('${uuid(2)}','mod-1');
    ${seedXP ? `insert into public.user_xp(user_id) values('${uuid(1)}');` : ""}
  `);
    const hold = async (application = "fixture-first") => {
      const session = processRun(executable("psql"), args, undefined, application);
      sessions.add(session);
      session.child.stdin.write(`begin;\n${recordSql()}\n\\echo FIXTURE_LOCK_HELD\n`);
      await until(
        () => session.output().includes("FIXTURE_LOCK_HELD"),
        "First transaction did not reach the lock barrier",
      );
      return session;
    };
    const finish = async (session, action = "commit") => {
      session.child.stdin.end(`${action};\n\\q\n`);
      const result = await succeed(session);
      sessions.delete(session);
      return result;
    };
    const competing = (query, application = "fixture-second") => {
      const session = processRun(executable("psql"), args, query, application);
      sessions.add(session);
      return session;
    };
    const blocked = async (application = "fixture-second") =>
      until(
        async () =>
          (
            await sql(
              `select count(*) from pg_stat_activity where application_name='${application}' and wait_event_type='Lock' and datname=current_database();`,
            )
          ).trim() === "1",
        "Competing transaction never entered a PostgreSQL lock wait",
      );
    try {
      await succeed(
        processRun(
          executable("initdb"),
          ["-D", cluster, "-A", "trust", "-U", "fixture_owner", "--no-locale", "-E", "UTF8"],
          "",
          undefined,
          30000,
        ),
      );
      await succeed(
        processRun(
          executable("pg_ctl"),
          [
            "start",
            "-D",
            cluster,
            "-l",
            path.join(directory, "postgres.log"),
            "-o",
            `-h 127.0.0.1 -p ${port}`,
            "-w",
            "-t",
            "20",
          ],
          "",
          undefined,
          30000,
        ),
      );
      started = true;
      const identity = jsonLine(
        await sql(
          "select json_build_object('directory',current_setting('data_directory'),'port',current_setting('port'),'isolation',current_setting('default_transaction_isolation'),'version',version());",
        ),
      );
      assert.equal(
        path.resolve(identity.directory).toLowerCase(),
        path.resolve(cluster).toLowerCase(),
        "Refuse any database outside the newly created fixture cluster",
      );
      assert.equal(Number(identity.port), port);
      assert.equal(identity.isolation, "read committed");
      t.diagnostic(
        `Native ${identity.version.split(",")[0]}; isolated loopback cluster; no production connection`,
      );
      await setupEngagement({ exec: sql });

      await t.test("same-event calls wait for commit and award only once", async () => {
        await reset();
        const first = await hold();
        const second = competing(recordSql());
        await blocked();
        await finish(first);
        const result = jsonLine(await succeed(second))[0];
        sessions.delete(second);
        assert.deepEqual(result, { xp: 27, level: 1, leveled_up: false, awarded: false });
        assert.deepEqual(await snapshot(), { xp: 27, events: 1, badges: 1 });
      });

      await t.test(
        "different events serialize existing XP updates and do not duplicate a badge",
        async () => {
          await reset(true);
          const first = await hold();
          const second = competing(recordSql("mod-2"));
          await blocked();
          await finish(first);
          assert.equal(jsonLine(await succeed(second))[0].awarded, true);
          sessions.delete(second);
          assert.deepEqual(await snapshot(), { xp: 29, events: 2, badges: 1 });
        },
      );

      await t.test(
        "simultaneous first XP-row creation preserves both event increments",
        async () => {
          await reset();
          const first = await hold();
          const second = competing(recordSql("mod-2"));
          await blocked();
          await finish(first);
          assert.equal(jsonLine(await succeed(second))[0].xp, 29);
          sessions.delete(second);
          assert.deepEqual(await snapshot(), { xp: 29, events: 2, badges: 1 });
        },
      );

      await t.test(
        "a rolled-back winning insert lets the waiting caller award normally",
        async () => {
          await reset();
          const first = await hold();
          const second = competing(recordSql());
          await blocked();
          await finish(first, "rollback");
          assert.deepEqual(jsonLine(await succeed(second))[0], {
            xp: 2,
            level: 1,
            leveled_up: false,
            awarded: true,
          });
          sessions.delete(second);
          assert.deepEqual(await snapshot(), { xp: 27, events: 1, badges: 1 });
        },
      );

      await t.test(
        "another account completes while the first account holds its XP lock",
        async () => {
          await reset();
          const first = await hold();
          assert.equal((await record("mod-1", uuid(2))).awarded, true);
          assert.deepEqual(await snapshot(uuid(2)), { xp: 27, events: 1, badges: 1 });
          // The second account completed before the first COMMIT was sent.
          await finish(first);
          assert.deepEqual(await snapshot(), { xp: 27, events: 1, badges: 1 });
        },
      );

      await t.test(
        "server statement timeout rolls back a waiting event and a fresh call awards once",
        async () => {
          await reset(true);
          const first = await hold();
          const second = competing(`set statement_timeout='3s';${recordSql("mod-2")}`);
          await blocked();
          const timed = await second.done;
          sessions.delete(second);
          assert.notEqual(timed.code, 0);
          assert.equal(timed.timedOut, false, "Server statement timeout, not process termination");
          assert.match(timed.stderr, /statement timeout/);
          await finish(first);
          assert.deepEqual(await snapshot(), { xp: 27, events: 1, badges: 1 });
          assert.equal((await record("mod-2")).awarded, true);
          assert.equal((await record("mod-2")).awarded, false);
          assert.deepEqual(await snapshot(), { xp: 29, events: 2, badges: 1 });
        },
      );

      await t.test(
        "a discarded committed acknowledgement stays deduplicated in a new session",
        async () => {
          await reset();
          await record();
          assert.equal((await record()).awarded, false);
          assert.deepEqual(await snapshot(), { xp: 27, events: 1, badges: 1 });
        },
      );
    } finally {
      for (const session of sessions) session.child.kill();
      await Promise.allSettled([...sessions].map((session) => session.done));
      if (started)
        await succeed(
          processRun(
            executable("pg_ctl"),
            ["stop", "-D", cluster, "-m", "fast", "-w", "-t", "20"],
            "",
            undefined,
            30000,
          ),
        );
      // Retain only synthetic database/log files for audit. Never delete or stop an existing cluster.
      t.diagnostic(`Fixture artifacts retained at ${directory}; newly created server stopped`);
    }
  },
);
