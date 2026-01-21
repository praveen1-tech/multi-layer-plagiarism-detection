import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
import statistics
import os

# Ensure NLTK data path includes our local directory if needed, 
# but usually it downloads to user home. 
# We'll try to download quietly if not present.
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    print("Downloading NLTK punkt tokenizer...")
    nltk.download('punkt', quiet=True)
    print("Downloaded.")

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    print("Downloading NLTK punkt_tab tokenizer...")
    nltk.download('punkt_tab', quiet=True)


class StylometryAnalyzer:
    def analyze(self, text: str):
        if not text.strip():
             return {
                "avg_sentence_length": 0,
                "vocabulary_richness": 0,
                "total_sentences": 0,
                "total_words": 0
            }

        try:
            sentences = sent_tokenize(text)
            words = word_tokenize(text)
        except Exception as e:
            print(f"Error in tokenization: {e}")
            return {
                "avg_sentence_length": 0,
                "vocabulary_richness": 0,
                "error": str(e)
            }
        
        if not sentences or not words:
            return {
                "avg_sentence_length": 0,
                "vocabulary_richness": 0,
                "total_sentences": 0,
                "total_words": 0
            }
            
        # Average Sentence Length
        # Filter mostly alphanumeric words for length calc
        sent_lengths = []
        for s in sentences:
            s_words = [w for w in word_tokenize(s) if w.isalnum()]
            if s_words:
                sent_lengths.append(len(s_words))
        
        avg_sent_len = statistics.mean(sent_lengths) if sent_lengths else 0
        
        # Vocabulary Richness (Type-Token Ratio)
        alphanum_words = [w.lower() for w in words if w.isalnum()]
        unique_words = set(alphanum_words)
        total_words = len(alphanum_words)
        ttr = len(unique_words) / total_words if total_words > 0 else 0
        
        return {
            "avg_sentence_length": round(avg_sent_len, 2),
            "vocabulary_richness": round(ttr, 2),
            "total_sentences": len(sentences),
            "total_words": total_words
        }

stylometer = StylometryAnalyzer()
