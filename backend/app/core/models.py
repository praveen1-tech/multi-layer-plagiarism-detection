"""
SQLAlchemy ORM models for the database.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    """User model for storing user information."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to activities
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self, include_activities=False):
        data = {
            "username": self.email,  # Keep 'username' key for frontend compatibility
            "email": self.email,
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
