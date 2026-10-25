"""
Visual Guardrails & Domain Classification Module
Enforces strict domain-specific visual accuracy, eliminates false-positive keyword triggers
(e.g. 'garam' triggering 'ram'), and forbids macro-mechanical hallucinations for microelectronics.
"""

import re
from typing import Dict, Any

# Strict regex patterns with whole-word boundaries (\b) to prevent false positives like 'garam' -> 'ram'
COMPUTING_REGEX_PATTERNS = [
    r"\bcpus?\b",
    r"\bgpus?\b",
    r"\bram\b",
    r"\bmicrochips?\b",
    r"\bmicroprocessors?\b",
    r"\bmicroelectronics?\b",
    r"\bprocessors?\b",
    r"\btransistors?\b",
    r"\bsemiconductors?\b",
    r"\bsilicon\s+die\b",
    r"\bdie[- ]shot\b",
    r"\bsilicon\s+wafers?\b",
    r"\bmotherboards?\b",
    r"\bchipsets?\b",
    r"\bintegrated\s+circuits?\b",
    r"\bphotolithography\b",
    r"\bsemiconductor\s+interconnects?\b",
    r"\blogic\s+gates?\b",
    r"\bnanometer\s+transistors?\b",
]

# Domain classification regexes
DOMAIN_PATTERNS = {
    "METEOROLOGY_FLUID": [
        r"\bhujan\b", r"\bair\b", r"\bawan\b", r"\bpresipitasi\b", r"\bevaporasi\b",
        r"\bkondensasi\b", r"\bsiklus\s+air\b", r"\bhidrologi\b", r"\bcuaca\b",
        r"\bbadai\b", r"\btroposfer\b", r"\baerosol\b", r"\bdroplets?\b", r"\bwater\s+cycle\b",
        r"\brain\b", r"\bclouds?\b", r"\bprecipitation\b", r"\bcondensation\b",
    ],
    "POWER_ENERGY": [
        r"\bpltu\b", r"\blistrik\b", r"\bgardu\b", r"\btrafo\b", r"\btransformator\b",
        r"\btransmisi\b", r"\bgenerator\b", r"\bvoltase\b", r"\bbaterai\b", r"\bpembangkit\b",
        r"\bpower\s+grid\b", r"\belectrical\b", r"\bhigh\s+voltage\b", r"\benergy\b",
    ],
    "MECHANICAL_AUTOMOTIVE": [
        r"\bmesin\s+(?:jet|bakar|diesel|motor|bensin)\b", r"\bpistons?\b", r"\bturbofan\b",
        r"\bcombustion\b", r"\broket\b", r"\bpesawat\b", r"\bmobil\b", r"\bcrankshaft\b",
    ],
    "BIOLOGY_MEDICAL": [
        r"\bsel\b", r"\bdna\b", r"\brna\b", r"\bvirus\b", r"\bbakteri\b", r"\bneuron\b",
        r"\bjantung\b", r"\bdarah\b", r"\borgan\b", r"\bcellular\b", r"\bbiological\b",
    ],
}

COMPUTING_POSITIVE_GUARDRAILS = (
    "semiconductor microcircuit architecture, high-resolution silicon die-shot, "
    "microscopic photolithography interconnects, nanometer transistor grid layout, "
    "cleanroom CAD blueprint, high-contrast engineering schematic, crisp vector technical lines, "
    "precision x-ray circuit inspection, planar micro-substrate"
)

COMPUTING_NEGATIVE_PROMPTS = (
    "gears, cogs, pistons, mechanical cylinders, wheels, clocks, steam, valves, "
    "mechanical engine, clockwork, pipes, industrial machinery, mechanical cogwheels, "
    "steampunk, brass gears, rotating shafts, internal combustion engine"
)

ENGINEERING_AESTHETIC_SYSTEM = (
    "technical engineering drawing, blueprint architectural aesthetic, deep navy blue background #0B1D36, "
    "sharp cyan CAD lines #38BDF8, isometric x-ray wireframe cutaway, crisp dimensional callout labels, "
    "cleanroom technical diagram, high precision, no artistic clutter"
)

DEFAULT_NEGATIVE_PROMPT = (
    "blurry, low resolution, messy, cartoon, 3d render plastic, low contrast, oversaturated, deformed"
)


def is_computing_entity(text: str) -> bool:
    """
    Check if text refers to microelectronics or computing hardware.
    Uses strict regex word boundaries to avoid false positives (e.g. 'garam' != 'ram').
    """
    if not text:
        return False
    lower = text.lower()
    return any(re.search(pat, lower) for pat in COMPUTING_REGEX_PATTERNS)


def detect_topic_domain(topic: str, context: str = "") -> str:
    """
    Classifies the engineering or scientific domain of the topic.
    First prioritizes topic title to prevent false triggers from incidental words in narration.
    """
    search_text = f"{topic} {context}".lower()

    # If topic itself is about computing, it's computing
    if is_computing_entity(topic):
        return "COMPUTING_HARDWARE"

    # Check defined domains
    for domain, patterns in DOMAIN_PATTERNS.items():
        if any(re.search(p, search_text) for p in patterns):
            return domain

    # Fallback check for computing context
    if is_computing_entity(context):
        return "COMPUTING_HARDWARE"

    return "GENERAL_ENGINEERING"


def apply_visual_guardrails(base_prompt: str, context: str = "") -> Dict[str, Any]:
    """
    Applies System Prompt Guardrails & Negative Prompts based on detected domain.
    """
    domain = detect_topic_domain(context, base_prompt)
    is_computing = domain == "COMPUTING_HARDWARE"

    cleaned_base = base_prompt.strip()

    if is_computing:
        conditioned_prompt = (
            f"{cleaned_base}, {COMPUTING_POSITIVE_GUARDRAILS}, {ENGINEERING_AESTHETIC_SYSTEM}"
        )
        negative_prompt = f"{COMPUTING_NEGATIVE_PROMPTS}, {DEFAULT_NEGATIVE_PROMPT}"
    else:
        conditioned_prompt = f"{cleaned_base}, {ENGINEERING_AESTHETIC_SYSTEM}"
        negative_prompt = DEFAULT_NEGATIVE_PROMPT

    return {
        "prompt": conditioned_prompt,
        "negative_prompt": negative_prompt,
        "is_computing_entity": is_computing,
        "domain": domain,
    }
