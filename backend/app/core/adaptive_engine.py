"""
Adaptive Learning Engine for Self-Learning Feedback Loop.
Handles threshold tuning, layer weight rebalancing, and score calibration.
"""
import hashlib
from datetime import datetime
from typing import Optional, Dict, List, Tuple
from app.core.database import SessionLocal


class AdaptiveEngine:
    """
    Adaptive learning engine that adjusts detection parameters based on feedback.
    
    Features:
    - Threshold tuning based on false positive/confirmed rates
    - Layer weight rebalancing (semantic, stylometry, cross-language)
    - Score calibration using historical feedback
    - Incremental retraining triggers
    """
    
    def __init__(self):
        self._min_feedback_for_learning = 10
        self._cache_weights = None
        self._cache_timestamp = None
    
    def _get_db(self):
        """Get database session."""
        return SessionLocal()
    
    def get_or_create_weights(self) -> Dict:
        """Get current layer weights, creating default if none exist."""
        from app.core.models import LayerWeights
        
        db = self._get_db()
        try:
            weights = db.query(LayerWeights).first()
            if not weights:
                weights = LayerWeights(
                    semantic_weight=0.5,
                    stylometry_weight=0.3,
                    cross_lang_weight=0.2,
                    base_threshold=40.0,
                    threshold_adjustment=0.0,
                    total_feedback_processed=0
                )
                db.add(weights)
                db.commit()
                db.refresh(weights)
            return weights.to_dict()
        finally:
            db.close()
    
    def calculate_adaptive_threshold(self) -> Tuple[float, Dict]:
        """
        Calculate adaptive threshold based on feedback patterns.
        
        Returns:
            Tuple of (effective_threshold, analytics_dict)
        """
        from app.core.models import Feedback, LayerWeights
        from sqlalchemy import func
        
        db = self._get_db()
        try:
            # Get feedback statistics by score range
            total = db.query(Feedback).count()
            
            if total < self._min_feedback_for_learning:
                weights = db.query(LayerWeights).first()
                base = weights.base_threshold if weights else 40.0
                return base, {"learning_active": False, "feedback_needed": self._min_feedback_for_learning - total}
            
            # Analyze feedback by score ranges
            score_ranges = [(0, 30), (30, 50), (50, 70), (70, 100)]
            range_stats = []
            
            for low, high in score_ranges:
                fp_count = db.query(Feedback).filter(
                    Feedback.feedback_type == 'false_positive',
                    Feedback.match_score >= low,
                    Feedback.match_score < high
                ).count()
                
                confirmed_count = db.query(Feedback).filter(
                    Feedback.feedback_type == 'confirmed',
                    Feedback.match_score >= low,
                    Feedback.match_score < high
                ).count()
                
                total_range = fp_count + confirmed_count
                fp_rate = fp_count / total_range if total_range > 0 else 0
                
                range_stats.append({
                    "range": f"{low}-{high}",
                    "false_positives": fp_count,
                    "confirmed": confirmed_count,
                    "fp_rate": round(fp_rate * 100, 1)
                })
            
            # Calculate optimal threshold - find the score where FP rate drops below 30%
            optimal_threshold = 40.0  # Default
            for i, stats in enumerate(range_stats):
                if stats["fp_rate"] < 30 and stats["confirmed"] > 0:
                    optimal_threshold = score_ranges[i][0]
                    break
            
            # Global false positive rate
            total_fp = db.query(Feedback).filter(
                Feedback.feedback_type == 'false_positive'
            ).count()
            global_fp_rate = total_fp / total if total > 0 else 0
            
            # Calculate adjustment: more FPs → raise threshold
            adjustment = (global_fp_rate - 0.3) * 20  # Target 30% FP rate
            adjustment = max(-15, min(15, adjustment))  # Clamp to ±15
            
            # Update weights in database
            weights = db.query(LayerWeights).first()
            if weights:
                weights.threshold_adjustment = adjustment
                weights.total_feedback_processed = total
                weights.updated_at = datetime.utcnow()
                db.commit()
            
            effective_threshold = (weights.base_threshold if weights else 40.0) + adjustment
            
            return effective_threshold, {
                "learning_active": True,
                "total_feedback": total,
                "global_fp_rate": round(global_fp_rate * 100, 1),
                "threshold_adjustment": round(adjustment, 1),
                "effective_threshold": round(effective_threshold, 1),
                "score_range_analysis": range_stats
            }
        finally:
            db.close()
    
    def rebalance_layer_weights(self) -> Dict:
        """
        Rebalance detection layer weights based on which layers generate more false positives.
        
        Logic:
        - If a layer frequently triggers false positives, reduce its weight
        - If a layer correctly identifies plagiarism, increase its weight
        """
        from app.core.models import Feedback, LayerWeights
        from sqlalchemy import func
        
        db = self._get_db()
        try:
            # Count feedback by detection layer
            layer_stats = {}
            for layer in ['semantic', 'stylometry', 'cross_lang', 'paraphrase']:
                fp_count = db.query(Feedback).filter(
                    Feedback.feedback_type == 'false_positive',
                    Feedback.detection_layer == layer
                ).count()
                
                confirmed_count = db.query(Feedback).filter(
                    Feedback.feedback_type == 'confirmed',
                    Feedback.detection_layer == layer
                ).count()
                
                total = fp_count + confirmed_count
                accuracy = confirmed_count / total if total > 0 else 0.5
                
                layer_stats[layer] = {
                    "false_positives": fp_count,
                    "confirmed": confirmed_count,
                    "total": total,
                    "accuracy": round(accuracy * 100, 1)
                }
            
            # Calculate new weights based on accuracy
            # Higher accuracy = higher weight
            accuracies = {
                'semantic': layer_stats.get('semantic', {}).get('accuracy', 50) / 100,
                'stylometry': layer_stats.get('stylometry', {}).get('accuracy', 50) / 100,
                'cross_lang': layer_stats.get('cross_lang', {}).get('accuracy', 50) / 100
            }
            
            total_accuracy = sum(accuracies.values()) or 1
            
            new_weights = {
                'semantic': accuracies['semantic'] / total_accuracy,
                'stylometry': accuracies['stylometry'] / total_accuracy,
                'cross_lang': accuracies['cross_lang'] / total_accuracy
            }
            
            # Ensure minimum weights (no layer below 10%)
            for key in new_weights:
                new_weights[key] = max(0.1, min(0.8, new_weights[key]))
            
            # Normalize to sum to 1.0
            total_weight = sum(new_weights.values())
            for key in new_weights:
                new_weights[key] = new_weights[key] / total_weight
            
            # Update database
            weights = db.query(LayerWeights).first()
            if weights:
                weights.semantic_weight = new_weights['semantic']
                weights.stylometry_weight = new_weights['stylometry']
                weights.cross_lang_weight = new_weights['cross_lang']
                weights.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(weights)
            
            return {
                "status": "success",
                "layer_statistics": layer_stats,
                "new_weights": {
                    "semantic": round(new_weights['semantic'], 3),
                    "stylometry": round(new_weights['stylometry'], 3),
                    "cross_lang": round(new_weights['cross_lang'], 3)
                },
                "current_weights": weights.to_dict() if weights else None
            }
        finally:
            db.close()
    
    def get_analytics(self) -> Dict:
        """Get comprehensive feedback analytics."""
        from app.core.models import Feedback, LayerWeights, User
        from sqlalchemy import func
        
        db = self._get_db()
        try:
            total = db.query(Feedback).count()
            
            # Feedback by type
            false_positives = db.query(Feedback).filter(
                Feedback.feedback_type == 'false_positive'
            ).count()
            confirmed = db.query(Feedback).filter(
                Feedback.feedback_type == 'confirmed'
            ).count()
            
            # Instructor reviews
            instructor_reviews = db.query(Feedback).filter(
                Feedback.is_instructor_review == True
            ).count()
            
            # Average severity
            avg_severity = db.query(func.avg(Feedback.severity)).scalar() or 50
            
            # Feedback by layer
            layer_breakdown = {}
            for layer in ['semantic', 'stylometry', 'cross_lang', 'paraphrase', None]:
                count = db.query(Feedback).filter(
                    Feedback.detection_layer == layer
                ).count()
                layer_breakdown[layer or 'unspecified'] = count
            
            # Get current weights
            weights = db.query(LayerWeights).first()
            
            return {
                "total_feedback": total,
                "false_positives": false_positives,
                "confirmed_plagiarism": confirmed,
                "instructor_reviews": instructor_reviews,
                "false_positive_rate": round(false_positives / total * 100, 1) if total > 0 else 0,
                "average_severity": round(avg_severity, 1),
                "feedback_by_layer": layer_breakdown,
                "learning_active": total >= self._min_feedback_for_learning,
                "current_weights": weights.to_dict() if weights else None
            }
        finally:
            db.close()
    
    def trigger_retrain(self) -> Dict:
        """
        Trigger incremental retraining based on accumulated feedback.
        This recalculates thresholds and rebalances weights.
        """
        # Calculate new threshold
        threshold, threshold_analytics = self.calculate_adaptive_threshold()
        
        # Rebalance layer weights
        weight_result = self.rebalance_layer_weights()
        
        return {
            "status": "retrain_complete",
            "threshold_analytics": threshold_analytics,
            "weight_rebalancing": weight_result,
            "new_effective_threshold": threshold
        }


# Global instance
adaptive_engine = AdaptiveEngine()
