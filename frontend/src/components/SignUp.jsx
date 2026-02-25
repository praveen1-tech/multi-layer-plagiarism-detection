import React, { useState } from 'react';

function SignUp({ onRegister, onSwitchToSignIn, error, setError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await onRegister(email.trim().toLowerCase(), password, confirmPassword);
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
                    <h1 className="auth-title">Sign up</h1>

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
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Confirm Password</label>
                            <div className={`input-wrapper ${confirmPassword && password !== confirmPassword ? 'error' : ''}`}>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="mismatch-text">Passwords don't match</p>
                            )}
                        </div>

                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="submit"
                                className="auth-btn-filled full-width"
                                disabled={loading || (confirmPassword && password !== confirmPassword)}
                            >
                                {loading ? (
                                    <><span className="spinner"></span>Creating...</>
                                ) : (
                                    'Sign Up'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="auth-switch">
                        <span>I am already a member</span>
                        <button onClick={onSwitchToSignIn}>Sign In</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignUp;
