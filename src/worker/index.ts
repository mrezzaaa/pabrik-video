import { config } from "dotenv";

// Next.js loads .env.local for the web app; the standalone worker must do it
// itself. Existing process env (Docker, CI) always wins.
config({ path: ".env.local" });
config();

// Loaded dynamically (not a static import) so dotenv runs first. This entry is
// executed as CommonJS by tsx, where top-level await is not available.
import("./runner")
  .then(({ startWorker }) => startWorker())
  .catch((error) => {
    console.error("[worker] gagal memuat runner:", error);
    process.exit(1);
  });
