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
            await fetchData(); // Refresh data
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
            <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Learning Dashboard</h2>
                    <p className="text-sm text-gray-500">Self-learning feedback analytics & adaptive thresholds</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                    >
                        Refresh
                    </button>
                    {(userRole === 'instructor' || userRole === 'admin') && (
                        <button
                            onClick={triggerRetrain}
                            disabled={retraining}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition ${retraining
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                        >
                            {retraining ? 'Retraining...' : 'Trigger Retrain'}
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Feedback</p>
                    <p className="text-2xl font-bold text-blue-800">{analytics?.total_feedback || 0}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium uppercase">False Positives</p>
                    <p className="text-2xl font-bold text-orange-800">{analytics?.false_positives || 0}</p>
                    <p className="text-xs text-orange-600">{analytics?.false_positive_rate || 0}% rate</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-green-600 font-medium uppercase">Confirmed</p>
                    <p className="text-2xl font-bold text-green-800">{analytics?.confirmed_plagiarism || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium uppercase">Instructor Reviews</p>
                    <p className="text-2xl font-bold text-purple-800">{analytics?.instructor_reviews || 0}</p>
                </div>
            </div>

            {/* Layer Weights */}
            {weights && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Layer Weights</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">Semantic</span>
                                <span className="text-sm font-bold text-gray-800">{(weights.semantic_weight * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${weights.semantic_weight * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">Stylometry</span>
                                <span className="text-sm font-bold text-gray-800">{(weights.stylometry_weight * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${weights.stylometry_weight * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">Cross-Language</span>
                                <span className="text-sm font-bold text-gray-800">{(weights.cross_lang_weight * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${weights.cross_lang_weight * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-yellow-700">Effective Threshold</span>
                            <span className="text-lg font-bold text-yellow-800">{weights.effective_threshold}%</span>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                            Base: {weights.base_threshold}% | Adjustment: {weights.threshold_adjustment > 0 ? '+' : ''}{weights.threshold_adjustment}%
                        </p>
                    </div>
                </div>
            )}

            {/* Learning Status */}
            <div className="mb-6">
                <div className={`p-3 rounded-lg ${analytics?.learning_active ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${analytics?.learning_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className={`text-sm font-medium ${analytics?.learning_active ? 'text-green-700' : 'text-gray-600'}`}>
                            {analytics?.learning_active ? 'Learning Active' : 'Learning Inactive (need more feedback)'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Feedback */}
            {history.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Feedback</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {history.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.feedback_type === 'false_positive'
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {entry.feedback_type === 'false_positive' ? 'FP' : 'Confirmed'}
                                    </span>
                                    <span className="text-gray-600">{entry.doc_id}</span>
                                    {entry.is_instructor_review && (
                                        <span className="text-xs text-purple-600">👨‍🏫 Instructor</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">{entry.match_score}%</span>
                                    {entry.detection_layer && (
                                        <span className="text-xs text-gray-400">{entry.detection_layer}</span>
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
