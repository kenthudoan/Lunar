# Shared language name mapping for LLM prompts
LANG_NAMES = {
    "vi": "Vietnamese",
    "pt-br": "Portuguese (Brazilian)",
    "pt": "Portuguese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
}


def lang_name(code: str) -> str:
    """Return the human-readable language name from a language code."""
    return LANG_NAMES.get(code, "English")
