import React, { useState } from 'react';

/**
 * DetailedFeedbackModal - Modal for submitting fine-grained feedback
 */
const DetailedFeedbackModal = ({ isOpen, onClose, onSubmit, docId, matchScore, submitting }) => {
    const [feedbackType, setFeedbackType] = useState('confirmed');
    const [severity, setSeverity] = useState(matchScore || 50);
    const [detectionLayer, setDetectionLayer] = useState('');
    const [confidenceOverride, setConfidenceOverride] = useState('');
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit({
            feedback_type: feedbackType,
            severity: severity,
            detection_layer: detectionLayer || null,
            confidence_override: confidenceOverride ? parseInt(confidenceOverride) : null,
            notes: notes || null
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Detailed Feedback</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Document Info */}
                    <div className="bg-gray-50 p-2 rounded text-sm">
                        <span className="text-gray-500">Document:</span>
                        <span className="ml-2 font-medium">{docId}</span>
                        <span className="ml-4 text-gray-500">Score:</span>
                        <span className="ml-2 font-medium text-red-600">{matchScore}%</span>
                    </div>

                    {/* Feedback Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFeedbackType('false_positive')}
                                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition ${feedbackType === 'false_positive'
                                        ? 'bg-orange-100 border-orange-400 text-orange-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                False Positive
                            </button>
                            <button
                                type="button"
                                onClick={() => setFeedbackType('confirmed')}
                                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition ${feedbackType === 'confirmed'
                                        ? 'bg-red-100 border-red-400 text-red-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Confirmed Plagiarism
                            </button>
                        </div>
                    </div>

                    {/* Severity Slider */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Severity: <span className="font-bold">{severity}%</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={severity}
                            onChange={(e) => setSeverity(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Minor</span>
                            <span>Moderate</span>
                            <span>Severe</span>
                        </div>
                    </div>

                    {/* Detection Layer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Which detection layer was incorrect? <span className="text-gray-400">(optional)</span>
                        </label>
                        <select
                            value={detectionLayer}
                            onChange={(e) => setDetectionLayer(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Select Layer --</option>
                            <option value="semantic">Semantic Similarity</option>
                            <option value="stylometry">Stylometry Analysis</option>
                            <option value="cross_lang">Cross-Language Detection</option>
                            <option value="paraphrase">Paraphrase Detection</option>
                        </select>
                    </div>

                    {/* Confidence Override */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Suggested Confidence <span className="text-gray-400">(optional, 0-100)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={confidenceOverride}
                            onChange={(e) => setConfidenceOverride(e.target.value)}
                            placeholder="e.g., 75"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes <span className="text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional context or explanation..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`px-4 py-2 rounded font-medium transition ${submitting
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailedFeedbackModal;
