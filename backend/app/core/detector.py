from sentence_transformers import SentenceTransformer, util
import torch
import pickle
from app.core.stylometry import stylometer
from app.core.language_utils import detect_language

# Model version for cache invalidation (increment when changing models)
MODEL_VERSION = "multilingual-v1"


class PlagiarismDetector:
    def __init__(self):
        # Load multilingual model for cross-language semantic similarity
        print("Loading Multilingual SBERT model (50+ languages)...")
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("Multilingual model loaded.")
        
        # In-memory cache for performance (loaded from DB on startup)
        self.documents = []
        self.embeddings = None
        self._db_initialized = False
    
    def _get_db(self):
        """Get database session."""
        from app.core.database import SessionLocal
        return SessionLocal()
    
    def _load_from_db(self):
        """Load all references from database into memory."""
        if self._db_initialized:
            return
            
        try:
            from app.core.models import ReferenceDocument
            db = self._get_db()
            try:
                refs = db.query(ReferenceDocument).all()
                needs_reembed = 0
                for ref in refs:
                    lang_info = detect_language(ref.text)
                    entry = {"id": ref.doc_id, "text": ref.text, "language": lang_info}
                    self.documents.append(entry)
                    
                    # Always regenerate embeddings with new multilingual model
                    # (Previous embeddings were from English-only model)
                    embedding = self.model.encode(ref.text, convert_to_tensor=True)
                    needs_reembed += 1
                    
                    if self.embeddings is None:
                        self.embeddings = embedding.unsqueeze(0)
                    else:
                        self.embeddings = torch.cat((self.embeddings, embedding.unsqueeze(0)), dim=0)
                
                self._db_initialized = True
                if needs_reembed > 0:
                    print(f"Re-embedded {needs_reembed} references with multilingual model.")
                print(f"Loaded {len(refs)} references from database.")
            finally:
                db.close()
        except Exception as e:
            print(f"Warning: Could not load from database: {e}")
            self._db_initialized = True

    def add_document(self, doc_id: str, text: str):
        """Adds a document to the reference database."""
        self._load_from_db()  # Ensure DB is loaded
        
        # Detect language
        lang_info = detect_language(text)
        
        embedding = self.model.encode(text, convert_to_tensor=True)
        
        # Save to database
        try:
            from app.core.models import ReferenceDocument
            db = self._get_db()
            try:
                # Serialize embedding for storage
                embedding_bytes = pickle.dumps(embedding.cpu())
                
                ref = ReferenceDocument(
                    doc_id=doc_id,
                    text=text,
                    embedding=embedding_bytes
                )
                db.add(ref)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"Warning: Could not save to database: {e}")
        
        # Update in-memory cache with language info
        entry = {"id": doc_id, "text": text, "language": lang_info}
        self.documents.append(entry)
        
        if self.embeddings is None:
            self.embeddings = embedding.unsqueeze(0)
        else:
            self.embeddings = torch.cat((self.embeddings, embedding.unsqueeze(0)), dim=0)
        
        return lang_info
    
    def remove_document(self, doc_id: str) -> bool:
        """Remove a document from the database and cache."""
        self._load_from_db()
        
        # Find index in cache
        index_to_remove = None
        for i, doc in enumerate(self.documents):
            if doc["id"] == doc_id:
                index_to_remove = i
                break
        
        if index_to_remove is None:
            return False
        
        # Remove from database
        try:
            from app.core.models import ReferenceDocument
            db = self._get_db()
            try:
                ref = db.query(ReferenceDocument).filter(ReferenceDocument.doc_id == doc_id).first()
                if ref:
                    db.delete(ref)
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"Warning: Could not delete from database: {e}")
        
        # Remove from cache
        self.documents.pop(index_to_remove)
        
        if self.embeddings is not None:
            if len(self.documents) == 0:
                self.embeddings = None
            else:
                indices = list(range(self.embeddings.shape[0]))
                indices.pop(index_to_remove)
                self.embeddings = self.embeddings[indices]
        
        return True
    
    def clear_all_documents(self):
        """Clear all documents from database and cache."""
        try:
            from app.core.models import ReferenceDocument
            db = self._get_db()
            try:
                db.query(ReferenceDocument).delete()
                db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"Warning: Could not clear database: {e}")
        
        self.documents = []
        self.embeddings = None
    
    def get_document(self, doc_id: str) -> dict:
        """Get a document by ID."""
        self._load_from_db()
        for doc in self.documents:
            if doc["id"] == doc_id:
                return doc
        return None
    
    def get_all_documents(self) -> list:
        """Get all documents."""
        self._load_from_db()
        return self.documents
    
    def document_exists(self, doc_id: str) -> bool:
        """Check if a document exists."""
        self._load_from_db()
        return any(doc["id"] == doc_id for doc in self.documents)

    def detect(self, text: str, threshold: float = 0.4):
        """
        Checks the input text against the database.
        Returns the top matches and a max score.
        Supports cross-language detection with 50+ languages.
        """
        self._load_from_db()  # Ensure DB is loaded
        
        # Detect query language
        query_language = detect_language(text)
        
        if self.embeddings is None or len(self.documents) == 0:
            return {
                "max_score": 0.0, 
                "matches": [], 
                "stylometry": stylometer.analyze(text),
                "query_language": query_language,
                "cross_language_enabled": True
            }
            
        # Encode query
        query_embedding = self.model.encode(text, convert_to_tensor=True)
        
        # Compute cosine similarity
        scores = util.cos_sim(query_embedding, self.embeddings)[0]
        
        # Find matches above threshold
        results = []
        cross_language_matches = 0
        for i, score in enumerate(scores):
            score_val = float(score)
            if score_val > threshold:
                doc = self.documents[i]
                doc_language = doc.get("language", {"code": "unknown", "name": "Unknown"})
                is_cross_language = doc_language.get("code") != query_language.get("code")
                
                if is_cross_language:
                    cross_language_matches += 1
                
                results.append({
                    "doc_id": doc["id"],
                    "score": round(score_val * 100, 2),
                    "snippet": doc["text"][:200] + "...",
                    "language": doc_language,
                    "is_cross_language": is_cross_language
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        
        max_score = results[0]['score'] if results else 0.0
        
        # Stylometric Analysis
        style_metrics = stylometer.analyze(text)

        return {
            "max_score": max_score,
            "matches": results,
            "stylometry": style_metrics,
            "query_language": query_language,
            "cross_language_enabled": True,
            "cross_language_matches": cross_language_matches
        }


# Global instance
detector = PlagiarismDetector()
