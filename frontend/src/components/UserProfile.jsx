import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const UserProfile = ({ username, onLogout }) => {
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [showActivities, setShowActivities] = useState(false);
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

    const refreshData = () => {
        fetchProfile();
        fetchActivities();
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'text_check':
                return '📝';
            case 'file_check':
                return '📁';
            case 'reference_add':
                return '➕';
            case 'reference_delete':
                return '🗑️';
            default:
                return '📋';
        }
    };

    const getActivityLabel = (type) => {
        switch (type) {
            case 'text_check':
                return 'Text Analysis';
            case 'file_check':
                return 'File Analysis';
            case 'reference_add':
                return 'Added References';
            case 'reference_delete':
                return 'Deleted Reference';
            default:
                return type;
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-md max-w-2xl mx-auto mb-6">
                <p className="text-gray-500">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-md max-w-2xl mx-auto mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{username}</h3>
                        <p className="text-xs text-gray-500">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={refreshData}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        title="Refresh"
                    >
                        🔄
                    </button>
                    <button
                        onClick={onLogout}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            {profile?.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded text-center">
                        <p className="text-2xl font-bold text-blue-700">{profile.stats.text_checks}</p>
                        <p className="text-xs text-gray-600">Text Checks</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded text-center">
                        <p className="text-2xl font-bold text-green-700">{profile.stats.file_checks}</p>
                        <p className="text-xs text-gray-600">File Checks</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded text-center">
                        <p className="text-2xl font-bold text-purple-700">{profile.stats.references_added}</p>
                        <p className="text-xs text-gray-600">Refs Added</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded text-center">
                        <p className="text-2xl font-bold text-orange-700">{profile.stats.highest_plagiarism_score.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">Highest Score</p>
                    </div>
                </div>
            )}

            {/* Activity Toggle */}
            <div className="border-t pt-3">
                <button
                    onClick={() => setShowActivities(!showActivities)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                    {showActivities ? '▼' : '▶'} Activity History ({activities.length})
                </button>

                {showActivities && (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                        {activities.length === 0 ? (
                            <p className="text-gray-500 text-sm">No activities yet. Start by analyzing some text!</p>
                        ) : (
                            activities.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded border text-sm">
                                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-700">{getActivityLabel(activity.type)}</span>
                                            <span className="text-xs text-gray-400">{formatTimestamp(activity.timestamp)}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
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
                )}
            </div>
        </div>
    );
};

export default UserProfile;
