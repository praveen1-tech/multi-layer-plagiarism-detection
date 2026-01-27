from fastapi import FastAPI, HTTPException, UploadFile, Header
from pydantic import BaseModel, field_validator
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Any
import re
from app.core.detector import detector
from app.core.user_manager import user_manager
from app.core.feedback_manager import feedback_manager
from app.core.adaptive_engine import adaptive_engine
from app.core.database import init_db

app = FastAPI(title="Plagiarism Detection Agent")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    print("Initializing database...")
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        print("The app will continue with in-memory storage if database is unavailable.")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Submission(BaseModel):
    text: str
    language: str = "en"
    username: Optional[str] = None

class DetectionResult(BaseModel):
    max_score: float
    matches: list
    stylometry: Optional[dict] = None

class UserLogin(BaseModel):
    email: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Email regex pattern
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        if not re.match(email_pattern, v.strip()):
            raise ValueError('Please enter a valid email address')
        return v.strip().lower()

# ============== User Endpoints ==============

@app.post("/user/login")
async def user_login(login: UserLogin):
    """Login or create a new user with email validation."""
    user = user_manager.get_or_create_user(login.email)
    return {"status": "success", "user": user.to_dict()}

@app.get("/user/profile/{username}")
async def get_user_profile(username: str):
    """Get a user's profile and stats."""
    profile = user_manager.get_user_profile(username)
    if not profile:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")
    return profile

@app.get("/user/activities/{username}")
async def get_user_activities(username: str, limit: int = 50):
    """Get a user's activity history."""
    activities = user_manager.get_user_activities(username, limit)
    return {"username": username, "activities": activities, "total": len(activities)}

@app.get("/users")
async def list_users():
    """List all users."""
    return {"users": user_manager.get_all_users()}

# ============== Detection Endpoints ==============

@app.get("/")
def read_root():
    return {"message": "Plagiarism Detection API is running. Use /detect endpoint."}

@app.post("/detect", response_model=DetectionResult)
async def detect_plagiarism(submission: Submission):
    if not submission.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = detector.detect(submission.text)
    
    # Log activity if username provided
    if submission.username:
        user_manager.log_activity(submission.username, "text_check", {
            "text_length": len(submission.text),
            "max_score": result.get("max_score", 0),
            "matches_found": len(result.get("matches", []))
        })
    
    return result

@app.post("/add_reference")
async def add_reference(doc_id: str, text: str):
    detector.add_document(doc_id, text)
    return {"status": "added", "doc_id": doc_id}

@app.post("/upload_references")
async def upload_references(files: list[UploadFile], x_username: Optional[str] = Header(None)):
    """Upload multiple files to be added to the reference database."""
    results = []
    success_count = 0
    
    for file in files:
        content = await file.read()
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": "Could not decode file. Please ensure it is a valid text file."
            })
            continue

        if not text.strip():
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": "File is empty."
            })
            continue

        # Use filename as doc_id
        doc_id = file.filename
        
        # Check for duplicate reference
        if detector.document_exists(doc_id):
            results.append({
                "filename": file.filename,
                "status": "skipped",
                "message": f"Reference '{doc_id}' already exists. Skipped duplicate."
            })
            continue
        
        detector.add_document(doc_id, text)
        success_count += 1
        
        results.append({
            "filename": file.filename,
            "status": "success",
            "message": f"Added to reference database as '{doc_id}'"
        })
    
    # Log activity if username provided
    if x_username and success_count > 0:
        user_manager.log_activity(x_username, "reference_add", {
            "count": success_count,
            "filenames": [r["filename"] for r in results if r["status"] == "success"]
        })
    
    return {"uploaded": results, "total_references": len(detector.documents)}

@app.get("/list_references")
async def list_references():
    """List all documents in the reference database."""
    docs = detector.get_all_documents()
    refs = []
    for doc in docs:
        refs.append({
            "doc_id": doc["id"],
            "preview": doc["text"][:100] + "..." if len(doc["text"]) > 100 else doc["text"]
        })
    return {"references": refs, "count": len(refs)}

@app.get("/reference/{doc_id}")
async def get_reference(doc_id: str):
    """Get the full content of a reference document."""
    doc = detector.get_document(doc_id)
    if doc:
        return {"doc_id": doc_id, "text": doc["text"]}
    raise HTTPException(status_code=404, detail=f"Reference '{doc_id}' not found")

@app.delete("/clear_references")
async def clear_references(x_username: Optional[str] = Header(None)):
    """Clear all reference documents from the database."""
    count = len(detector.get_all_documents())
    detector.clear_all_documents()
    
    if x_username and count > 0:
        user_manager.log_activity(x_username, "reference_delete", {
            "type": "clear_all",
            "count": count
        })
    
    return {"status": "cleared", "message": "All reference documents have been removed."}

@app.delete("/delete_reference/{doc_id}")
async def delete_reference(doc_id: str, x_username: Optional[str] = Header(None)):
    """Delete a single reference document by its ID."""
    if not detector.remove_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Reference '{doc_id}' not found")
    
    # Log activity
    if x_username:
        user_manager.log_activity(x_username, "reference_delete", {
            "type": "single",
            "doc_id": doc_id
        })
    
    return {"status": "deleted", "doc_id": doc_id, "remaining": len(detector.get_all_documents())}

@app.post("/detect_files")
async def detect_files(files: list[UploadFile], x_username: Optional[str] = Header(None)):
    results = []
    
    for file in files:
        # Read file content
        content = await file.read()
        try:
            # Assume UTF-8 text files for now
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            results.append({
                "filename": file.filename,
                "error": "Could not decode file. Please ensure it is a valid text file."
            })
            continue

        if not text.strip():
            results.append({
                "filename": file.filename,
                "error": "File is empty."
            })
            continue

        # Run detection
        detection_data = detector.detect(text)
        
        results.append({
            "filename": file.filename,
            "result": detection_data
        })
    
    # Log activity if username provided
    if x_username and results:
        max_score = max([r.get("result", {}).get("max_score", 0) for r in results if "result" in r], default=0)
        user_manager.log_activity(x_username, "file_check", {
            "file_count": len(files),
            "filenames": [f.filename for f in files],
            "max_score": max_score
        })
    
    return results

# ============== Feedback Endpoints (Self-Learning) ==============

class FeedbackSubmission(BaseModel):
    doc_id: str
    submitted_text: str
    match_score: float
    feedback_type: str  # 'false_positive' or 'confirmed'
    severity: Optional[int] = 50  # 0-100 plagiarism severity
    detection_layer: Optional[str] = None  # semantic/stylometry/cross_lang/paraphrase
    confidence_override: Optional[int] = None  # User's suggested confidence
    notes: Optional[str] = None  # Reviewer notes
    
    @field_validator('feedback_type')
    @classmethod
    def validate_feedback_type(cls, v):
        if v not in ('false_positive', 'confirmed'):
            raise ValueError("feedback_type must be 'false_positive' or 'confirmed'")
        return v
    
    @field_validator('detection_layer')
    @classmethod
    def validate_detection_layer(cls, v):
        if v is not None and v not in ('semantic', 'stylometry', 'cross_lang', 'paraphrase'):
            raise ValueError("detection_layer must be one of: semantic, stylometry, cross_lang, paraphrase")
        return v


@app.post("/feedback")
async def submit_feedback(feedback: FeedbackSubmission, x_username: Optional[str] = Header(None)):
    """Submit feedback on a plagiarism detection result for model improvement."""
    try:
        result = feedback_manager.submit_feedback(
            doc_id=feedback.doc_id,
            submitted_text=feedback.submitted_text,
            match_score=feedback.match_score,
            feedback_type=feedback.feedback_type,
            username=x_username,
            severity=feedback.severity or 50,
            detection_layer=feedback.detection_layer,
            confidence_override=feedback.confidence_override,
            notes=feedback.notes
        )
        
        # Log activity
        if x_username:
            user_manager.log_activity(x_username, "feedback_submit", {
                "doc_id": feedback.doc_id,
                "feedback_type": feedback.feedback_type,
                "match_score": feedback.match_score,
                "severity": feedback.severity,
                "detection_layer": feedback.detection_layer
            })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/feedback/stats")
async def get_feedback_stats():
    """Get basic feedback statistics and learning status."""
    return feedback_manager.get_stats()


@app.get("/feedback/history")
async def get_feedback_history(limit: int = 20):
    """Get recent feedback entries."""
    history = feedback_manager.get_history(limit)
    return {"history": history, "count": len(history)}


@app.get("/feedback/analytics")
async def get_feedback_analytics():
    """Get detailed feedback analytics including layer breakdown and thresholds."""
    return adaptive_engine.get_analytics()


@app.post("/feedback/retrain")
async def trigger_retrain(x_username: Optional[str] = Header(None)):
    """Trigger incremental retraining based on accumulated feedback."""
    result = adaptive_engine.trigger_retrain()
    
    # Log activity
    if x_username:
        user_manager.log_activity(x_username, "retrain_trigger", {
            "new_threshold": result.get("new_effective_threshold")
        })
    
    return result


@app.get("/learning/weights")
async def get_learning_weights():
    """Get current adaptive layer weights and threshold settings."""
    return adaptive_engine.get_or_create_weights()


@app.post("/user/role/{username}")
async def update_user_role(username: str, role: str, x_username: Optional[str] = Header(None)):
    """Update a user's role (admin only)."""
    if role not in ('student', 'instructor', 'admin'):
        raise HTTPException(status_code=400, detail="Role must be: student, instructor, or admin")
    
    from app.core.database import SessionLocal
    from app.core.models import User
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == username).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found")
        
        user.role = role
        db.commit()
        
        return {"status": "success", "username": username, "new_role": role}
    finally:
        db.close()
