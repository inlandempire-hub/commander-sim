"""
One-off helper (not part of the regular report pipeline) to shortlist real,
accurately-sourced mono-green and mono-white vanilla/simple creatures for the
demo decks in packages/engine/src/demoGame.ts. Pulls straight from the cached
Scryfall bulk data so card names/costs/P-T/keywords are authoritative, not
recalled from memory.
"""

import gzip
import json
import os

HERE = os.path.dirname(__file__)
DATA_PATH = os.path.join(HERE, "data", "oracle-cards.jsonl.gz")

SUPPORTED_KEYWORDS = {
    "Flying", "Trample", "Deathtouch", "Lifelink", "Haste", "Vigilance", "Reach", "Defender", "Hexproof",
}

def load_cards():
    with gzip.open(DATA_PATH, "rt", encoding="utf-8") as f:
        for line in f:
            yield json.loads(line)

def is_plain_creature(card, color):
    if card.get("legalities", {}).get("commander") != "legal":
        return False
    if card.get("color_identity") != [color]:
        return False
    if card.get("layout") != "normal":
        return False
    if card.get("digital"):
        return False
    type_line = card.get("type_line", "")
    if "Creature" not in type_line or "Land" in type_line:
        return False
    keywords = card.get("keywords") or []
    if not set(keywords).issubset(SUPPORTED_KEYWORDS):
        return False
    oracle_text = (card.get("oracle_text") or "").strip()
    # Allow blank text, or text that's ONLY the reminder text for its own keywords
    # (heuristic: strip each keyword's own name out and see what's left).
    remainder = oracle_text
    for kw in keywords:
        remainder = remainder.replace(kw, "")
    remainder = remainder.strip(" .\n")
    if remainder:
        return False
    try:
        cmc = float(card.get("cmc", 0))
    except (TypeError, ValueError):
        cmc = 0
    try:
        power = float(card.get("power", "0") or 0)
        toughness = float(card.get("toughness", "0") or 0)
    except ValueError:
        return False
    return {
        "name": card["name"],
        "mana_cost": card.get("mana_cost", ""),
        "cmc": cmc,
        "power": card.get("power"),
        "toughness": card.get("toughness"),
        "keywords": keywords,
        "rarity": card.get("rarity"),
        "set": card.get("set"),
        "released_at": card.get("released_at"),
    }

def is_simple_spell(card, color):
    if card.get("legalities", {}).get("commander") != "legal":
        return False
    if card.get("color_identity") != [color]:
        return False
    if card.get("layout") != "normal":
        return False
    if card.get("digital"):
        return False
    type_line = card.get("type_line", "")
    if not ("Instant" in type_line or "Sorcery" in type_line):
        return False
    text = (card.get("oracle_text") or "").strip().lower()
    if not text:
        return False
    if len(text.split(".")) > 2:
        return False
    return {
        "name": card["name"],
        "mana_cost": card.get("mana_cost", ""),
        "cmc": card.get("cmc", 0),
        "oracle_text": card.get("oracle_text"),
        "type_line": type_line,
        "rarity": card.get("rarity"),
    }

def main():
    green_creatures = {}
    white_creatures = {}
    green_spells = {}
    white_spells = {}

    for card in load_cards():
        for color, bucket in (("G", green_creatures), ("W", white_creatures)):
            result = is_plain_creature(card, color)
            if result and result["name"] not in bucket:
                bucket[result["name"]] = result
        for color, bucket in (("G", green_spells), ("W", white_spells)):
            result = is_simple_spell(card, color)
            if result and result["name"] not in bucket:
                bucket[result["name"]] = result

    for label, bucket in (
        ("GREEN CREATURES", green_creatures),
        ("WHITE CREATURES", white_creatures),
    ):
        print(f"\n=== {label} ({len(bucket)}) ===")
        for c in sorted(bucket.values(), key=lambda c: (c["cmc"], c["name"])):
            kw = f" [{', '.join(c['keywords'])}]" if c["keywords"] else ""
            print(f"{c['mana_cost']:>10}  {c['power']}/{c['toughness']:<3}  {c['name']}{kw}")

    for label, bucket in (
        ("GREEN SPELLS", green_spells),
        ("WHITE SPELLS", white_spells),
    ):
        print(f"\n=== {label} ({len(bucket)}) ===")
        for c in sorted(bucket.values(), key=lambda c: (c["cmc"], c["name"])):
            print(f"{c['mana_cost']:>10}  {c['type_line']:<20} {c['name']:<28} | {c['oracle_text']}")

if __name__ == "__main__":
    main()
