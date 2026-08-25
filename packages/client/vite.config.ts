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
  // Relative asset paths, so the production build works served from a subpath
  // like GitHub Pages' https://<org>.github.io/commander-sim/ as well as from
  // the root in dev.
  base: "./",
  // Bind IPv4 explicitly. Left to itself Vite listened on [::1] (IPv6 localhost)
  // only, and a browser resolving "localhost" to 127.0.0.1 (IPv4) then failed to
  // connect - "Safari can't connect to the server". 127.0.0.1 makes the address
  // the browser actually tries the one the server is on.
  server: { port: 5180, host: "127.0.0.1" },
});
