"""
Feedback Manager for Self-Learning Feedback Loop.
Handles storing user feedback and calculating threshold adjustments.
"""
import hashlib
from datetime import datetime
from typing import Optional, Dict, List
from app.core.database import SessionLocal


class FeedbackManager:
    """Manages feedback collection and adaptive threshold calculations."""
    
    def __init__(self):
        self._threshold_adjustment = 0.0  # Adjustment value for detection threshold
        self._min_feedback_for_adjustment = 10  # Minimum feedback entries before adjusting
    
    def _get_db(self):
        """Get database session."""
        return SessionLocal()
    
    def _hash_text(self, text: str) -> str:
        """Create a hash of the submitted text for tracking."""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def submit_feedback(
        self,
        doc_id: str,
        submitted_text: str,
        match_score: float,
        feedback_type: str,
        username: Optional[str] = None
    ) -> Dict:
        """
        Submit feedback on a detection result.
        
        Args:
            doc_id: The reference document ID that was matched
            submitted_text: The original text that was checked
            match_score: The similarity score (0-100)
            feedback_type: 'false_positive' or 'confirmed'
            username: Optional user email
            
        Returns:
            Dict with feedback ID and status
        """
        from app.core.models import Feedback, User
        
        if feedback_type not in ('false_positive', 'confirmed'):
            raise ValueError("feedback_type must be 'false_positive' or 'confirmed'")
        
        db = self._get_db()
        try:
            # Get user ID if username provided
            user_id = None
            if username:
                user = db.query(User).filter(User.email == username).first()
                if user:
                    user_id = user.id
            
            # Create feedback entry
            feedback = Feedback(
                user_id=user_id,
                doc_id=doc_id,
                submitted_text_hash=self._hash_text(submitted_text),
                match_score=int(match_score),
                feedback_type=feedback_type
            )
            db.add(feedback)
            db.commit()
            db.refresh(feedback)
            
            # Recalculate threshold adjustment
            self._update_threshold_adjustment(db)
            
            return {
                "id": feedback.id,
                "status": "success",
                "feedback_type": feedback_type,
                "threshold_adjustment": self._threshold_adjustment
            }
        finally:
            db.close()
    
    def _update_threshold_adjustment(self, db):
        """
        Calculate threshold adjustment based on accumulated feedback.
        
        Logic:
        - If many false positives at low scores: lower the threshold
        - If many confirmed plagiarism at high scores: raise the threshold
        """
        from app.core.models import Feedback
        from sqlalchemy import func
        
        # Get feedback counts
        total = db.query(Feedback).count()
        
        if total < self._min_feedback_for_adjustment:
            self._threshold_adjustment = 0.0
            return
        
        # Calculate false positive rate for different score ranges
        false_positives = db.query(Feedback).filter(
            Feedback.feedback_type == 'false_positive'
        ).count()
        
        confirmed = db.query(Feedback).filter(
            Feedback.feedback_type == 'confirmed'
        ).count()
        
        if total > 0:
            fp_rate = false_positives / total
            # Adjust threshold: more FPs → raise threshold (reduce sensitivity)
            # More confirmed → lower threshold (increase sensitivity)
            # Range: -10 to +10 percentage points
            self._threshold_adjustment = (fp_rate - 0.5) * 20
            self._threshold_adjustment = max(-10, min(10, self._threshold_adjustment))
    
    def get_stats(self) -> Dict:
        """Get feedback statistics."""
        from app.core.models import Feedback
        from sqlalchemy import func
        
        db = self._get_db()
        try:
            total = db.query(Feedback).count()
            false_positives = db.query(Feedback).filter(
                Feedback.feedback_type == 'false_positive'
            ).count()
            confirmed = db.query(Feedback).filter(
                Feedback.feedback_type == 'confirmed'
            ).count()
            
            # Average scores by feedback type
            fp_avg_score = db.query(func.avg(Feedback.match_score)).filter(
                Feedback.feedback_type == 'false_positive'
            ).scalar() or 0
            
            confirmed_avg_score = db.query(func.avg(Feedback.match_score)).filter(
                Feedback.feedback_type == 'confirmed'
            ).scalar() or 0
            
            return {
                "total_feedback": total,
                "false_positives": false_positives,
                "confirmed_plagiarism": confirmed,
                "false_positive_rate": round(false_positives / total * 100, 1) if total > 0 else 0,
                "avg_false_positive_score": round(fp_avg_score, 1),
                "avg_confirmed_score": round(confirmed_avg_score, 1),
                "threshold_adjustment": round(self._threshold_adjustment, 1),
                "learning_active": total >= self._min_feedback_for_adjustment
            }
        finally:
            db.close()
    
    def get_history(self, limit: int = 20) -> List[Dict]:
        """Get recent feedback history."""
        from app.core.models import Feedback
        
        db = self._get_db()
        try:
            entries = db.query(Feedback).order_by(
                Feedback.created_at.desc()
            ).limit(limit).all()
            
            return [entry.to_dict() for entry in entries]
        finally:
            db.close()
    
    def get_threshold_adjustment(self) -> float:
        """Get the current threshold adjustment value."""
        return self._threshold_adjustment


# Global instance
feedback_manager = FeedbackManager()
