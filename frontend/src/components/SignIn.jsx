import React, { useState } from 'react';

function SignIn({ onLogin, onSwitchToSignUp, onForgotPassword, error, setError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onLogin(email.trim().toLowerCase(), password);
        } catch (err) {
            // Error handled in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Purple blob header */}
                <div className="auth-blob-header">
                    <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                        <path
                            d="M0,0 L0,100 Q80,140 160,100 Q240,60 320,90 Q360,105 400,80 L400,0 Z"
                            fill="#6c63ff"
                            opacity="0.9"
                        />
                        <path
                            d="M0,0 L0,80 Q100,120 200,80 Q300,40 400,60 L400,0 Z"
                            fill="#7c6dfa"
                            opacity="0.6"
                        />
                    </svg>
                    <div className="circle circle-1"></div>
                    <div className="circle circle-2"></div>
                    <div className="circle circle-3"></div>
                </div>

                {/* Form body */}
                <div className="auth-body">
                    <p className="auth-welcome">Welcome!</p>
                    <h1 className="auth-title">Login</h1>

                    <form onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@gmail.com"
                                    required
                                    autoFocus
                                />
                                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    minLength={6}
                                />
                                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                        </div>

                        <div className="auth-forgot">
                            <button type="button" onClick={onForgotPassword}>
                                Forgot Password?
                            </button>
                        </div>

                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        <div className="auth-buttons">
                            <button
                                type="button"
                                className="auth-btn-outline"
                                onClick={onSwitchToSignUp}
                            >
                                Sign Up
                            </button>
                            <button
                                type="submit"
                                className="auth-btn-filled"
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner"></span>Logging In...</>
                                ) : (
                                    'Log In'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default SignIn;
