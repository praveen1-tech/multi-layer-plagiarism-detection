import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

/**
 * FeedbackPanel - Self-Learning Feedback Component
 * Allows users to mark detection results as false positives or confirmed plagiarism
 */
const FeedbackPanel = ({ docId, matchScore, submittedText, username, onFeedbackSubmit }) => {
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [feedbackType, setFeedbackType] = useState(null);
    const [error, setError] = useState('');

    const submitFeedback = async (type) => {
        if (status === 'submitting' || status === 'success') return;

        setStatus('submitting');
        setError('');

        try {
            await axios.post(`${API_BASE}/feedback`, {
                doc_id: docId,
                submitted_text: submittedText,
                match_score: matchScore,
                feedback_type: type
            }, {
                headers: { 'X-Username': username || '' }
            });

            setStatus('success');
            setFeedbackType(type);
            if (onFeedbackSubmit) {
                onFeedbackSubmit(type);
            }
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.detail || 'Failed to submit feedback');
            console.error('Feedback error:', err);
        }
    };

    // Already submitted
    if (status === 'success') {
        return (
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded border border-green-200">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700">
                    Feedback recorded: {feedbackType === 'false_positive' ? 'False Positive' : 'Confirmed Plagiarism'}
                </span>
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Help improve detection accuracy:</p>
            <div className="flex gap-2">
                <button
                    onClick={() => submitFeedback('false_positive')}
                    disabled={status === 'submitting'}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition
                        ${status === 'submitting'
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    False Positive
                </button>
                <button
                    onClick={() => submitFeedback('confirmed')}
                    disabled={status === 'submitting'}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition
                        ${status === 'submitting'
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmed
                </button>
            </div>
            {status === 'error' && (
                <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
        </div>
    );
};

export default FeedbackPanel;
