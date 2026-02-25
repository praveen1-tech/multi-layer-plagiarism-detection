import React, { useState } from 'react';

function ForgotPassword({ onBackToSignIn, API_BASE }) {
    const [step, setStep] = useState('request'); // 'request', 'reset', 'success'
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/user/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to request password reset');
            }

            if (data.reset_token) {
                setResetToken(data.reset_token);
                setMessage('Reset token generated! Enter your new password below.');
                setStep('reset');
            } else {
                setMessage(data.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/user/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: resetToken,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to reset password');
            }

            setStep('success');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Success screen
    if (step === 'success') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-blob-header">
                        <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                            <path d="M0,0 L0,100 Q80,140 160,100 Q240,60 320,90 Q360,105 400,80 L400,0 Z" fill="#10b981" opacity="0.9" />
                            <path d="M0,0 L0,80 Q100,120 200,80 Q300,40 400,60 L400,0 Z" fill="#34d399" opacity="0.6" />
                        </svg>
                        <div className="circle circle-1" style={{ background: 'rgba(16, 185, 129, 0.8)' }}></div>
                        <div className="circle circle-2" style={{ background: 'rgba(16, 185, 129, 0.6)' }}></div>
                        <div className="circle circle-3" style={{ background: 'rgba(52, 211, 153, 0.5)' }}></div>
                    </div>
                    <div className="auth-body" style={{ textAlign: 'center' }}>
                        <h1 className="auth-title" style={{ fontSize: '24px' }}>Password Reset!</h1>
                        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
                            Your password has been updated successfully.
                        </p>
                        <button
                            className="auth-btn-filled full-width"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            onClick={onBackToSignIn}
                        >
                            Sign In with New Password
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Reset password form (step 2)
    if (step === 'reset') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-blob-header">
                        <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                            <path d="M0,0 L0,100 Q80,140 160,100 Q240,60 320,90 Q360,105 400,80 L400,0 Z" fill="#f59e0b" opacity="0.9" />
                            <path d="M0,0 L0,80 Q100,120 200,80 Q300,40 400,60 L400,0 Z" fill="#fbbf24" opacity="0.6" />
                        </svg>
                        <div className="circle circle-1" style={{ background: 'rgba(245, 158, 11, 0.8)' }}></div>
                        <div className="circle circle-2" style={{ background: 'rgba(245, 158, 11, 0.6)' }}></div>
                        <div className="circle circle-3" style={{ background: 'rgba(251, 191, 36, 0.5)' }}></div>
                    </div>
                    <div className="auth-body">
                        <h1 className="auth-title" style={{ fontSize: '24px' }}>New Password</h1>

                        {message && <div className="auth-success">{message}</div>}

                        <form onSubmit={handleResetPassword}>
                            <div className="auth-field">
                                <label>New Password</label>
                                <div className="input-wrapper">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label>Confirm New Password</label>
                                <div className={`input-wrapper ${confirmPassword && newPassword !== confirmPassword ? 'error' : ''}`}>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat your new password"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="mismatch-text">Passwords don't match</p>
                                )}
                            </div>

                            {error && <div className="auth-error">{error}</div>}

                            <div style={{ textAlign: 'center' }}>
                                <button
                                    type="submit"
                                    className="auth-btn-filled full-width"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                    disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
                                >
                                    {loading ? (
                                        <><span className="spinner"></span>Resetting...</>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="auth-back">
                            <button onClick={onBackToSignIn}>← Back to Sign In</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Request reset form (step 1)
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-blob-header">
                    <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                        <path d="M0,0 L0,100 Q80,140 160,100 Q240,60 320,90 Q360,105 400,80 L400,0 Z" fill="#6c63ff" opacity="0.9" />
                        <path d="M0,0 L0,80 Q100,120 200,80 Q300,40 400,60 L400,0 Z" fill="#7c6dfa" opacity="0.6" />
                    </svg>
                    <div className="circle circle-1"></div>
                    <div className="circle circle-2"></div>
                    <div className="circle circle-3"></div>
                </div>
                <div className="auth-body">
                    <h1 className="auth-title" style={{ fontSize: '24px' }}>Forgot Password?</h1>
                    <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '13px' }}>
                        Enter your email to reset your password
                    </p>

                    <form onSubmit={handleRequestReset}>
                        <div className="auth-field">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        {error && <div className="auth-error">{error}</div>}
                        {message && !error && <div className="auth-success">{message}</div>}

                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="submit"
                                className="auth-btn-filled full-width"
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner"></span>Sending...</>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="auth-back">
                        <button onClick={onBackToSignIn}>← Back to Sign In</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
