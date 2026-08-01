import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The engine is consumed via its built dist (like a normal package dependency),
// resolved through the npm workspace symlink + package.json main/types. Run
// `npm run build -w @mtg-commander-sim/engine` after engine changes, then
// reload the client. An earlier version of this config aliased straight to
// engine *source* for dev convenience, but Vite doesn't auto-resolve the
// engine's internal ".js" relative imports to their ".ts" siblings - it
// silently fell back to stale files instead of erroring, which cost a real
// debugging session. Building to dist first is slightly less convenient but
// far more reliable.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
});
