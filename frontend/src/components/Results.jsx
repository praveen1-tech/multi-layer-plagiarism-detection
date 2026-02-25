import React from 'react';
import FeedbackPanel from './FeedbackPanel';

const Results = ({ result, username, userRole, submittedText }) => {
    if (!result) return null;

    const maxScore = result.max_score ?? 0;
    const matches = result.matches ?? [];
    const stylometry = result.stylometry;
    const isCrossUserDetection = result.cross_user_detection ?? false;
    const totalDocsChecked = result.total_documents_checked ?? null;

    // Gauge needle rotation: 0% = -90deg, 100% = 90deg
    const needleRotation = -90 + (maxScore / 100) * 180;

    const getScoreClass = (score) => {
        if (score > 50) return 'high';
        if (score > 20) return 'medium';
        return 'low';
    };

    return (
        <div className="results-section">
            {/* Section Title */}
            <div className="results-title">
                <span>📊</span>
                Analysis Result (Multi-Layer Analysis)
                {isCrossUserDetection && (
                    <span className="badge">Cross-User Detection</span>
                )}
            </div>

            {isCrossUserDetection && totalDocsChecked !== null && (
                <p className="cross-user-info">
                    Checked against {totalDocsChecked} document(s) from other users
                </p>
            )}

            {/* Top Row: Matches + Gauge */}
            <div className="results-grid-top">
                {/* Matches Card */}
                <div className="glass-card matches-card">
                    <div className="glass-card-title">
                        <span className="icon">🔍</span> Matches
                    </div>

                    {matches.length > 0 ? (
                        matches.map((match, index) => (
                            <div key={index} className="match-item">
                                <div className="match-header">
                                    <div>
                                        <div className="match-source">
                                            Source: {match.doc_id}
                                        </div>
                                        {isCrossUserDetection && match.owner_email && (
                                            <div className="match-owner">Owner: {match.owner_email}</div>
                                        )}
                                    </div>
                                    <span className={`match-score ${getScoreClass(match.score ?? 0)}`}>
                                        {(match.score ?? 0).toFixed(1)}%
                                    </span>
                                </div>

                                {match.is_cross_language && (
                                    <span className="cross-lang-badge">
                                        Cross-Language ({match.language?.code || 'unknown'})
                                    </span>
                                )}

                                <p className="match-snippet">"{match.snippet}"</p>

                                <FeedbackPanel
                                    docId={match.doc_id}
                                    matchScore={match.score}
                                    submittedText={submittedText || ''}
                                    username={username}
                                    userRole={userRole}
                                />
                            </div>
                        ))
                    ) : (
                        <p className="no-results">
                            {isCrossUserDetection
                                ? "No matches found against other users' documents."
                                : "No significant plagiarism detected."}
                        </p>
                    )}
                </div>

                {/* Plagiarism Score Gauge */}
                <div className="glass-card">
                    <div className="glass-card-title">
                        <span className="icon">🎯</span> Plagiarism Score
                    </div>

                    <div className="gauge-container">
                        <div className="gauge-wrapper">
                            <div className="gauge-bg"></div>
                            <div className="gauge-ticks">
                                <span className="t0">0</span>
                                <span className="t25">25</span>
                                <span className="t50">50</span>
                                <span className="t75">75</span>
                                <span className="t100">100</span>
                            </div>
                            <div
                                className="gauge-needle"
                                style={{ transform: `rotate(${needleRotation}deg)` }}
                            ></div>
                            <div className={`gauge-value ${getScoreClass(maxScore)}`}>
                                {maxScore.toFixed(1)}%
                            </div>
                        </div>
                        <span className="gauge-label">Overall Plagiarism Risk</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Semantic Similarity + Stylometric Analysis */}
            <div className="results-grid-bottom">
                {/* Semantic Similarity Score */}
                <div className="glass-card">
                    <div className="glass-card-title">
                        <span className="icon">🧠</span> Semantic Similarity Score
                    </div>

                    <div className="score-bar-container">
                        <div className="score-bar-label">
                            <span className="label">Max Similarity</span>
                            <span className={`value ${getScoreClass(maxScore)}`} style={{ color: maxScore > 50 ? 'var(--accent-red)' : maxScore > 20 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                                {maxScore.toFixed(1)}%
                            </span>
                        </div>
                        <div className="score-bar">
                            <div
                                className={`score-bar-fill ${getScoreClass(maxScore)}`}
                                style={{ width: `${Math.min(maxScore, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {matches.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <div className="score-bar-label">
                                <span className="label">Matches Found</span>
                                <span className="value" style={{ color: 'var(--text-accent)' }}>{matches.length}</span>
                            </div>
                            {matches.length > 0 && (
                                <div className="score-bar-label" style={{ marginTop: '8px' }}>
                                    <span className="label">Top Match</span>
                                    <span className="value" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                        {matches[0].doc_id}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stylometric Analysis */}
                <div className="glass-card">
                    <div className="glass-card-title">
                        <span className="icon">✍️</span> Stylometric Analysis
                    </div>

                    {stylometry ? (
                        <div className="stylometric-grid">
                            {stylometry.avg_word_length !== undefined && (
                                <div className="stylometric-item">
                                    <span className="value">{stylometry.avg_word_length.toFixed(2)}</span>
                                    <span className="label">Avg Word Length</span>
                                </div>
                            )}
                            {stylometry.avg_sentence_length !== undefined && (
                                <div className="stylometric-item">
                                    <span className="value">{stylometry.avg_sentence_length.toFixed(2)}</span>
                                    <span className="label">Avg Sentence Length</span>
                                </div>
                            )}
                            {stylometry.vocabulary_richness !== undefined && (
                                <div className="stylometric-item">
                                    <span className="value">{(stylometry.vocabulary_richness * 100).toFixed(1)}%</span>
                                    <span className="label">Vocabulary Richness</span>
                                </div>
                            )}
                            {stylometry.punctuation_frequency !== undefined && (
                                <div className="stylometric-item">
                                    <span className="value">{(stylometry.punctuation_frequency * 100).toFixed(2)}%</span>
                                    <span className="label">Punctuation Freq</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="empty-state">No stylometric data available. Submit text to see writing style analysis.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Results;
