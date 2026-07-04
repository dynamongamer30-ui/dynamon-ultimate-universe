/**
 * DG Firebase client.
 *
 * Shared Realtime Database (admin-panel-d762b) used by:
 *   - Cloudflare Workers (Generator + License)
 *   - Android app
 *   - This web admin
 *
 * Node shapes are part of the wire contract — do NOT rename fields or change
 * time units. All key times are UNIX SECONDS.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  off,
  get,
  set,
  update,
  remove,
  query,
  limitToLast,
  type Database,
} from "firebase/database";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

// ---------- Config ----------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let _app: FirebaseApp | null = null;
let _db: Database | null = null;
let _auth: Auth | null = null;

function app(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}
export function dgDb(): Database {
  if (!_db) _db = getDatabase(app());
  return _db;
}
export function dgAuth(): Auth {
  if (!_auth) _auth = getAuth(app());
  return _auth;
}

// ---------- Types (wire contract) ----------

export interface ValidKey {
  key: string;                  // node id, e.g. "DG-AB12CD"
  status: "active" | "revoked";
  expiry: number;               // unix seconds
  durationHours: number;
  activated: boolean;
  device: string | null;
  date: number;                 // unix seconds (created)
  fingerprint: string;
  sourceIP: string;
  source: "web" | string;
}

export interface DgConfig {
  Maintenance: boolean;
  RateLimit: { enabled: boolean };
  KeyDurationHours: number;
  IPWhitelist: string[];
}

export interface GenerationLog {
  id: string;
  key: string;
  ip: string;
  fingerprint: string;
  time: number; // unix seconds
}

export interface AccessToken {
  token: string;
  used: boolean;
  createdAt: number; // ms
}

export interface BannedDevice {
  fingerprint: string;
  reason: string;
  time: number; // unix seconds
}

export interface ActivatedUser {
  fingerprint: string;
  [k: string]: unknown;
}

// ---------- Auth ----------

export function currentAdmin(): User | null {
  return dgAuth().currentUser;
}
export async function signInAdmin(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(dgAuth(), email, password);
  return cred.user;
}
export async function signOutAdmin(): Promise<void> {
  await signOut(dgAuth());
}
export function onAdminAuthChanged(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(dgAuth(), cb);
}

// ---------- ValidKeys ----------

/** Subscribe to ValidKeys. Returns an unsubscribe fn. */
export function listKeys(cb: (keys: ValidKey[]) => void): () => void {
  const r = ref(dgDb(), "ValidKeys");
  const handler = onValue(r, (snap) => {
    const val = (snap.val() || {}) as Record<string, Omit<ValidKey, "key">>;
    const list: ValidKey[] = Object.entries(val).map(([key, v]) => ({
      key,
      status: (v?.status as ValidKey["status"]) ?? "active",
      expiry: Number(v?.expiry ?? 0),
      durationHours: Number(v?.durationHours ?? 0),
      activated: Boolean(v?.activated),
      device: (v?.device as string | null) ?? null,
      date: Number(v?.date ?? 0),
      fingerprint: String(v?.fingerprint ?? ""),
      sourceIP: String(v?.sourceIP ?? ""),
      source: (v?.source as string) ?? "web",
    }));
    cb(list);
  });
  return () => off(r, "value", handler);
}

export async function revokeKey(key: string): Promise<void> {
  await update(ref(dgDb(), `ValidKeys/${key}`), { status: "revoked" });
}
export async function unrevokeKey(key: string): Promise<void> {
  await update(ref(dgDb(), `ValidKeys/${key}`), { status: "active" });
}
export async function deleteKey(key: string): Promise<void> {
  await remove(ref(dgDb(), `ValidKeys/${key}`));
}

/** Add `hours` to expiry (unix seconds) and durationHours. */
export async function extendKey(key: string, hours: number): Promise<void> {
  const node = ref(dgDb(), `ValidKeys/${key}`);
  const snap = await get(node);
  const cur = (snap.val() || {}) as Partial<ValidKey>;
  const nowSec = Math.floor(Date.now() / 1000);
  const baseExpiry = Number(cur.expiry ?? 0) > nowSec ? Number(cur.expiry) : nowSec;
  const newExpiry = baseExpiry + Math.floor(hours * 3600);
  const newDuration = Number(cur.durationHours ?? 0) + hours;
  await update(node, { expiry: newExpiry, durationHours: newDuration });
}

// ---------- Config ----------

export async function getConfig(): Promise<DgConfig> {
  const snap = await get(ref(dgDb(), "Config"));
  const v = (snap.val() || {}) as Partial<DgConfig>;
  return {
    Maintenance: Boolean(v.Maintenance ?? false),
    RateLimit: { enabled: Boolean(v.RateLimit?.enabled ?? false) },
    KeyDurationHours: Number(v.KeyDurationHours ?? 24),
    IPWhitelist: Array.isArray(v.IPWhitelist) ? (v.IPWhitelist as string[]) : [],
  };
}
export async function setMaintenance(on: boolean): Promise<void> {
  await set(ref(dgDb(), "Config/Maintenance"), on);
}
export async function setRateLimitEnabled(on: boolean): Promise<void> {
  await set(ref(dgDb(), "Config/RateLimit"), { enabled: on });
}
export async function setKeyDurationHours(n: number): Promise<void> {
  await set(ref(dgDb(), "Config/KeyDurationHours"), Math.max(1, Math.floor(n)));
}
export async function setIPWhitelist(ips: string[]): Promise<void> {
  await set(ref(dgDb(), "Config/IPWhitelist"), ips);
}

// ---------- Logs / read-only nodes ----------

export async function listGenerationLogs(n = 200): Promise<GenerationLog[]> {
  const q = query(ref(dgDb(), "GenerationLogs"), limitToLast(n));
  const snap = await get(q);
  const val = (snap.val() || {}) as Record<string, Omit<GenerationLog, "id">>;
  return Object.entries(val)
    .map(([id, v]) => ({
      id,
      key: String(v?.key ?? ""),
      ip: String(v?.ip ?? ""),
      fingerprint: String(v?.fingerprint ?? ""),
      time: Number(v?.time ?? 0),
    }))
    .sort((a, b) => b.time - a.time);
}

export async function listAccessTokens(): Promise<AccessToken[]> {
  const snap = await get(ref(dgDb(), "AccessTokens"));
  const val = (snap.val() || {}) as Record<string, Omit<AccessToken, "token">>;
  return Object.entries(val).map(([token, v]) => ({
    token,
    used: Boolean(v?.used),
    createdAt: Number(v?.createdAt ?? 0),
  }));
}

export async function listBannedDevices(): Promise<BannedDevice[]> {
  const snap = await get(ref(dgDb(), "BannedDevices"));
  const val = (snap.val() || {}) as Record<string, { reason?: string; time?: number }>;
  return Object.entries(val).map(([fingerprint, v]) => ({
    fingerprint,
    reason: String(v?.reason ?? ""),
    time: Number(v?.time ?? 0),
  }));
}

export async function listActivatedUsers(): Promise<ActivatedUser[]> {
  const snap = await get(ref(dgDb(), "ActivatedUsers"));
  const val = (snap.val() || {}) as Record<string, Record<string, unknown>>;
  return Object.entries(val).map(([fingerprint, v]) => ({ fingerprint, ...v }));
}

// ---------- Misc helpers ----------

export const nowSeconds = () => Math.floor(Date.now() / 1000);
