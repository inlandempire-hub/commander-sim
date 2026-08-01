import gzip, json, os

HERE = os.path.dirname(__file__)
DATA_PATH = os.path.join(HERE, "data", "oracle-cards.jsonl.gz")

CHOSEN = [
    # green creatures
    "Willow Elf", "Norwood Ranger", "Trained Jackal", "Ankle Biter", "Charging Badger",
    "Balduvian Bears", "Bear Cub", "Cylian Elf", "Forest Bear", "Kalonian Tusker",
    "Swordwise Centaur", "Terrain Elemental", "Jibbirik Omnivore", "Moon Sprite", "Pygmy Razorback",
    "Willow Faerie", "Underdark Basilisk", "Alpine Grizzly", "Centaur Courser", "Colossodon Yearling",
    "Gorilla Warrior", "Harrier Naga", "Murasa Brute", "Nessian Courser", "Spined Karok",
    "Sporecap Spider", "Hitchclaw Recluse", "Mosscoat Goriak", "Wary Okapi", "Woodland Patrol",
    "Leatherback Baloth", "Axebane Beast", "Broodhunter Wurm", "Golden Bear", "Nettle Swine",
    "Wild Elephant", "Order of the Sacred Bell", "Rowan Treefolk", "Rumbling Baloth", "Wild Ceratok",
    "Hornet Sting", "Nourish",
    # white creatures
    "Devoted Hero", "Eager Cadet", "Elite Vanguard", "Expedition Envoy", "Isamaru, Hound of Konda",
    "Kitesail Scout", "Lantern Kami", "Rustwing Falcon", "Savannah Lions", "Staunch Shieldmate",
    "Suntail Hawk", "Tasseled Dromedary", "Valiant Guard", "Volunteer Militia", "Yoked Ox",
    "Ageless Guardian", "Alabaster Host Sanctifier", "Alaborn Grenadier", "Armored Warhorse",
    "Blade of the Sixth Pride", "Cliffhaven Sell-Sword", "Concordia Pegasus", "Dromoka Warrior",
    "Fortified Rampart", "Fresh Volunteers", "Glory Seeker", "Knight Errant", "Knight of New Benalia",
    "Kyoshi Warrior Guard", "Leonin Skyhunter", "Makindi Aeronaut", "Maned Serval", "Mistral Charger",
    "Prowling Caracal", "Royal Falcon", "Silvercoat Lion", "Skyblade of the Legion", "Squire",
    "Steadfast Paladin", "Stormfront Pegasus", "Story Seeker", "Territorial Roc", "Thraben Valiant",
    "Traveling Philosopher", "Chapel Geist", "Dawn Gryff", "Standing Troops", "Wild Griffin",
    "Assault Griffin", "Ardent Militia", "Iron Tusk Elephant", "Venerable Lammasu",
    "Chaplain's Blessing", "Angel's Mercy",
]

found = {}
with gzip.open(DATA_PATH, "rt", encoding="utf-8") as f:
    for line in f:
        card = json.loads(line)
        name = card.get("name", "")
        if name in CHOSEN and name not in found:
            # prefer paper, non-digital-only printing; first match is fine since fields are name-invariant
            found[name] = card

with open(os.path.join(HERE, "chosen_dump.txt"), "w", encoding="utf-8") as out:
    for name in CHOSEN:
        c = found.get(name)
        if not c:
            out.write(f"MISSING: {name}\n")
            continue
        out.write(
            f"{name} | {c.get('mana_cost','')} | {c.get('type_line','')} | "
            f"P/T={c.get('power','')}/{c.get('toughness','')} | kw={c.get('keywords')} | "
            f"text={c.get('oracle_text','')!r}\n"
        )

print("done, missing:", [n for n in CHOSEN if n not in found])
