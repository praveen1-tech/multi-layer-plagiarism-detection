import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const AdminDashboard = ({ username }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({
        high_risk: true,
        medium_risk: true,
        normal_risk: false,
        clean: false
    });

    useEffect(() => {
        fetchDashboardData();
    }, [username]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(`${API_BASE}/admin/dashboard`, {
                headers: { 'X-Username': username }
            });
            setDashboardData(response.data);
        } catch (err) {
            if (err.response?.status === 403) {
                setError('Admin access required. You do not have permission to view this dashboard.');
            } else {
                setError('Failed to load dashboard data.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const getCategoryConfig = (category) => {
        const configs = {
            high_risk: {
                label: 'High Risk',
                emoji: '🔴',
                range: '> 80%',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-300',
                headerBg: 'bg-red-100',
                textColor: 'text-red-800',
                badgeColor: 'bg-red-600'
            },
            medium_risk: {
                label: 'Medium Risk',
                emoji: '🟠',
                range: '50% - 80%',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-300',
                headerBg: 'bg-orange-100',
                textColor: 'text-orange-800',
                badgeColor: 'bg-orange-500'
            },
            normal_risk: {
                label: 'Normal Risk',
                emoji: '🟡',
                range: '20% - 50%',
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-300',
                headerBg: 'bg-yellow-100',
                textColor: 'text-yellow-800',
                badgeColor: 'bg-yellow-500'
            },
            clean: {
                label: 'Clean',
                emoji: '🟢',
                range: '< 20%',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-300',
                headerBg: 'bg-green-100',
                textColor: 'text-green-800',
                badgeColor: 'bg-green-600'
            }
        };
        return configs[category];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Loading dashboard...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
                <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            </div>
        );
    }

    const { summary, risk_categories, category_counts } = dashboardData;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📊 Admin Dashboard</h2>
                <button
                    onClick={fetchDashboardData}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-sm"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-indigo-700">{summary.total_users}</p>
                    <p className="text-sm text-gray-600">Total Users</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700">{summary.total_checks}</p>
                    <p className="text-sm text-gray-600">Total Checks</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-700">{summary.average_score}%</p>
                    <p className="text-sm text-gray-600">Avg Score</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700">{summary.highest_score}%</p>
                    <p className="text-sm text-gray-600">Highest Score</p>
                </div>
            </div>

            {/* Risk Category Distribution */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-3">Risk Distribution</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-red-500"></span>
                        <span className="text-sm">High: {category_counts.high_risk}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-orange-500"></span>
                        <span className="text-sm">Medium: {category_counts.medium_risk}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
                        <span className="text-sm">Normal: {category_counts.normal_risk}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-green-500"></span>
                        <span className="text-sm">Clean: {category_counts.clean}</span>
                    </div>
                </div>
            </div>

            {/* Risk Categories */}
            <div className="space-y-4">
                {['high_risk', 'medium_risk', 'normal_risk', 'clean'].map(category => {
                    const config = getCategoryConfig(category);
                    const users = risk_categories[category];
                    const isExpanded = expandedCategories[category];

                    return (
                        <div key={category} className={`border ${config.borderColor} rounded-lg overflow-hidden`}>
                            <button
                                onClick={() => toggleCategory(category)}
                                className={`w-full ${config.headerBg} px-4 py-3 flex items-center justify-between ${config.textColor} font-semibold`}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{config.emoji}</span>
                                    <span>{config.label}</span>
                                    <span className="text-sm font-normal">({config.range})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`${config.badgeColor} text-white px-2 py-0.5 rounded-full text-sm`}>
                                        {users.length} users
                                    </span>
                                    <span>{isExpanded ? '▼' : '▶'}</span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className={`${config.bgColor} p-4`}>
                                    {users.length === 0 ? (
                                        <p className="text-gray-500 text-sm italic">No users in this category</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-600 border-b">
                                                        <th className="pb-2">Email</th>
                                                        <th className="pb-2">Highest Score</th>
                                                        <th className="pb-2">Total Checks</th>
                                                        <th className="pb-2">Role</th>
                                                        <th className="pb-2">Joined</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.map((user, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200 last:border-0">
                                                            <td className="py-2 font-medium">{user.email}</td>
                                                            <td className="py-2">
                                                                <span className={`${config.badgeColor} text-white px-2 py-0.5 rounded text-xs`}>
                                                                    {user.highest_score.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2">{user.total_checks}</td>
                                                            <td className="py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                                                                    }`}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-gray-500">{formatDate(user.created_at)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboard;
