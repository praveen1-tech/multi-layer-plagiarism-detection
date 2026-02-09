"""
SQLAlchemy ORM models for the database.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    """User model for storing user information."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(20), default='user')  # user/instructor/admin
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to activities
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self, include_activities=False):
        data = {
            "username": self.email,  # Keep 'username' key for frontend compatibility
            "email": self.email,
            "role": self.role or 'user',
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stats": self.get_stats()
        }
        if include_activities:
            data["activities"] = [a.to_dict() for a in sorted(self.activities, key=lambda x: x.created_at, reverse=True)]
        return data
    
    def get_stats(self):
        """Calculate user statistics from activities."""
        stats = {
            "total_activities": len(self.activities),
            "text_checks": 0,
            "file_checks": 0,
            "references_added": 0,
            "references_deleted": 0,
            "total_files_analyzed": 0,
            "highest_plagiarism_score": 0.0
        }
        
        for activity in self.activities:
            details = activity.details or {}
            if activity.activity_type == "text_check":
                stats["text_checks"] += 1
                score = details.get("max_score", 0)
                if score > stats["highest_plagiarism_score"]:
                    stats["highest_plagiarism_score"] = score
            elif activity.activity_type == "file_check":
                stats["file_checks"] += 1
                stats["total_files_analyzed"] += details.get("file_count", 0)
            elif activity.activity_type == "reference_add":
                stats["references_added"] += details.get("count", 0)
            elif activity.activity_type == "reference_delete":
                stats["references_deleted"] += 1
        
        return stats


class Activity(Base):
    """Activity model for tracking user actions."""
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="activities")
    
    def to_dict(self):
        return {
            "type": self.activity_type,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
            "details": self.details or {}
        }


class ReferenceDocument(Base):
    """Reference document model for storing plagiarism reference texts."""
    __tablename__ = "reference_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(255), unique=True, nullable=False, index=True)
    text = Column(Text, nullable=False)
    embedding = Column(LargeBinary, nullable=True)  # Serialized tensor
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "doc_id": self.doc_id,
            "text": self.text,
            "preview": self.text[:100] + "..." if len(self.text) > 100 else self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Feedback(Base):
    """Feedback model for storing user corrections on detection results."""
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    doc_id = Column(String(255), nullable=False, index=True)  # Reference document ID
    submitted_text_hash = Column(String(64), nullable=False)  # SHA256 hash of submitted text
    match_score = Column(Integer, nullable=False)  # Original match score (0-100)
    feedback_type = Column(String(20), nullable=False)  # 'false_positive' or 'confirmed'
    
    # Fine-grained feedback fields
    severity = Column(Integer, default=50)  # 0-100 plagiarism severity rating
    detection_layer = Column(String(30), nullable=True)  # semantic/stylometry/cross_lang/paraphrase
    confidence_override = Column(Integer, nullable=True)  # User's suggested confidence (0-100)
    notes = Column(Text, nullable=True)  # Instructor notes/comments
    is_instructor_review = Column(Boolean, default=False)  # Whether reviewed by instructor
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", backref="feedback_entries")
    
    def to_dict(self):
        return {
            "id": self.id,
            "doc_id": self.doc_id,
            "match_score": self.match_score,
            "feedback_type": self.feedback_type,
            "severity": self.severity,
            "detection_layer": self.detection_layer,
            "confidence_override": self.confidence_override,
            "notes": self.notes,
            "is_instructor_review": self.is_instructor_review,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class LayerWeights(Base):
    """Model for storing adaptive detection layer weights."""
    __tablename__ = "layer_weights"
    
    id = Column(Integer, primary_key=True, index=True)
    semantic_weight = Column(Float, default=0.5)  # Weight for semantic similarity
    stylometry_weight = Column(Float, default=0.3)  # Weight for stylometric analysis
    cross_lang_weight = Column(Float, default=0.2)  # Weight for cross-language detection
    base_threshold = Column(Float, default=40.0)  # Base detection threshold
    threshold_adjustment = Column(Float, default=0.0)  # Current threshold adjustment
    total_feedback_processed = Column(Integer, default=0)  # Feedback count used for training
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "semantic_weight": round(self.semantic_weight, 3),
            "stylometry_weight": round(self.stylometry_weight, 3),
            "cross_lang_weight": round(self.cross_lang_weight, 3),
            "base_threshold": round(self.base_threshold, 1),
            "threshold_adjustment": round(self.threshold_adjustment, 1),
            "effective_threshold": round(self.base_threshold + self.threshold_adjustment, 1),
            "total_feedback_processed": self.total_feedback_processed,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class UserDocument(Base):
    """Model for storing user uploaded documents for cross-user plagiarism detection."""
    __tablename__ = "user_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doc_id = Column(String(255), nullable=False, index=True)  # filename or identifier
    text = Column(Text, nullable=False)
    embedding = Column(LargeBinary, nullable=True)  # Serialized tensor
    language_code = Column(String(10), nullable=True)  # Detected language
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", backref="documents")
    
    def to_dict(self):
        return {
            "id": self.id,
            "doc_id": self.doc_id,
            "user_email": self.user.email if self.user else None,
            "preview": self.text[:100] + "..." if len(self.text) > 100 else self.text,
            "language_code": self.language_code,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
