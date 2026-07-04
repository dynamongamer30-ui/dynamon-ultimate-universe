/**
 * Firebase Realtime Database singleton for the admin-panel-d762b project.
 * Re-exports the same app/db as src/lib/dgFirebase.ts so both modules share
 * one initialization.
 */
import { dgDb } from "./dgFirebase";

export const db = dgDb();
export { dgDb };
