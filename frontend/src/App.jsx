import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadForm from './components/UploadForm';
import Results from './components/Results';
import UserProfile from './components/UserProfile';
import FeedbackDashboard from './components/FeedbackDashboard';
import AdminDashboard from './components/AdminDashboard';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';

const API_BASE = 'http://localhost:8000';

function App() {
  const [result, setResult] = useState(null);
  const [submittedText, setSubmittedText] = useState('');
  const [references, setReferences] = useState([]);
  const [showReferences, setShowReferences] = useState(false);
  const [viewingReference, setViewingReference] = useState(null);

  // User state
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [authMode, setAuthMode] = useState('signin');
  const [authError, setAuthError] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Navbar panel state
  const [activePanel, setActivePanel] = useState(null); // null | 'activity' | 'profile'

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const fetchReferences = async () => {
    try {
      const response = await axios.get(`${API_BASE}/list_references`);
      setReferences(response.data.references);
    } catch (err) {
      console.error('Failed to fetch references:', err);
    }
  };

  const clearReferences = async () => {
    try {
      await axios.delete(`${API_BASE}/clear_references`, {
        headers: { 'X-Username': userEmail }
      });
      setReferences([]);
    } catch (err) {
      console.error('Failed to clear references:', err);
    }
  };

  const deleteReference = async (docId) => {
    try {
      await axios.delete(`${API_BASE}/delete_reference/${encodeURIComponent(docId)}`, {
        headers: { 'X-Username': userEmail }
      });
      setReferences(references.filter(ref => ref.doc_id !== docId));
    } catch (err) {
      console.error('Failed to delete reference:', err);
    }
  };

  const openReference = async (docId) => {
    try {
      const response = await axios.get(`${API_BASE}/reference/${encodeURIComponent(docId)}`);
      setViewingReference(response.data);
    } catch (err) {
      console.error('Failed to open reference:', err);
    }
  };

  const closeReferenceModal = () => {
    setViewingReference(null);
  };

  // Check token on mount and restore session
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await axios.get(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setUserEmail(response.data.user.email);
          setUserRole(response.data.user.role || 'user');
          setAuthToken(token);

          try {
            const adminCheck = await axios.get(`${API_BASE}/admin/check`, {
              headers: { 'X-Username': response.data.user.email }
            });
            setIsAdmin(adminCheck.data.is_admin);
          } catch {
            setIsAdmin(false);
          }
        } catch {
          localStorage.removeItem('authToken');
          setAuthToken('');
        }
      }
    };
    checkToken();
    fetchReferences();
  }, []);

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const response = await axios.post(`${API_BASE}/user/login`, { email, password });
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      setAuthToken(token);
      setUserEmail(user.email);
      setUserRole(user.role || 'user');

      try {
        const adminCheck = await axios.get(`${API_BASE}/admin/check`, {
          headers: { 'X-Username': user.email }
        });
        setIsAdmin(adminCheck.data.is_admin);
        if (adminCheck.data.is_admin) {
          setShowAdminDashboard(true);
        }
      } catch {
        setIsAdmin(false);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      if (Array.isArray(errorMsg)) {
        setAuthError(errorMsg[0]?.msg || 'Invalid credentials');
      } else {
        setAuthError(errorMsg || 'Failed to login. Please try again.');
      }
      throw err;
    }
  };

  const handleRegister = async (email, password, confirmPassword) => {
    setAuthError('');
    try {
      const response = await axios.post(`${API_BASE}/user/register`, {
        email,
        password,
        confirm_password: confirmPassword
      });
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      setAuthToken(token);
      setUserEmail(user.email);
      setUserRole(user.role || 'user');
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      if (Array.isArray(errorMsg)) {
        setAuthError(errorMsg[0]?.msg || 'Registration failed');
      } else {
        setAuthError(errorMsg || 'Failed to register. Please try again.');
      }
      throw err;
    }
  };

  const handleLogout = () => {
    setUserEmail('');
    setUserRole('user');
    setIsAdmin(false);
    setAuthToken('');
    localStorage.removeItem('authToken');
    setResult(null);
    setShowAdminDashboard(false);
    setAuthMode('signin');
    setActivePanel(null);
  };

  // Auth Screen
  if (!userEmail) {
    if (authMode === 'signup') {
      return (
        <SignUp
          onRegister={handleRegister}
          onSwitchToSignIn={() => { setAuthMode('signin'); setAuthError(''); }}
          error={authError}
          setError={setAuthError}
        />
      );
    }
    if (authMode === 'forgot-password') {
      return (
        <ForgotPassword
          onBackToSignIn={() => { setAuthMode('signin'); setAuthError(''); }}
          API_BASE={API_BASE}
        />
      );
    }
    return (
      <SignIn
        onLogin={handleLogin}
        onSwitchToSignUp={() => { setAuthMode('signup'); setAuthError(''); }}
        onForgotPassword={() => { setAuthMode('forgot-password'); setAuthError(''); }}
        error={authError}
        setError={setAuthError}
      />
    );
  }

  return (
    <div>
      {/* ===== TOP NAVBAR ===== */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <div className="navbar-avatar">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="navbar-username">{userEmail}</span>
        </div>
        <div className="navbar-right">
          {isAdmin && (
            <button
              className={`navbar-btn admin-btn ${showAdminDashboard ? 'active' : ''}`}
              onClick={() => setShowAdminDashboard(!showAdminDashboard)}
            >
              📊 Admin
            </button>
          )}
          <button
            className={`navbar-btn ${activePanel === 'activity' ? 'active' : ''}`}
            onClick={() => togglePanel('activity')}
          >
            Activity
          </button>
          <button
            className={`navbar-btn ${activePanel === 'profile' ? 'active' : ''}`}
            onClick={() => togglePanel('profile')}
          >
            Profile
          </button>
          <button className="navbar-btn logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Reference Viewer Modal */}
      {viewingReference && (
        <div className="modal-overlay" onClick={closeReferenceModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{viewingReference.doc_id}</h3>
              <button className="modal-close" onClick={closeReferenceModal}>✕</button>
            </div>
            <div className="modal-body">
              <pre>{viewingReference.text}</pre>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" style={{ width: 'auto', marginTop: 0 }} onClick={closeReferenceModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Profile/Activity Panel */}
      {activePanel && (
        <div className="collapsible-panel">
          <UserProfile
            username={userEmail}
            onLogout={handleLogout}
            activePanel={activePanel}
          />
        </div>
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && isAdmin && (
        <div className="collapsible-panel">
          <AdminDashboard username={userEmail} />
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-container">
        {/* Page Title */}
        <div className="page-title">
          <h1>Plagiarism Detection</h1>
          <p>Powered by Semantic AI &amp; Stylometry</p>
        </div>

        {/* Reference Documents Section */}
        <div className="references-section">
          <div className="glass-card">
            <div className="references-header">
              <div className="references-header-left">
                <span className="glass-card-title" style={{ marginBottom: 0 }}>
                  <span className="icon">📚</span> Reference Documents
                </span>
                <span className="ref-count-badge">{references.length} loaded</span>
              </div>
              <div className="references-header-right">
                <button className="ref-btn show" onClick={() => setShowReferences(!showReferences)}>
                  {showReferences ? 'Hide' : 'Show'}
                </button>
                {references.length > 0 && (
                  <button className="ref-btn clear" onClick={clearReferences}>
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {showReferences && references.length > 0 && (
              <div className="ref-list">
                {references.map((ref, idx) => (
                  <div key={idx} className="ref-item">
                    <div style={{ flex: 1, minWidth: 0 }} onClick={() => openReference(ref.doc_id)}>
                      <div className="ref-item-name">{ref.doc_id}</div>
                      <div className="ref-item-preview">{ref.preview}</div>
                    </div>
                    <div className="ref-item-actions">
                      <button
                        className="ref-action-btn view"
                        onClick={() => openReference(ref.doc_id)}
                        title="View full content"
                      >
                        👁
                      </button>
                      <button
                        className="ref-action-btn delete"
                        onClick={() => deleteReference(ref.doc_id)}
                        title={`Delete ${ref.doc_id}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showReferences && references.length === 0 && (
              <p className="empty-state">No reference documents loaded. Upload files using the Reference Check panel below.</p>
            )}
          </div>
        </div>

        {/* Upload Form — Two Column Layout */}
        <UploadForm
          onResult={(data) => { setResult(data); }}
          onFileResults={setResult}
          onReferencesUpdated={fetchReferences}
          username={userEmail}
          onTextSubmit={setSubmittedText}
        />

        {/* Results */}
        {Array.isArray(result) ? (
          <div className="results-section">
            {result.map((res, idx) => (
              <div key={idx} className="multi-file-result">
                <div className="file-header">
                  📄 {res.filename || `File ${idx + 1}`}
                </div>
                {res.error ? (
                  <p className="error-message">{res.error}</p>
                ) : (
                  <Results result={res.result} username={userEmail} userRole={userRole} submittedText={submittedText} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <Results result={result} username={userEmail} userRole={userRole} submittedText={submittedText} />
        )}

        {/* Learning Dashboard Toggle - Admin Only */}
        {userEmail && userRole === 'admin' && (
          <div style={{ marginTop: '24px' }}>
            <button
              className={`navbar-btn ${showDashboard ? 'active' : ''}`}
              style={{ width: '100%', padding: '12px' }}
              onClick={() => setShowDashboard(!showDashboard)}
            >
              📈 {showDashboard ? 'Hide Learning Dashboard' : 'Show Learning Dashboard'}
            </button>
          </div>
        )}

        {showDashboard && (
          <FeedbackDashboard username={userEmail} userRole={userRole} />
        )}
      </div>
    </div>
  );
}

export default App;
