"""Downloads Scryfall's current oracle_cards bulk data file (one JSON object
per unique card, gzip-compressed JSONL) into ./data/. Re-run any time you
want a fresh pull - Scryfall regenerates this roughly daily.
"""

import json
import os
import urllib.request

USER_AGENT = "mtg-commander-sim-report/0.1 (personal project)"
BULK_DATA_INDEX_URL = "https://api.scryfall.com/bulk-data"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "oracle-cards.jsonl.gz")


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    index = fetch_json(BULK_DATA_INDEX_URL)
    oracle_entry = next(item for item in index["data"] if item["type"] == "oracle_cards")
    download_url = oracle_entry["jsonl_download_uri"]
    print(f"Downloading {oracle_entry['name']} (updated {oracle_entry['updated_at']}, "
          f"{oracle_entry['compressed_size']:,} bytes compressed)")

    req = urllib.request.Request(download_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req) as resp, open(OUTPUT_PATH, "wb") as out:
        out.write(resp.read())

    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
