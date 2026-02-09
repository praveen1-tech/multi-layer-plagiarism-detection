import React from 'react';
import FeedbackPanel from './FeedbackPanel';

const Results = ({ result, username, userRole, submittedText }) => {
    if (!result) return null;

    // Safely get values with defaults
    const maxScore = result.max_score ?? 0;
    const matches = result.matches ?? [];
    const stylometry = result.stylometry;
    const isCrossUserDetection = result.cross_user_detection ?? false;
    const totalDocsChecked = result.total_documents_checked ?? null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">Analysis Results</h3>
                {isCrossUserDetection && (
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Cross-User Detection
                    </span>
                )}
            </div>

            {/* Cross-user detection info */}
            {isCrossUserDetection && totalDocsChecked !== null && (
                <p className="text-sm text-gray-500 mb-4">
                    Checked against {totalDocsChecked} document(s) from other users
                </p>
            )}

            <div className="flex items-center justify-between mb-6">
                <span className="text-gray-600">Max Plagiarism Score:</span>
                <span className={`text-2xl font-bold ${maxScore > 50 ? 'text-red-600' :
                    maxScore > 20 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {maxScore.toFixed(1)}%
                </span>
            </div>

            {matches.length > 0 ? (
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 border-b pb-2">Top Matches:</h4>
                    {matches.map((match, index) => (
                        <div key={index} className={`p-4 rounded border ${isCrossUserDetection ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-500">
                                        Source: {match.doc_id}
                                    </span>
                                    {/* Show owner email for cross-user detection */}
                                    {isCrossUserDetection && match.owner_email && (
                                        <span className="text-xs text-indigo-600">
                                            Owner: {match.owner_email}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-red-500">{(match.score ?? 0).toFixed(1)}% Match</span>
                            </div>

                            {/* Cross-language indicator */}
                            {match.is_cross_language && (
                                <span className="inline-block mb-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                                    Cross-Language Match ({match.language?.code || 'unknown'})
                                </span>
                            )}

                            <p className="text-gray-700 text-sm italic">"{match.snippet}"</p>

                            {/* Self-Learning Feedback Panel */}
                            <FeedbackPanel
                                docId={match.doc_id}
                                matchScore={match.score}
                                submittedText={submittedText || ''}
                                username={username}
                                userRole={userRole}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-green-600">
                    {isCrossUserDetection
                        ? "No matches found against other users' documents."
                        : "No significant plagiarism detected."
                    }
                </p>
            )}

            {/* Stylometry Section */}
            {stylometry && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-3">Writing Style Analysis (Stylometry)</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {stylometry.avg_word_length !== undefined && (
                            <div className="bg-blue-50 p-3 rounded">
                                <span className="text-gray-600">Avg Word Length:</span>
                                <span className="ml-2 font-bold text-blue-700">{stylometry.avg_word_length.toFixed(2)}</span>
                            </div>
                        )}
                        {stylometry.avg_sentence_length !== undefined && (
                            <div className="bg-blue-50 p-3 rounded">
                                <span className="text-gray-600">Avg Sentence Length:</span>
                                <span className="ml-2 font-bold text-blue-700">{stylometry.avg_sentence_length.toFixed(2)}</span>
                            </div>
                        )}
                        {stylometry.vocabulary_richness !== undefined && (
                            <div className="bg-blue-50 p-3 rounded">
                                <span className="text-gray-600">Vocabulary Richness:</span>
                                <span className="ml-2 font-bold text-blue-700">{(stylometry.vocabulary_richness * 100).toFixed(1)}%</span>
                            </div>
                        )}
                        {stylometry.punctuation_frequency !== undefined && (
                            <div className="bg-blue-50 p-3 rounded">
                                <span className="text-gray-600">Punctuation Frequency:</span>
                                <span className="ml-2 font-bold text-blue-700">{(stylometry.punctuation_frequency * 100).toFixed(2)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Results;
