import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const UserProfile = ({ username, onLogout, activePanel }) => {
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
        fetchActivities();
    }, [username]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_BASE}/user/profile/${encodeURIComponent(username)}`);
            setProfile(response.data);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const response = await axios.get(`${API_BASE}/user/activities/${encodeURIComponent(username)}`);
            setActivities(response.data.activities);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'text_check': return '📝';
            case 'file_check': return '📁';
            case 'reference_add': return '➕';
            case 'reference_delete': return '🗑️';
            default: return '📋';
        }
    };

    const getActivityLabel = (type) => {
        switch (type) {
            case 'text_check': return 'Text Analysis';
            case 'file_check': return 'File Analysis';
            case 'reference_add': return 'Added References';
            case 'reference_delete': return 'Deleted Reference';
            default: return type;
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    if (loading) {
        return (
            <div className="glass-card">
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
            </div>
        );
    }

    // Show Profile stats
    if (activePanel === 'profile') {
        return (
            <div className="glass-card">
                <div className="glass-card-title">
                    <span className="icon">👤</span> Profile — {username}
                </div>

                {profile?.stats && (
                    <div className="profile-stats-grid">
                        <div className="profile-stat-item blue">
                            <span className="stat-value">{profile.stats.text_checks}</span>
                            <span className="stat-label">Text Checks</span>
                        </div>
                        <div className="profile-stat-item green">
                            <span className="stat-value">{profile.stats.file_checks}</span>
                            <span className="stat-label">File Checks</span>
                        </div>
                        <div className="profile-stat-item purple">
                            <span className="stat-value">{profile.stats.references_added}</span>
                            <span className="stat-label">Refs Added</span>
                        </div>
                        <div className="profile-stat-item orange">
                            <span className="stat-value">{profile.stats.highest_plagiarism_score.toFixed(1)}%</span>
                            <span className="stat-label">Highest Score</span>
                        </div>
                    </div>
                )}

                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
            </div>
        );
    }

    // Show Activity history
    if (activePanel === 'activity') {
        return (
            <div className="glass-card">
                <div className="glass-card-title">
                    <span className="icon">🕐</span> Activity History ({activities.length})
                </div>

                <div className="activity-list">
                    {activities.length === 0 ? (
                        <p className="empty-state">No activities yet. Start by analyzing some text!</p>
                    ) : (
                        activities.map((activity, idx) => (
                            <div key={idx} className="activity-item">
                                <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                                <div className="activity-content">
                                    <div className="activity-header">
                                        <span className="activity-type">{getActivityLabel(activity.type)}</span>
                                        <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                                    </div>
                                    <div className="activity-detail">
                                        {activity.type === 'text_check' && (
                                            <span>Score: {activity.details.max_score?.toFixed(1) || 0}% • {activity.details.matches_found || 0} matches</span>
                                        )}
                                        {activity.type === 'file_check' && (
                                            <span>{activity.details.file_count || 0} file(s) analyzed</span>
                                        )}
                                        {activity.type === 'reference_add' && (
                                            <span>Added {activity.details.count || 0} reference(s)</span>
                                        )}
                                        {activity.type === 'reference_delete' && (
                                            <span>
                                                {activity.details.type === 'clear_all'
                                                    ? `Cleared ${activity.details.count} references`
                                                    : `Deleted: ${activity.details.doc_id}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default UserProfile;
