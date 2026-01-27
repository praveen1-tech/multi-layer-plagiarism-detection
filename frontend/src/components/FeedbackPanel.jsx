import React, { useState } from 'react';
import axios from 'axios';
import DetailedFeedbackModal from './DetailedFeedbackModal';

const API_BASE = 'http://localhost:8000';

/**
 * FeedbackPanel - Self-Learning Feedback Component
 * Allows users to mark detection results as false positives or confirmed plagiarism
 * with quick buttons or detailed feedback modal
 */
const FeedbackPanel = ({ docId, matchScore, submittedText, username, userRole, onFeedbackSubmit }) => {
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [feedbackType, setFeedbackType] = useState(null);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    const submitFeedback = async (type, detailedData = {}) => {
        if (status === 'submitting' || status === 'success') return;

        setStatus('submitting');
        setError('');

        try {
            await axios.post(`${API_BASE}/feedback`, {
                doc_id: docId,
                submitted_text: submittedText,
                match_score: matchScore,
                feedback_type: type,
                severity: detailedData.severity || Math.round(matchScore),
                detection_layer: detailedData.detection_layer || null,
                confidence_override: detailedData.confidence_override || null,
                notes: detailedData.notes || null
            }, {
                headers: { 'X-Username': username || '' }
            });

            setStatus('success');
            setFeedbackType(type);
            setShowModal(false);
            if (onFeedbackSubmit) {
                onFeedbackSubmit(type);
            }
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.detail || 'Failed to submit feedback');
            console.error('Feedback error:', err);
        }
    };

    const handleDetailedSubmit = (data) => {
        submitFeedback(data.feedback_type, data);
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

    const isInstructor = userRole === 'instructor' || userRole === 'admin';

    return (
        <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Help improve detection accuracy:</p>
                {isInstructor && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Instructor</span>
                )}
            </div>
            <div className="flex gap-2 flex-wrap">
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
                <button
                    onClick={() => setShowModal(true)}
                    disabled={status === 'submitting'}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition
                        ${status === 'submitting'
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Detailed
                </button>
            </div>
            {status === 'error' && (
                <p className="text-xs text-red-500 mt-2">{error}</p>
            )}

            <DetailedFeedbackModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleDetailedSubmit}
                docId={docId}
                matchScore={matchScore}
                submitting={status === 'submitting'}
            />
        </div>
    );
};

export default FeedbackPanel;

