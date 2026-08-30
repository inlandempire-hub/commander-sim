import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UA = "mtg-commander-sim-report/0.1 (personal project)";
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const OUT = path.join(DATA_DIR, "oracle-cards.jsonl.gz");
const TMP = OUT + ".tmp";

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": UA, ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return get(res.headers.location, headers).then(resolve, reject);
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); res.resume(); return; }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

const index = JSON.parse((await get("https://api.scryfall.com/bulk-data", { Accept: "application/json" })).toString("utf8"));
const oracle = index.data.find((i) => i.type === "oracle_cards");
const url = oracle.jsonl_download_uri || oracle.download_uri;
console.log(`Downloading ${oracle.name} updated ${oracle.updated_at} from ${url}`);
const body = await get(url);
console.log(`Downloaded ${body.length} bytes; gzip magic: ${body[0] === 0x1f && body[1] === 0x8b}`);
fs.writeFileSync(TMP, body);
console.log("Wrote temp:", TMP);
