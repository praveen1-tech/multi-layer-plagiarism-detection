import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

/**
 * FeedbackDashboard - Instructor dashboard for feedback analytics and learning status
 */
const FeedbackDashboard = ({ username, userRole }) => {
    const [analytics, setAnalytics] = useState(null);
    const [weights, setWeights] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, weightsRes, historyRes] = await Promise.all([
                axios.get(`${API_BASE}/feedback/analytics`),
                axios.get(`${API_BASE}/learning/weights`),
                axios.get(`${API_BASE}/feedback/history?limit=10`)
            ]);
            setAnalytics(analyticsRes.data);
            setWeights(weightsRes.data);
            setHistory(historyRes.data.history || []);
            setError('');
        } catch (err) {
            setError('Failed to load analytics');
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const triggerRetrain = async () => {
        try {
            setRetraining(true);
            await axios.post(`${API_BASE}/feedback/retrain`, {}, {
                headers: { 'X-Username': username }
            });
            await fetchData();
        } catch (err) {
            setError('Failed to trigger retraining');
            console.error('Retrain error:', err);
        } finally {
            setRetraining(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="glass-card">
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                    <span className="spinner"></span> Loading analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="learning-dashboard">
            {/* Header */}
            <div className="learning-header">
                <div>
                    <div className="glass-card-title" style={{ marginBottom: '4px' }}>
                        <span className="icon">🧠</span> Learning Dashboard
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Self-learning feedback analytics &amp; adaptive thresholds
                    </p>
                </div>
                <div className="learning-header-actions">
                    <button className="learning-btn refresh" onClick={fetchData}>
                        🔄 Refresh
                    </button>
                    {(userRole === 'instructor' || userRole === 'admin') && (
                        <button
                            className={`learning-btn retrain ${retraining ? 'disabled' : ''}`}
                            onClick={triggerRetrain}
                            disabled={retraining}
                        >
                            {retraining ? '⏳ Retraining...' : '🚀 Trigger Retrain'}
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="error-message" style={{ marginBottom: '16px' }}>{error}</p>}

            {/* Stats Grid */}
            <div className="learning-stats-grid">
                <div className="learning-stat-card">
                    <span className="learning-stat-value" style={{ color: 'var(--accent-blue)' }}>
                        {analytics?.total_feedback || 0}
                    </span>
                    <span className="learning-stat-label">Total Feedback</span>
                </div>
                <div className="learning-stat-card">
                    <span className="learning-stat-value" style={{ color: '#f97316' }}>
                        {analytics?.false_positives || 0}
                    </span>
                    <span className="learning-stat-label">False Positives</span>
                    <span className="learning-stat-sub">{analytics?.false_positive_rate || 0}% rate</span>
                </div>
                <div className="learning-stat-card">
                    <span className="learning-stat-value" style={{ color: 'var(--accent-green)' }}>
                        {analytics?.confirmed_plagiarism || 0}
                    </span>
                    <span className="learning-stat-label">Confirmed</span>
                </div>
                <div className="learning-stat-card">
                    <span className="learning-stat-value" style={{ color: 'var(--accent-purple)' }}>
                        {analytics?.instructor_reviews || 0}
                    </span>
                    <span className="learning-stat-label">Instructor Reviews</span>
                </div>
            </div>

            {/* Layer Weights */}
            {weights && (
                <div className="learning-section">
                    <div className="learning-section-title">Layer Weights</div>
                    <div className="learning-weights-grid">
                        {[
                            { label: 'Semantic', key: 'semantic_weight', color: 'var(--accent-blue)' },
                            { label: 'Stylometry', key: 'stylometry_weight', color: 'var(--accent-green)' },
                            { label: 'Cross-Language', key: 'cross_lang_weight', color: 'var(--accent-purple)' },
                        ].map(layer => (
                            <div key={layer.key} className="learning-weight-card">
                                <div className="learning-weight-header">
                                    <span className="learning-weight-name">{layer.label}</span>
                                    <span className="learning-weight-value" style={{ color: layer.color }}>
                                        {(weights[layer.key] * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="learning-progress-bar">
                                    <div
                                        className="learning-progress-fill"
                                        style={{ width: `${weights[layer.key] * 100}%`, background: layer.color }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Threshold */}
                    <div className="learning-threshold-card">
                        <div className="learning-threshold-header">
                            <span style={{ color: 'var(--accent-yellow)', fontWeight: 500 }}>Effective Threshold</span>
                            <span className="learning-threshold-value">{weights.effective_threshold}%</span>
                        </div>
                        <p className="learning-threshold-detail">
                            Base: {weights.base_threshold}% | Adjustment: {weights.threshold_adjustment > 0 ? '+' : ''}{weights.threshold_adjustment}%
                        </p>
                    </div>
                </div>
            )}

            {/* Learning Status */}
            <div className="learning-status-card" style={{
                borderColor: analytics?.learning_active ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)',
                background: analytics?.learning_active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)'
            }}>
                <div className="learning-status-dot" style={{
                    background: analytics?.learning_active ? 'var(--accent-green)' : 'var(--text-muted)'
                }}></div>
                <span style={{ color: analytics?.learning_active ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500 }}>
                    {analytics?.learning_active ? 'Learning Active' : 'Learning Inactive (need more feedback)'}
                </span>
            </div>

            {/* Recent Feedback */}
            {history.length > 0 && (
                <div className="learning-section" style={{ marginTop: '20px' }}>
                    <div className="learning-section-title">Recent Feedback</div>
                    <div className="learning-history-list">
                        {history.map((entry, idx) => (
                            <div key={idx} className="learning-history-item">
                                <div className="learning-history-left">
                                    <span className={`learning-feedback-badge ${entry.feedback_type === 'false_positive' ? 'fp' : 'confirmed'}`}>
                                        {entry.feedback_type === 'false_positive' ? 'FP' : '✓ Confirmed'}
                                    </span>
                                    <span className="learning-history-doc">{entry.doc_id}</span>
                                    {entry.is_instructor_review && (
                                        <span className="learning-instructor-tag">👨‍🏫 Instructor</span>
                                    )}
                                </div>
                                <div className="learning-history-right">
                                    <span className="learning-history-score">{entry.match_score}%</span>
                                    {entry.detection_layer && (
                                        <span className="learning-history-layer">{entry.detection_layer}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackDashboard;
