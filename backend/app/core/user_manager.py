"""
User management with MySQL database storage, with in-memory fallback.
"""
from typing import Optional
from datetime import datetime


class ActivityInMemory:
    """In-memory activity representation."""
    def __init__(self, activity_type: str, details: dict = None):
        self.type = activity_type
        self.timestamp = datetime.now().isoformat()
        self.details = details or {}
    
    def to_dict(self):
        return {
            "type": self.type,
            "timestamp": self.timestamp,
            "details": self.details
        }


class UserInMemory:
    """In-memory user representation."""
    def __init__(self, email: str):
        self.email = email
        self.created_at = datetime.now().isoformat()
        self.activities = []
    
    def get_stats(self):
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
            if activity.type == "text_check":
                stats["text_checks"] += 1
                score = activity.details.get("max_score", 0)
                if score > stats["highest_plagiarism_score"]:
                    stats["highest_plagiarism_score"] = score
            elif activity.type == "file_check":
                stats["file_checks"] += 1
                stats["total_files_analyzed"] += activity.details.get("file_count", 0)
            elif activity.type == "reference_add":
                stats["references_added"] += activity.details.get("count", 0)
            elif activity.type == "reference_delete":
                stats["references_deleted"] += 1
        return stats
    
    def to_dict(self, include_activities=False):
        data = {
            "username": self.email,
            "email": self.email,
            "created_at": self.created_at,
            "stats": self.get_stats()
        }
        if include_activities:
            data["activities"] = [a.to_dict() for a in reversed(self.activities)]
        return data


class UserManager:
    """Manages users with MySQL or in-memory fallback."""
    
    def __init__(self):
        self.use_database = False
        self.users_memory = {}  # In-memory fallback
        self._try_database()
    
    def _try_database(self):
        """Try to connect to database."""
        try:
            from app.core.database import SessionLocal
            from sqlalchemy import text
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            self.use_database = True
            print("UserManager: Connected to MySQL database")
        except Exception as e:
            print(f"UserManager: MySQL unavailable, using in-memory storage. Error: {e}")
            self.use_database = False
    
    def get_or_create_user(self, email: str):
        """Get existing user or create new one."""
        if self.use_database:
            return self._db_get_or_create_user(email)
        else:
            if email not in self.users_memory:
                self.users_memory[email] = UserInMemory(email)
            return self.users_memory[email]
    
    def _db_get_or_create_user(self, email: str):
        from app.core.database import SessionLocal
        from app.core.models import User
        from sqlalchemy.orm import joinedload
        db = SessionLocal()
        try:
            user = db.query(User).options(joinedload(User.activities)).filter(User.email == email).first()
            if not user:
                user = User(email=email)
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        finally:
            db.close()
    
    def get_user(self, email: str):
        """Get user by email."""
        if self.use_database:
            from app.core.database import SessionLocal
            from app.core.models import User
            from sqlalchemy.orm import joinedload
            db = SessionLocal()
            try:
                return db.query(User).options(joinedload(User.activities)).filter(User.email == email).first()
            finally:
                db.close()
        else:
            return self.users_memory.get(email)
    
    def log_activity(self, email: str, activity_type: str, details: dict = None):
        """Log an activity for a user."""
        if self.use_database:
            return self._db_log_activity(email, activity_type, details)
        else:
            user = self.get_or_create_user(email)
            activity = ActivityInMemory(activity_type, details)
            user.activities.append(activity)
            return activity
    
    def _db_log_activity(self, email: str, activity_type: str, details: dict = None):
        from app.core.database import SessionLocal
        from app.core.models import User, Activity
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(email=email)
                db.add(user)
                db.commit()
                db.refresh(user)
            
            activity = Activity(
                user_id=user.id,
                activity_type=activity_type,
                details=details or {}
            )
            db.add(activity)
            db.commit()
            return activity
        finally:
            db.close()
    
    def get_user_activities(self, email: str, limit: int = 50) -> list:
        """Get user's activities."""
        if self.use_database:
            from app.core.database import SessionLocal
            from app.core.models import User, Activity
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == email).first()
                if not user:
                    return []
                activities = db.query(Activity).filter(Activity.user_id == user.id)\
                    .order_by(Activity.created_at.desc()).limit(limit).all()
                return [a.to_dict() for a in activities]
            finally:
                db.close()
        else:
            user = self.users_memory.get(email)
            if not user:
                return []
            return [a.to_dict() for a in reversed(user.activities)][:limit]
    
    def get_user_profile(self, email: str) -> Optional[dict]:
        """Get user profile with stats."""
        if self.use_database:
            from app.core.database import SessionLocal
            from app.core.models import User
            from sqlalchemy.orm import joinedload
            db = SessionLocal()
            try:
                user = db.query(User).options(joinedload(User.activities)).filter(User.email == email).first()
                if not user:
                    return None
                # _ = user.activities # No longer needed with joinedload
                return user.to_dict(include_activities=False)
            finally:
                db.close()
        else:
            user = self.users_memory.get(email)
            if not user:
                return None
            return user.to_dict(include_activities=False)
    
    def get_all_users(self) -> list:
        """Get list of all users."""
        if self.use_database:
            from app.core.database import SessionLocal
            from app.core.models import User
            db = SessionLocal()
            try:
                users = db.query(User).all()
                return [u.to_dict() for u in users]
            finally:
                db.close()
        else:
            return [u.to_dict() for u in self.users_memory.values()]


# Global instance
user_manager = UserManager()
