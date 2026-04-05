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
                color: 'var(--accent-red)',
                bg: 'rgba(239, 68, 68, 0.1)',
                bgHeader: 'rgba(239, 68, 68, 0.15)',
                border: 'rgba(239, 68, 68, 0.3)',
            },
            medium_risk: {
                label: 'Medium Risk',
                emoji: '🟠',
                range: '50% - 80%',
                color: '#f97316',
                bg: 'rgba(249, 115, 22, 0.1)',
                bgHeader: 'rgba(249, 115, 22, 0.15)',
                border: 'rgba(249, 115, 22, 0.3)',
            },
            normal_risk: {
                label: 'Normal Risk',
                emoji: '🟡',
                range: '20% - 50%',
                color: 'var(--accent-yellow)',
                bg: 'rgba(245, 158, 11, 0.1)',
                bgHeader: 'rgba(245, 158, 11, 0.15)',
                border: 'rgba(245, 158, 11, 0.3)',
            },
            clean: {
                label: 'Clean',
                emoji: '🟢',
                range: '< 20%',
                color: 'var(--accent-green)',
                bg: 'rgba(16, 185, 129, 0.1)',
                bgHeader: 'rgba(16, 185, 129, 0.15)',
                border: 'rgba(16, 185, 129, 0.3)',
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
            <div className="glass-card">
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                    <span className="spinner"></span> Loading dashboard...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card">
                <p className="error-message">{error}</p>
            </div>
        );
    }

    const { summary, risk_categories, category_counts } = dashboardData;

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <div className="admin-header">
                <div className="glass-card-title">
                    <span className="icon">📊</span> Admin Dashboard
                </div>
                <button className="admin-refresh-btn" onClick={fetchDashboardData}>
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <span className="admin-stat-value" style={{ color: 'var(--accent-indigo)' }}>{summary.total_users}</span>
                    <span className="admin-stat-label">Total Users</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-value" style={{ color: 'var(--accent-blue)' }}>{summary.total_checks}</span>
                    <span className="admin-stat-label">Total Checks</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-value" style={{ color: 'var(--accent-purple)' }}>{summary.average_score}%</span>
                    <span className="admin-stat-label">Avg Score</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-value" style={{ color: 'var(--accent-red)' }}>{summary.highest_score}%</span>
                    <span className="admin-stat-label">Highest Score</span>
                </div>
            </div>

            {/* Risk Distribution Bar */}
            <div className="admin-risk-bar-section">
                <div className="admin-section-title">Risk Distribution</div>
                <div className="admin-risk-legend">
                    {[
                        { key: 'high_risk', color: 'var(--accent-red)', label: 'High' },
                        { key: 'medium_risk', color: '#f97316', label: 'Medium' },
                        { key: 'normal_risk', color: 'var(--accent-yellow)', label: 'Normal' },
                        { key: 'clean', color: 'var(--accent-green)', label: 'Clean' },
                    ].map(item => (
                        <div key={item.key} className="admin-risk-legend-item">
                            <span className="admin-risk-dot" style={{ background: item.color }}></span>
                            <span>{item.label}: {category_counts[item.key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Risk Categories */}
            <div className="admin-categories">
                {['high_risk', 'medium_risk', 'normal_risk', 'clean'].map(category => {
                    const config = getCategoryConfig(category);
                    const users = risk_categories[category];
                    const isExpanded = expandedCategories[category];

                    return (
                        <div key={category} className="admin-category" style={{ borderColor: config.border }}>
                            <button
                                className="admin-category-header"
                                onClick={() => toggleCategory(category)}
                                style={{ background: config.bgHeader }}
                            >
                                <div className="admin-category-left">
                                    <span>{config.emoji}</span>
                                    <span style={{ color: config.color, fontWeight: 600 }}>{config.label}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({config.range})</span>
                                </div>
                                <div className="admin-category-right">
                                    <span className="admin-badge" style={{ background: config.color }}>
                                        {users.length} users
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>{isExpanded ? '▼' : '▶'}</span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="admin-category-body" style={{ background: config.bg }}>
                                    {users.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '8px 0' }}>
                                            No users in this category
                                        </p>
                                    ) : (
                                        <div className="admin-table-wrapper">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Email</th>
                                                        <th>Highest Score</th>
                                                        <th>Total Checks</th>
                                                        <th>Role</th>
                                                        <th>Joined</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.map((user, idx) => (
                                                        <tr key={idx}>
                                                            <td className="admin-td-email">{user.email}</td>
                                                            <td>
                                                                <span className="admin-score-badge" style={{ background: config.color }}>
                                                                    {user.highest_score.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td>{user.total_checks}</td>
                                                            <td>
                                                                <span className={`admin-role-badge ${user.role === 'admin' ? 'admin-role' : ''}`}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                            <td className="admin-td-date">{formatDate(user.created_at)}</td>
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
