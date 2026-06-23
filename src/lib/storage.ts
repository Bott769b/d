import "server-only";
import path from "node:path";

// Where encrypted upload blobs live on disk. Locally this defaults to a
// hidden folder in the project; on Railway (or any host with a persistent
// volume) set UPLOAD_DIR to a path on the mounted volume, e.g. /data/uploads,
// so files survive restarts and redeploys.
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), ".uploads");
