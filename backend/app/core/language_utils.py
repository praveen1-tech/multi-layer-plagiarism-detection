"""
Language detection utilities for cross-language plagiarism detection.
"""
from langdetect import detect, detect_langs, LangDetectException

# Language code to name mapping
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
    "ms": "Malay",
    "fil": "Filipino",
    "uk": "Ukrainian",
    "cs": "Czech",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "no": "Norwegian",
    "el": "Greek",
    "he": "Hebrew",
    "ro": "Romanian",
    "hu": "Hungarian",
    "sk": "Slovak",
    "bg": "Bulgarian",
    "hr": "Croatian",
    "sr": "Serbian",
    "sl": "Slovenian",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "et": "Estonian",
    "fa": "Persian",
    "ur": "Urdu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
}


def detect_language(text: str) -> dict:
    """
    Detect the language of the given text.
    
    Returns:
        dict with 'code' and 'name' keys
    """
    try:
        if not text or len(text.strip()) < 10:
            return {"code": "unknown", "name": "Unknown (text too short)"}
        
        code = detect(text)
        name = LANGUAGE_NAMES.get(code, code.upper())
        return {"code": code, "name": name}
    except LangDetectException:
        return {"code": "unknown", "name": "Unknown"}


def detect_language_probabilities(text: str) -> list:
    """
    Detect possible languages with probabilities.
    
    Returns:
        list of dicts with 'code', 'name', and 'probability' keys
    """
    try:
        if not text or len(text.strip()) < 10:
            return []
        
        langs = detect_langs(text)
        return [
            {
                "code": str(lang.lang),
                "name": LANGUAGE_NAMES.get(str(lang.lang), str(lang.lang).upper()),
                "probability": round(lang.prob * 100, 1)
            }
            for lang in langs
        ]
    except LangDetectException:
        return []
