"""
Shared slug/text utilities for the Project Lunar codebase.
Used by both backend engines and frontend components.
"""

from __future__ import annotations

import re
import unicodedata


def slugify(text: str) -> str:
    """
    Convert a string to a URL-safe ASCII slug.
    Matches the frontend _slugify exactly:
    1. Lowercase
    2. Replace đ/Đ first (before NFD, because NFD splits đ into d+combining → lost)
    3. NFD normalize → strip combining diacritics
    4. Replace spaces with underscore
    5. Strip remaining non-alphanumeric chars (keep underscore)
    6. Collapse multiple underscores
    7. Truncate to 48 chars
    """
    text = text.lower().strip()
    # đ/Đ must be replaced BEFORE NFD — NFD splits đ (U+0111) into d + combining hook, which gets stripped
    text = text.replace("đ", "d").replace("Đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    text = text.replace(" ", "_")
    text = re.sub(r"[^a-z0-9_]", "", text)
    text = re.sub(r"_+", "_", text)
    return text[:48]


def strip_diacritics(text: str) -> str:
    """Strip Vietnamese/CJK diacritics, matching backend slugify normalization.
    Must handle đ/Đ BEFORE NFD (same as slugify) to prevent 'd' from being stripped."""
    text = str(text).lower()
    # đ/Đ must be replaced BEFORE NFD — NFD splits đ into d + combining-hook, which gets stripped
    text = text.replace("đ", "d").replace("Đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    return text


def slug_to_display(text: str) -> str:
    """
    Convert underscore slug back to readable display name.
    e.g. 'truc_co_ky' → 'Truc Co Ky'
    Leaves text unchanged if it has no underscores.
    """
    if not text or "_" not in text:
        return text
    return " ".join(part.capitalize() for part in text.replace("-", "_").split("_"))


def is_slug(text: str) -> bool:
    """
    Return True if the text looks like a slug (lowercase, underscore, no spaces).
    Used to detect if AI returned a slug instead of a display name.
    """
    return bool(re.fullmatch(r"[a-z0-9_]+", str(text).strip()))
