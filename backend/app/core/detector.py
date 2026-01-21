from sentence_transformers import SentenceTransformer, util
import torch
import pickle
from app.core.stylometry import stylometer


class PlagiarismDetector:
    def __init__(self):
        # Load pre-trained model for semantic similarity
        print("Loading SBERT model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded.")
        
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
                for ref in refs:
                    entry = {"id": ref.doc_id, "text": ref.text}
                    self.documents.append(entry)
                    
                    # Deserialize or regenerate embedding
                    if ref.embedding:
                        embedding = pickle.loads(ref.embedding)
                    else:
                        embedding = self.model.encode(ref.text, convert_to_tensor=True)
                    
                    if self.embeddings is None:
                        self.embeddings = embedding.unsqueeze(0)
                    else:
                        self.embeddings = torch.cat((self.embeddings, embedding.unsqueeze(0)), dim=0)
                
                self._db_initialized = True
                print(f"Loaded {len(refs)} references from database.")
            finally:
                db.close()
        except Exception as e:
            print(f"Warning: Could not load from database: {e}")
            self._db_initialized = True

    def add_document(self, doc_id: str, text: str):
        """Adds a document to the reference database."""
        self._load_from_db()  # Ensure DB is loaded
        
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
        
        # Update in-memory cache
        entry = {"id": doc_id, "text": text}
        self.documents.append(entry)
        
        if self.embeddings is None:
            self.embeddings = embedding.unsqueeze(0)
        else:
            self.embeddings = torch.cat((self.embeddings, embedding.unsqueeze(0)), dim=0)
    
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
        """
        self._load_from_db()  # Ensure DB is loaded
        
        if self.embeddings is None or len(self.documents) == 0:
            return {"max_score": 0.0, "matches": [], "stylometry": stylometer.analyze(text)}
            
        # Encode query
        query_embedding = self.model.encode(text, convert_to_tensor=True)
        
        # Compute cosine similarity
        scores = util.cos_sim(query_embedding, self.embeddings)[0]
        
        # Find matches above threshold
        results = []
        for i, score in enumerate(scores):
            score_val = float(score)
            if score_val > threshold:
                results.append({
                    "doc_id": self.documents[i]["id"],
                    "score": round(score_val * 100, 2),
                    "snippet": self.documents[i]["text"][:200] + "..."
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        
        max_score = results[0]['score'] if results else 0.0
        
        # Stylometric Analysis
        style_metrics = stylometer.analyze(text)

        return {
            "max_score": max_score,
            "matches": results,
            "stylometry": style_metrics
        }


# Global instance
detector = PlagiarismDetector()
