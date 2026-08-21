"""Which cards say something on the real card that the sim does not do?

    node -e "import('./packages/engine/dist/cards/testCards.js').then(m=>console.log(JSON.stringify(m.TEST_CARD_DEFINITIONS)))" > fixtures.json
    py -X utf8 tools/scryfall-report/audit_text.py fixtures.json
    py -X utf8 tools/scryfall-report/audit_text.py fixtures.json --deck mydeck.txt

The third audit, and the only one that reads the *rules text*.

  audit_fixtures.py  printed data - cost, power/toughness, type line, keywords
  audit_triggers.py  trigger events - is this the trigger the card actually has
  audit_text.py      everything else the oracle text says

It takes each fixture's Oracle text, strips reminder text and every sentence the
engine demonstrably models, and reports what is left. A leftover sentence is a
card that looks right on the table and does less than it says.

**This is a heuristic, and its failure mode is the dangerous direction.** A
sentence it does not recognise is reported, which is safe. A sentence it
recognises by accident is silently dropped - so a rule here that is too loose
hides exactly the bug the tool exists to find. Keep the patterns specific, and
tie each one to the effect kind that actually implements it rather than to a
word that happens to appear nearby.

It also goes stale in one direction: every new effect kind in the engine is a
sentence this cannot account for until it is taught, which shows up as a pile of
false positives on cards that are perfectly correct. That is the safe direction
too, but it makes the report useless if left long enough. Effect kind names and
card fields below are taken from packages/engine/src/types.ts, not guessed.
"""

import gzip
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE / "data" / "oracle-cards.jsonl.gz"

KEYWORDS = {
    "flying", "trample", "first strike", "double strike", "deathtouch",
    "lifelink", "haste", "vigilance", "menace", "reach", "defender",
    "hexproof", "indestructible", "ward", "flash",
}

SECTION = re.compile(r"^(commander|deck|sideboard|maybeboard|companion)\s*:?\s*$", re.I)
ENTRY = re.compile(r"^(\d+)\s*x?\s+(.+?)\s*(?:\((?:[^)]*)\)\s*[\w-]*)?\s*$")


def effect_kinds(fx):
    """Every `kind` anywhere in this fixture's effects, however deeply nested."""
    found = set()

    def walk(node):
        if isinstance(node, dict):
            k = node.get("kind")
            if isinstance(k, str):
                found.add(k)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    #  is in this list because a planeswalker keeps its
    # effects there rather than in  - without it every
    # sentence inside Grist's three abilities read as unimplemented.
    for field in ("castEffect", "activatedAbilities", "triggeredAbilities", "loyaltyAbilities"):
        walk(fx.get(field))
    return found


def static_buffs(fx):
    """Every continuous effect on a fixture, however the field was written."""
    buff = fx.get("staticBuff")
    if not buff:
        return []
    return buff if isinstance(buff, list) else [buff]


def copy_features(fx):
    """
    The parts of a copy or control effect that are fields on it rather than kinds.

    `createCopyToken` covers "create a token that's a copy"; it does not say
    whether the copy is modified or when it goes away, and both of those are
    separate printed sentences. Same for `gainControl` and its "Untap that
    permanent."
    """
    feat = set()

    def walk(node):
        if isinstance(node, dict):
            if node.get("kind") == "createCopyToken":
                if node.get("grants"):
                    feat.add("copyGrants")
                if node.get("delayedEnd"):
                    feat.add("delayedEnd")
            if node.get("kind") == "gainControl":
                if node.get("untap"):
                    feat.add("gainControlUntap")
                if node.get("grants"):
                    feat.add("grantsKeywords")
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    for field in ("castEffect", "activatedAbilities", "triggeredAbilities", "loyaltyAbilities"):
        walk(fx.get(field))
    return feat


def card_features(fx):
    """
    Fixture fields that are not effects but do implement rules text.

    Kept separate from `effect_kinds` because these are properties of the card
    rather than things it does - and every one of them is a sentence on the
    printed card that would otherwise be reported as missing.
    """
    feat = set()
    # A card may carry several continuous effects - Greymond prints two - so the
    # field takes either a buff or a list of them.
    for buff in static_buffs(fx):
        feat.add("staticBuff")
        if buff.get("grants"):
            feat.add("grantsKeywords")
        if buff.get("grantsChosenOnEntry"):
            feat.add("grantsChosenOnEntry")
        if buff.get("grantsWardLife"):
            feat.add("grantsWard")
        if buff.get("condition"):
            feat.add("conditionalBuff")
    # "This artifact doesn't untap during your untap step." - Mana Vault. A
    # property of the card rather than something it does, like `entersTapped`.
    if fx.get("doesNotUntap"):
        feat.add("doesNotUntap")
    # "Other Goblin creatures you control attack each combat if able." - Goblin
    # Rabblemaster. A static on the board, so it lives in `staticRules`.
    if (fx.get("staticRules") or {}).get("othersOfSubtypeMustAttack"):
        feat.add("othersMustAttack")
    # "Toxic 1" and "Skrelv can't block" - printed properties of the card, like
    # `entersTapped`, rather than anything it does.
    # Mox Diamond's replacement on the way in.
    if fx.get("entersOnlyIfYouDiscard"):
        feat.add("entersOnlyIfYouDiscard")
    # Gemstone Caverns and Quicksilver, which start the game in play.
    # `is not None`, not truthiness: Quicksilver's is an empty object - he has
    # none of the riders Gemstone Caverns has - and an empty dict is falsy.
    # A Room, and the layer 7b effect on its other half.
    if fx.get("isRoom"):
        feat.add("isRoom")
    if fx.get("setsBasePowerToughness") is not None:
        feat.add("setsBasePowerToughness")
    if fx.get("beginsOnBattlefield") is not None:
        feat.add("beginsOnBattlefield")
    if fx.get("toxic"):
        feat.add("toxic")
    if fx.get("cantBlock"):
        feat.add("cantBlock")
    if fx.get("cantBeCountered"):
        feat.add("cantBeCountered")
    if fx.get("becomesChosenBasicType"):
        feat.add("becomesChosenBasicType")
    # Ascend is a static ability rather than something the card does, so it lives
    # here with the other properties - the reminder text is stripped separately,
    # which leaves the bare keyword to be accounted for.
    if fx.get("ascend"):
        feat.add("ascend")
    # The printed half of the evasion family - Signal Pest. The granted half is an
    # effect kind and is picked up by `effect_kinds` on its own.
    if fx.get("blockRestriction"):
        feat.add("blockRestriction")
    # Dash is a cost with two riders rather than an effect, so it is a property
    # of the card like bestow and suspend beside it.
    if fx.get("dashCost"):
        feat.add("dashCost")
    # "Enters with a +1/+1 counter for each ..." - a replacement on the way in
    # rather than an effect, so it is a property of the card like dash above it.
    if fx.get("entersWithCounters") is not None:
        feat.add("entersWithCounters")
    # Abilities activated from hand, and the discount two of them carry. Read off
    # the abilities rather than the card, because both live on one ability of a
    # card whose other abilities are ordinary.
    for ability in fx.get("activatedAbilities") or []:
        from_hand = (ability.get("cost") or {}).get("fromHand")
        if from_hand:
            feat.add("fromHand:%s" % from_hand)
        if ability.get("costReducedPer"):
            feat.add("costReducedPer:%s" % ability["costReducedPer"])
    # Each static rule contributes its own name, so a card printing two of them
    # accounts for both sentences rather than one covering the other.
    for rule, value in (fx.get("staticRules") or {}).items():
        if value:
            feat.add("rule:%s" % rule)
    # "As this permanent enters, choose ..." - the decision, kept apart from
    # whatever reads it back, because a card can print one without the other.
    if fx.get("enterChoice"):
        feat.add("enterChoice")
    # The hate pieces. Each restriction contributes its own kind, so a card with
    # two of them - Grand Abolisher stops casting *and* activating - accounts
    # for both halves of its one printed sentence.
    for restriction in fx.get("staticRestrictions") or []:
        feat.add("restriction:%s" % restriction.get("kind"))
    if fx.get("entersTapped"):
        feat.add("entersTapped")
    if fx.get("entersTappedUnless"):
        feat.add("entersTappedUnless")
    if fx.get("entersTappedUnlessPayLife") is not None:
        feat.add("entersTappedUnlessPayLife")
    for replacement in fx.get("replacementEffects") or []:
        feat.add("replacementEffects")
        # Each kind accounts for its own sentence: a card with two replacements
        # prints two, and one covering the other is how a rule goes too loose.
        feat.add(replacement.get("kind"))
    if fx.get("wardCost"):
        feat.add("ward")
    # Ward's cost is not always mana - Sedgemoor Witch asks for life.
    if fx.get("wardLifeCost") is not None:
        feat.add("ward")
    if fx.get("additionalCost"):
        feat.add("additionalCost")
        if fx["additionalCost"].get("kind") == "pay-life":
            feat.add("additionalCostLife")
        if fx["additionalCost"].get("kind") == "sacrifice-creature":
            feat.add("additionalCostSacrifice")
    if fx.get("alternativeCost"):
        feat.add("alternativeCost")
    rules = fx.get("staticRules") or {}
    if rules.get("extraLandDrops"):
        feat.add("extraLandDrops")
    if rules.get("playLandsFromGraveyard"):
        feat.add("playLandsFromGraveyard")
    if rules.get("skipDrawStep"):
        feat.add("skipDrawStep")
    if rules.get("maxHandSize") is not None:
        feat.add("maxHandSize")
    if fx.get("loyalty") is not None:
        feat.add("loyalty")
    if fx.get("devour") is not None:
        feat.add("devour")
    if fx.get("suspend"):
        feat.add("suspend")
    if fx.get("bestowCost"):
        feat.add("bestow")
    if fx.get("alsoCreatureOffBattlefield"):
        feat.add("alsoCreatureOffBattlefield")
    for buff in static_buffs(fx):
        if buff.get("grantsAbilities"):
            feat.add("grantsAbilities")
    for ability in fx.get("activatedAbilities") or []:
        if ability.get("addsOtherCounterToSelf"):
            feat.add("addsOtherCounter")
        if ability.get("sorcerySpeedOnly"):
            feat.add("sorcerySpeedOnly")
    if fx.get("equipCost"):
        feat.add("equipCost")
    for ability in fx.get("activatedAbilities") or []:
        cost = ability.get("cost") or {}
        if cost.get("payLife"):
            feat.add("payLife")
        if cost.get("sacrificeSelf"):
            feat.add("sacrificeSelf")
        if ability.get("activateOnlyIf"):
            feat.add("activateOnlyIf")
        # Path of Ancestry's "when that mana is spent ..., scry 1" - a rider on
        # the mana rather than a triggered ability, so it is a feature of the
        # ability that made it.
        if ability.get("marksMana"):
            feat.add("manaSpendRider")
        if ability.get("damageToController"):
            feat.add("damageToController")
        if ability.get("anyColour") or ability.get("anyColor"):
            feat.add("anyColour")
        # Delighted Halfling's restriction rides on the mana it makes, not on
        # the cost of making it - and the same field carries the "that spell
        # can't be countered" half.
        restricted = ability.get("producesRestrictedMana")
        if restricted:
            feat.add("spendRestriction")
            if restricted.get("grantsUncounterable"):
                feat.add("cantBeCountered")
    # An "any colour" ability is also written as one ability per colour, which
    # is what most of the pool does - five addMana abilities on one permanent.
    mana_colors = {
        (a.get("effect") or {}).get("color")
        for a in fx.get("activatedAbilities") or []
        if (a.get("effect") or {}).get("kind") == "addMana"
    }
    if len({c for c in mana_colors if c in {"W", "U", "B", "R", "G"}}) >= 5:
        feat.add("anyColour")
    """
    `grants` is looked for *anywhere* in the effect tree rather than at the three
    places it used to be checked.

    It can sit on a cast effect, on a mode, on a trigger's effect, or - as of
    Inspiring Call and Revitalizing Repast - on a step inside a sequence. Each
    hand-written check kept missing the next shape, and every miss reported a
    correct card as incomplete.
    """

    def walk(node):
        if isinstance(node, dict):
            if node.get("grants") or node.get("appliesTo"):
                feat.add("grantsKeywords")
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    for field in ("castEffect", "activatedAbilities", "triggeredAbilities"):
        walk(fx.get(field))
    return feat


def trigger_events(fx):
    return {t.get("event") for t in fx.get("triggeredAbilities") or []}


def strip_reminders(text):
    """Reminder text restates a keyword and never adds rules. Spans lines."""
    return re.sub(r"\([^)]*\)", "", text, flags=re.S)


# Each entry is (pattern, the set of things any one of which implements it).
# Deliberately specific: a loose pattern silently swallows the sentence it was
# meant to catch, which is the one failure mode that matters here.
RULES = [
    # Mana, in all the shapes the engine writes it.
    (r"^\{t\}: add (\{[wubrgc]\})+$", {"addMana", "addManaCombination"}),
    (r"^\{t\}: add \{[wubrgc]\} or \{[wubrgc]\}$", {"addMana", "addManaCombination"}),
    # The tri-lands and the Obelisks: "{T}: Add {W}, {U}, or {B}." Three
    # abilities on the fixture, one per colour, exactly as a dual writes two.
    # Added 2026-08-21 with the bulk pool - sixteen cards arrived printing this
    # and every one of them reported as text nothing accounted for, which is
    # this audit missing a wording rather than the fixtures missing a clause.
    (r"^\{t\}: add (\{[wubrgc]\}, )+or \{[wubrgc]\}$", {"addMana", "addManaCombination"}),
    # Sunbaked Canyon. The horizon lands charge life for their coloured mana,
    # which is `ActivatedAbilityCost.payLife` on an otherwise ordinary mana
    # ability - the existing patterns all assume the cost is nothing but a tap.
    (r"^\{t\}, pay \d+ life: add ", {"payLife"}),
    # A filter land prints every output it offers as one sentence: "Add {B}{B},
    # {B}{G}, or {G}{G}." Each option is a separate ability on the fixture.
    (r"^\{[wubrg]/[wubrg]\}, \{t\}: add .*\{[wubrgc]\}", {"addManaCombination"}),
    (r"^add (\{[wubrgc]\})+$", {"addMana", "addManaCombination"}),
    (r"\badd one mana of any color\b", {"anyColour"}),
    # The hate pieces - see restrictions.ts. Written against the printed
    # sentences rather than against the fixture, so a card whose wording differs
    # from the one modelled still reports.
    (r"each player can't cast more than \w+ (noncreature |nonartifact )?spell",
     {"restriction:cast-limit"}),
    (r"can't cast additional (nonartifact|noncreature) spells",
     {"restriction:cast-limit"}),
    (r"your opponents can't cast spells from anywhere other than their hands",
     {"restriction:opponents-cast-from-hand-only"}),
    (r"your opponents can't cast (noncreature )?spells",
     {"restriction:opponents-cannot-cast", "restrictThisTurn"}),
    (r"can't activate abilities of|activated abilities of .* can't be activated",
     {"restriction:cannot-activate"}),
    (r"each player can't draw more than \w+ card",
     {"restriction:draw-limit"}),
    # "As **this creature** enters" is the current templating; a legendary
    # says its own name instead - "As **Greymond, Avacyn's Stalwart** enters,
    # choose two abilities". Both are the same clause.
    (r"^as .*\benters, choose", {"enterChoice"}),
    (r"with mana value equal to the chosen number can't be cast",
     {"restriction:cannot-cast-chosen-mana-value"}),
    # Winota's three sentences. One effect covers all of them, which is why
    # they name the same feature: looking, choosing, and burying the rest are a
    # single printed ability and a single `deployFromTop`.
    (r"look at the top \w+ cards of your library", {"deployFromTop"}),
    (r"put a .*card from among them onto the battlefield", {"deployFromTop"}),
    (r"put the rest of the cards on the bottom of your library", {"deployFromTop"}),
    (r"\bspend this mana only\b", {"spendRestriction"}),
    (r"\bthis (land|creature|artifact) deals \d+ damage to you\b", {"damageToController"}),
    (r"\bactivate only if\b", {"activateOnlyIf"}),
    # Arrival.
    (r"\benters tapped unless\b", {"entersTappedUnless"}),
    (r"\bas this land enters, you may pay \d+ life\b", {"entersTappedUnlessPayLife"}),
    (r"\bif you don't, it enters tapped\b", {"entersTappedUnlessPayLife"}),
    # Multiversal Passage splits the shockland clause across two sentences -
    # "choose a basic land type. **Then you may pay 2 life.** If you don't, it
    # enters tapped." - so the offer has to stand on its own.
    (r"^then you may pay \d+ life$", {"entersTappedUnlessPayLife"}),
    (r"^this (land|artifact|creature|permanent|enchantment) enters tapped$", {"entersTapped"}),
    # Effects.
    (r"\bprevent the next \d+ damage\b", {"preventDamage"}),
    (r"\bprevent all combat damage\b", {"preventCombatDamage"}),
    (r"\bexile target player's graveyard\b", {"exileGraveyard"}),
    (r"\bif a \w+ card is exiled this way\b", {"ifTargetWas"}),
    (r"^equip \{", {"equipCost"}),
    (r"\bequipped creature gets\b", {"staticBuff"}),
    (r"\bthose creatures gain\b", {"grantsKeywords"}),
    (r"\bdeals \d+ damage\b", {"damage"}),
    (r"\bgains? \d+ life\b", {"gainLife"}),
    (r"\bloses? \d+ life\b", {"loseLife"}),
    (r"\bdiscards? a card\b", {"discard"}),
    (r"\bsurveil \d+\b", {"surveil"}),
    (r"\bmills? \w+ cards?\b", {"mill", "millThenMayTake"}),
    # "draw a card", "draw three cards", and "draw cards equal to ..." - the
    # last has no quantity word at all, which the first two forms required, so
    # Return of the Wildspeaker read as unimplemented.
    (r"\bdraw (a card|cards|\w+ cards)\b", {"draw"}),
    (r"\bdestroy (target|all|each)\b", {"destroy", "pumpAll"}),
    (r"\bexile target\b", {"exile"}),
    (r"\bcounter target\b", {"counter"}),
    (r"\bregenerate\b", {"regenerate", "regenerateAll"}),
    (r"\bsacrifice (it|this)\b", {"sacrifice", "sacrificeSelf"}),
    # "-X/-X" as well as "-2/-2" - The Meathook Massacre is the one card in the
    # pool that prints a letter here, and a digits-only pattern missed it.
    (r"[+-](\d+|x)/[+-](\d+|x)", {"pump", "pumpAll", "staticBuff"}),
    # Batch 4. Every one of these is a sentence the engine now genuinely does,
    # and each names the effect kind that does it rather than a family - a rule
    # too loose here hides the bug this tool exists to find.
    (r"\battacking creatures you control have\b", {"grantsKeywords"}),
    # Batch 5. The leftovers from batches 2 and 3, and five tutors.
    (r"\bhave each of the chosen abilities\b", {"grantsChosenOnEntry"}),
    # Windcrag Siege's Mardu half, and the keywords its Jeskai Goblin gains.
    (r"\bthat ability triggers an additional time\b", {"rule:doublesAttackTriggersWhenMode"}),
    (r"^it gains .* until end of turn$", {"grantsKeywords"}),
    (r"\bas long as you control \w+ or more \w+, .* get \+", {"conditionalBuff"}),
    (r"\bother creatures you control have .ward", {"grantsWard"}),
    (r"\bspells you control can't be countered\b", {"rule:yourSpellsCantBeCountered"}),
    (r"\bnonbasic lands your opponents control enter tapped\b",
     {"rule:opponentsNonbasicLandsEnterTapped"}),
    (r"\bthat player searches the top \w+ cards of that library instead\b",
     {"rule:opponentSearchesTopCards"}),
    (r"\bthis land is the chosen type\b", {"becomesChosenBasicType"}),
    (r"\bspend this mana only to cast a creature spell of the chosen type\b", {"spendRestriction"}),
    (r"\byou may exert (it|this creature) as it attacks\b", {"exertSelf"}),
    (r"\buntap all other creatures you control\b", {"untapAll"}),
    (r"\bthere is an additional combat phase\b", {"additionalCombatPhase"}),
    (r"\buntap (one or two|up to \w+|)\s*target\b", {"untap"}),
    (r"\bgains? (hexproof|indestructible|trample|menace|deathtouch|flying)\b", {"grantsKeywords"}),
    (r"\bhas? (hexproof|indestructible|trample|menace|deathtouch|flying)\b", {"grantsKeywords"}),
    (r"\+1/\+1 counters?\b", {"addCounter", "addCounterToEachOther"}),
    (r"\bcreates? .*token\b|\bcreate \w+ .*creature token", {"createToken"}),
    (r"\bfrom your graveyard\b", {"returnFromGraveyard"}),
    (r"\bsearch (your|their) library\b", {"searchLibrary"}),
    (r"\bcan't be countered\b", {"cantBeCountered", "spendRestriction"}),
    (r"\bdouble .*power\b", {"doublePower"}),
    (r"\bfrom exile\b", {"returnFromExile"}),
    (r"\bchoose one\b", {"modal"}),
    (r"\bif an effect would\b", {"replacementEffects"}),
    (r"\bif one or more counters would be put on\b", {"replacementEffects"}),
    (r"^ward\b", {"ward"}),
    # Costs that are not mana. Tied to the specific `additionalCost` kind
    # rather than to the words "additional cost", because the two halves are
    # paid in completely different ways and a card written with the wrong one
    # is exactly what this should catch.
    (r"^as an additional cost to cast this spell, pay x? ?\d* ?life", {"additionalCostLife"}),
    (r"^as an additional cost to cast this spell, sacrifice a creature", {"additionalCostSacrifice"}),
    (r"you may cast this spell without paying its mana cost", {"alternativeCost"}),
    # Rules the card changes about the turn itself - Icetill Explorer.
    (r"you may play an additional land", {"extraLandDrops"}),
    (r"you may play lands from your graveyard", {"playLandsFromGraveyard"}),
    # Path of Ancestry's rider.
    (r"^when that mana is spent", {"manaSpendRider"}),
    # A sacrifice the player chooses while the ability resolves, which is a
    # different thing from `sacrifice: self` and from the cost above.
    (r"\byou may sacrifice (another|a) creature\b", {"sacrificeChosen"}),
    # The Ozolith, both halves.
    (r"\bleaves the battlefield\b", {"addCounter"}),
    (r"\bmove all counters\b", {"moveAllCounters"}),
    (r"\bscry \d+\b", {"scry", "manaSpendRider"}),
    # The 2026-08-13 sweep.
    (r"^devour \d+", {"devour"}),
    (r"^suspend \d+", {"suspend"}),
    (r"^bestow ", {"bestow"}),
    (r"^skip your draw step", {"skipDrawStep"}),
    (r"your maximum hand size is", {"maxHandSize"}),
    (r"you may pay any amount of life", {"payLifeDrawThatMany"}),
    (r"\bput a nest counter\b", {"addsOtherCounter"}),
    (r"^activate only as a sorcery", {"sorcerySpeedOnly"}),
    (r"\bcreature tokens you control have\b", {"grantsAbilities"}),
    (r"\bit's a \d+/\d+ \w+ creature in addition\b", {"alsoCreatureOffBattlefield"}),
    (r"\bthen you may pay\b", {"millThenMayTake"}),
    (r"\bput a card from among those cards into your hand\b", {"millThenMayTake"}),
    (r"\bwithout paying its mana cost\b", {"alternativeCost", "castFreeFromHand", "suspend"}),
    (r"\btoken that's a copy\b", {"createCopyToken"}),
    # Batch 5: copying and borrowing.
    #
    # "create X tokens that are copies of ..." is the plural half of the rule
    # above, which only matched the singular - Rionya's whole first sentence read
    # as unimplemented.
    (r"\btokens that are copies of\b", {"createCopyToken"}),
    # The scheduled ending. Tied to `delayedEnd` rather than to the copy effect,
    # because a card can print one without the other and this is the clause that
    # makes the copy temporary.
    (r"\b(sacrifice|exile) (it|them) at the beginning of the next end step\b",
     {"delayedEnd", "delayedRemoval"}),
    # "except it has haste" / "They gain haste" - the copy modification.
    (r"^they gain \w+( and \w+)*\.?$", {"copyGrants", "grantsKeywords"}),
    (r"\bexcept it has haste\b", {"copyGrants"}),
    (r"\bfor each token you control that entered this turn\b",
     {"copyTokensThatEnteredThisTurn"}),
    (r"^ascend$", {"ascend"}),
    (r"\bgain control of target permanent until end of turn\b", {"gainControl"}),
    # "Untap that permanent." - the second of Zealous Conscripts' three
    # sentences, folded into the one effect that holds the target.
    (r"^untap that permanent\.?$", {"gainControlUntap"}),
    (r"\beach player gains control of all creatures they own\b", {"returnControlToOwners"}),
    # Protection, the plan's batch 6. Tied to the effect kind that grants it
    # rather than to the word "protection", so a card that merely mentions
    # protection is still reported rather than waved through.
    (r"\bgains protection from (colorless or from )?the color of your choice\b", {"grantProtection"}),
    # The evasion family, the rest of the plan's batch 6. Tied to the field and
    # the effect kind that implement each half rather than to the words "can't be
    # blocked", so Skrelv's colour version is still reported as missing.
    (r"can't be blocked except by creatures with flying or reach", {"blockRestriction"}),
    (r"can't be blocked this turn except by creatures with haste", {"restrictBlockersThisTurn"}),
    (r"^battle cry$", {"pumpAll"}),
    # Batch 7's mana base. Each tied to the field or effect kind that implements
    # it, never to a word that merely appears nearby.
    (r"whenever this land becomes tapped, it deals \d+ damage to you", {"damageController"}),
    (r"when you play another land, sacrifice this land", {"sacrifice"}),
    (r"this land becomes a \d+/\d+ .*creature.*until end of turn", {"animateSelf"}),
    (r"^it's still a land$", {"animateSelf"}),
    (r"enters tapped unless it's your (first|second|third)", {"within-your-first-turns"}),
    # Abilities activated from hand - Simian Spirit Guide and the Channel lands.
    (r"^exile this card from your hand: add \{.\}$", {"fromHand:exile"}),
    (r"this ability costs \{1\} less to activate for each legendary creature you control",
     {"costReducedPer:legendary-creature-you-control"}),
    # "They gain haste until end of turn" - a grant on the tokens the same ability
    # just made, which is `grants` on createToken rather than an effect of its own.
    (r"^they gain haste until end of turn$", {"createToken"}),
    # "That token gains haste until end of turn" - the singular twin, on Loyal
    # Apprentice; and Legion Warboss, which adds the requirement in the same
    # sentence. Tied to `createToken` because both riders live on that effect.
    (r"^that token gains haste until end of turn$", {"createToken"}),
    (r"^that token gains haste until end of turn and attacks this combat if able$",
     {"createToken"}),
    # Mentor and mobilize are keywords whose whole text is reminder text, so what
    # is left on the line is the bare keyword. Tied to the trigger event each of
    # them actually is, so a fixture that prints the keyword and models nothing
    # is still reported.
    # "They may tap that permanent" - Charismatic Conqueror, whose "if they
    # don't" half is a second sentence the ordinary token rule already covers.
    (r"they may tap that permanent", {"theyMay"}),
    # Boromir. The counter clause is one sentence including its condition,
    # which the fixture answers as a watchFor narrowing rather than an
    # intervening-if - a spell's cost cannot change once it is cast.
    (r"^whenever an opponent casts a spell, if no mana was spent to cast it, counter that spell$",
     {"counter"}),
    (r"^the ring tempts you$", {"theRingTemptsYou"}),
    # Rooms. The reminder text is one line and is the same on both halves.
    (r"^\(you may cast either half\.", {"isRoom"}),
    (r"creatures you control have base power and toughness each equal to",
     {"setsBasePowerToughness"}),
    # Ajani. The transform is one clause of the death trigger, and the reflexive
    # "when you do" is the second half of the 0 - written as a sequence, which is
    # the documented simplification this engine has taken since Riveteers Overlook.
    (r"you may exile .*, then return (him|her|it) to the battlefield transformed",
     {"exileAndReturnTransformed"}),
    (r"^when you do, if you control a red permanent other than \w+, (he|she|it) deals damage equal to the number of creatures you control to any target$",
     {"damage"}),
    (r"each opponent chooses an artifact, a creature, an enchantment, and a planeswalker",
     {"eachOpponentKeepsOnePerType"}),
    # Gemstone Caverns and Quicksilver - the offer, and the price Caverns pays
    # for taking it.
    (r"you may begin the game with .* on the battlefield", {"beginsOnBattlefield"}),
    (r"^if you do, exile a card from your hand$", {"beginsOnBattlefield"}),
    # Quicksilver's power-up. The ability word is stripped like every other, so
    # what is matched is the ability itself.
    (r"put a \+1/\+1 counter and a double strike counter on", {"addKeywordCounter"}),
    # Shatterskull Smashing - one sentence and its kicker, both about the same
    # announced division.
    (r"deals x damage divided as you choose among", {"damage"}),
    (r"^if x is \d+ or more, .* deals twice x damage divided as you choose among them instead$",
     {"damage"}),
    # Mox Diamond - three sentences of one replacement, and the third is the
    # half that makes the card a gamble rather than a free Mox.
    (r"^if this \w+ would enter, you may discard a \w+ card instead$", {"entersOnlyIfYouDiscard"}),
    (r"^if you do, put this \w+ onto the battlefield$", {"entersOnlyIfYouDiscard"}),
    (r"^if you don't, put it into its owner's graveyard$", {"entersOnlyIfYouDiscard"}),
    # Deflecting Swat. Its free-cast line is already covered by the alternative
    # cost rule; this is the half that does something.
    (r"^you may choose new targets for target spell or ability$", {"changeTargets"}),
    # Skrelv. Its ability is one sentence per clause on the printed card, and all
    # of them are keyed to the colour `grantProtection` asks for.
    (r"^toxic \d+$", {"toxic"}),
    (r"can't block$", {"cantBlock"}),
    (r"^\{./p\}, \{t\}: choose a color$", {"grantProtection"}),
    (r"gains toxic \d+ and hexproof from that color until end of turn", {"grantProtection"}),
    (r"^it can't be blocked by creatures of that color this turn$", {"grantProtection"}),
    # Imprint - Chrome Mox. The ability word is part of the printed line, and the
    # mana ability underneath it is the *only* thing the imprinted card is for.
    (r"^imprint [-—] when this artifact enters, you may exile a .* card from your hand$",
     {"imprintFromHand"}),
    (r"^\{t\}: add one mana of any of the exiled card's colors$", {"imprintFromHand"}),
    (r"^mentor$", {"trigger:attacks"}),
    (r"^mobilize \d+$", {"trigger:attacks"}),
    # Goblin Rabblemaster's static, and Mana Vault's three clauses.
    (r"^other \w+ creatures you control attack each combat if able$", {"othersMustAttack"}),
    (r"^this (artifact|creature|permanent|enchantment|land) doesn't untap during your untap step$",
     {"doesNotUntap"}),
    (r"^if you do, untap this (artifact|creature|permanent|enchantment|land)$", {"mayPay"}),
    (r"^at the beginning of your draw step, if this artifact is tapped, it deals \d+ damage to you$",
     {"trigger:draw-step"}),
    # Batch 8 - the singles.
    (r"^its controller gains life equal to its power$", {"target-power"}),
    (r"^add \{r\}\{r\}, then add \{r\} for each card named .+ in each graveyard$",
     {"addManaVariable"}),
    (r"if a source you control would deal damage to a permanent or player, it deals double that damage",
     {"double-damage-you-deal"}),
    # The two Pirates. Each sentence is tied to the effect or field that carries
    # it, so a card that exiles without granting permission is still reported.
    (r"^sacrifice a treasure: exile the top card of your library\.?$", {"exileTopAndMayPlay"}),
    (r"^you may play that card this turn\.?$", {"exileTopAndMayPlay"}),
    (r"^until end of turn, you may cast that card\.?$", {"exileTopAndMayPlay"}),
    (r"^dash \{.*\}$", {"dashCost"}),
    # Eomer, King of Rohan. The name is spelled with its accent because the
    # oracle text is, and these patterns read the oracle text.
    (r"enters with a \+1/\+1 counter on it for each other human you control", {"entersWithCounters"}),
    (r"target player becomes the monarch", {"becomeMonarch"}),
    (r"deals damage equal to its power to any target", {"damage"}),
    # Esper Sentinel. The whole sentence is one rule, so it is one pattern tied to
    # the effect that implements it.
    (r"whenever an opponent casts their first noncreature spell each turn, draw a card unless that player pays",
     {"drawUnlessTheyPay"}),
    (r"\bif a card or token would be put into your graveyard\b", {"replacementEffects"}),
    # "They have '...'" - a token's own rules text, which lives on the token
    # definition rather than on the card that makes them.
    (r"^they have \"", {"createToken"}),
    (r"\bmay sacrifice a permanent of their choice\b", {"offerSacrificeToOpponents"}),
    (r"\bloyalty counter\b", {"loyalty", "repeatWhileMilledMatches"}),
    # A loyalty ability's whole line - "+1: ...", "-2: ...". These live in
    # `loyaltyAbilities` rather than `activatedAbilities`, so the effect kinds
    # inside them are reached by the rules above but the line itself is not.
    (r"^[+\u2212-]\d+:", {"loyalty"}),
    (r"^if you do, draw that many cards", {"payLifeDrawThatMany"}),
    (r"^when you do, destroy", {"sacrificeChosen"}),
    # The last seven cards.
    (r"you may sacrifice an? (artifact|creature|enchantment|land|planeswalker)", {"sacrificeChosen"}),
    (r"\bbecomes prepared\b", {"becomePrepared"}),
    (r"^destroy up to x target", {"destroy"}),
    (r"^choose (two|three) target players", {"searchLibrary"}),
    (r"each of them searches their library", {"searchLibrary"}),
    (r"you may pay \{[^}]+\}", {"mayPay"}),
    (r"\breturn up to one target\b", {"returnFromGraveyard"}),
]


def covered(sentence, have):
    """
    Whether the engine models this sentence. `have` is effect kinds and card
    features together, since a rule can be implemented by either.
    """
    t = re.sub(r"\s+", " ", sentence.strip().rstrip(".").lower())
    if not t:
        return True

    # A line that is only keywords, comma separated.
    parts = [p.strip() for p in re.split(r"[,;]", t) if p.strip()]
    if parts and all(p in KEYWORDS for p in parts):
        return True
    if re.fullmatch(r"ward-?\s*(pay \d+ life|\{.*)", t):
        return "ward" in have

    hit_any = False
    for pattern, needed in RULES:
        if re.search(pattern, t):
            hit_any = True
            if needed & have:
                return True
    # A sentence that matched nothing at all is reported, not assumed fine.
    return False if hit_any else False


def decklist_names(path):
    names = set()
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or SECTION.match(line):
            continue
        m = ENTRY.match(line)
        if m:
            names.add(m.group(2).strip().lower())
    return names


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    deck = None
    if "--deck" in sys.argv:
        deck = decklist_names(sys.argv[sys.argv.index("--deck") + 1])
        args = [a for a in args if a != sys.argv[sys.argv.index("--deck") + 1]]

    fixtures = json.loads(Path(args[0]).read_text(encoding="utf-8-sig"))
    fixtures = list(fixtures.values()) if isinstance(fixtures, dict) else fixtures

    by_name = {}
    multi_faced = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            # Art-series cards are printed art, not cards: their faces carry
            # the real card's *name* with a type line of "Card" and no colour
            # identity at all. Indexed first they shadow the genuine face -
            # which is how Pillarverge Pathway came to be reported as a
            # colourless non-land that is not Commander legal.
            # "front_card" is here for the same reason "art_series" is, and was added
            # 2026-08-21 after it bit a third tool: the oversized memorabilia printing of
            # Savage Lands is named "Savage Lands", has the type line "Card", carries no
            # rules text and is not Commander-legal - and it answered for the real Jund
            # tri-land. Any layout that is a picture of a card rather than a card belongs
            # in this list.
            if card.get("layout") in ("art_series", "front_card"):
                continue
            if "Token" in card.get("type_line", ""):
                continue
            by_name.setdefault(card["name"].lower(), card)
            if card.get("card_faces"):
                multi_faced.append(card)
    """
    Faces are indexed in a second pass, and only where the name is not already
    a card of its own - see the same note in audit_fixtures.py. Indexing in one
    pass lets a face called "Regrowth" shadow the real Regrowth.
    """
    for card in multi_faced:
        for face in card["card_faces"]:
            name = face["name"].lower()
            if name in by_name:
                continue
            merged = dict(card)
            merged.update({k: v for k, v in face.items() if v is not None})
            merged["legalities"] = card.get("legalities", {})
            merged["color_identity"] = card.get("color_identity", [])
            by_name[name] = merged

    gaps, checked = [], 0
    for fx in fixtures:
        if fx.get("isToken"):
            continue
        if deck is not None and fx["name"].lower() not in deck:
            continue
        card = by_name.get(fx["name"].lower())
        if not card:
            continue
        checked += 1
        # Trigger *events*, alongside the effect kinds. A keyword whose whole
        # text is reminder text - mentor, mobilize - leaves nothing on the line
        # but the keyword itself, and the only honest thing to tie it to is the
        # event it actually is.
        have = (
            effect_kinds(fx)
            | card_features(fx)
            | copy_features(fx)
            | {'trigger:%s' % e for e in trigger_events(fx) if e}
        )

        oracle = strip_reminders((card.get("oracle_text") or "").replace("—", "-"))
        leftovers = []
        for line in oracle.split("\n"):
            for sentence in re.split(r"(?<=\.)\s+", line):
                cleaned = sentence.strip().lstrip("•").strip()
                if cleaned.strip(" .") and not covered(cleaned, have):
                    leftovers.append(re.sub(r"\s+", " ", sentence.strip()))
        if leftovers:
            gaps.append((fx["name"], fx.get("tier"), leftovers))

    scope = "in the deck" if deck is not None else "in the pool"
    print("Read the rules text of %d non-token fixtures %s." % (checked, scope))
    print("Cards with text this audit could not account for: %d\n" % len(gaps))
    for name, tier, leftovers in sorted(gaps):
        print("- %s [%s]" % (name, tier))
        for line in leftovers:
            print("    %s" % line)


main()
