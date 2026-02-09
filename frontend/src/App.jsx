import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadForm from './components/UploadForm';
import Results from './components/Results';
import UserProfile from './components/UserProfile';
import FeedbackDashboard from './components/FeedbackDashboard';
import AdminDashboard from './components/AdminDashboard';

const API_BASE = 'http://localhost:8000';

function App() {
  const [result, setResult] = useState(null);
  const [submittedText, setSubmittedText] = useState('');  // Track submitted text for feedback
  const [references, setReferences] = useState([]);
  const [showReferences, setShowReferences] = useState(false);
  const [viewingReference, setViewingReference] = useState(null);

  // User state
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [userRole, setUserRole] = useState('user');  // user/instructor/admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

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

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail) {
      setLoginError('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setLoginError('Please enter a valid email address (e.g., user@gmail.com)');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/user/login`, { email: trimmedEmail });
      setUserEmail(trimmedEmail);
      setUserRole(response.data.user?.role || 'user');
      localStorage.setItem('userEmail', trimmedEmail);
      setEmailInput('');

      // Check admin status
      try {
        const adminCheck = await axios.get(`${API_BASE}/admin/check`, {
          headers: { 'X-Username': trimmedEmail }
        });
        setIsAdmin(adminCheck.data.is_admin);
        // Auto-show admin dashboard for admin users
        if (adminCheck.data.is_admin) {
          setShowAdminDashboard(true);
        }
      } catch {
        setIsAdmin(false);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      if (Array.isArray(errorMsg)) {
        setLoginError(errorMsg[0]?.msg || 'Invalid email address');
      } else {
        setLoginError(errorMsg || 'Failed to login. Please try again.');
      }
      console.error('Login error:', err);
    }
  };

  const handleLogout = () => {
    setUserEmail('');
    setUserRole('user');
    setIsAdmin(false);
    localStorage.removeItem('userEmail');
    setResult(null);
    setShowAdminDashboard(false);
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  // Login Screen
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-blue-900">Welcome</h1>
            <p className="text-gray-600 mt-2">Plagiarism Detection Agent</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your email to continue
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-sm mb-4">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Continue
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your activities will be tracked under this username
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Reference Viewer Modal */}
      {viewingReference && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">{viewingReference.doc_id}</h3>
              <button
                onClick={closeReferenceModal}
                className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded border">
                {viewingReference.text}
              </pre>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={closeReferenceModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto text-center mb-6">
        <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">
          Plagiarism Detection Agent
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Powered by Semantic AI & Stylometry
        </p>
      </div>

      {/* User Profile Section */}
      <UserProfile username={userEmail} onLogout={handleLogout} />

      {/* Admin Dashboard Toggle - Admin Only */}
      {isAdmin && (
        <div className="max-w-2xl mx-auto mb-4">
          <button
            onClick={() => setShowAdminDashboard(!showAdminDashboard)}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${showAdminDashboard ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}
          >
            <span>📊</span>
            {showAdminDashboard ? 'Hide Admin Dashboard' : 'Open Admin Dashboard'}
          </button>
        </div>
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && isAdmin && (
        <AdminDashboard username={userEmail} />
      )}

      {/* Reference Documents Section */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-700">Reference Documents</h3>
              <span className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-full font-medium">
                {references.length} loaded
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReferences(!showReferences)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showReferences ? 'Hide' : 'Show'}
              </button>
              {references.length > 0 && (
                <button
                  onClick={clearReferences}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {showReferences && references.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {references.map((ref, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border text-sm flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 cursor-pointer hover:bg-gray-100 rounded p-1 -m-1 transition"
                    onClick={() => openReference(ref.doc_id)}
                    title="Click to view full content"
                  >
                    <span className="font-medium text-blue-600 hover:text-blue-800">{ref.doc_id}</span>
                    <p className="text-gray-500 text-xs mt-1 truncate">{ref.preview}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openReference(ref.doc_id)}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition"
                      title="View full content"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteReference(ref.doc_id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"
                      title={`Delete ${ref.doc_id}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showReferences && references.length === 0 && (
            <p className="mt-4 text-gray-500 text-sm">No reference documents loaded. Use the "Add References" tab to upload files.</p>
          )}
        </div>
      </div>

      <UploadForm
        onResult={(data) => { setResult(data); }}
        onFileResults={setResult}
        onReferencesUpdated={fetchReferences}
        username={userEmail}
        onTextSubmit={setSubmittedText}
      />

      {Array.isArray(result) ? (
        <div className="max-w-4xl mx-auto mt-6 space-y-4">
          {result.map((res, idx) => (
            <div key={idx} className="bg-white p-4 rounded shadow">
              <h3 className="font-bold text-lg mb-2 border-b pb-1">
                {res.filename || `File ${idx + 1}`}
              </h3>
              {res.error ? (
                <p className="text-red-500">{res.error}</p>
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
        <div className="max-w-4xl mx-auto mt-6">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="w-full py-2 px-4 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {showDashboard ? 'Hide Learning Dashboard' : 'Show Learning Dashboard'}
          </button>
        </div>
      )}

      {showDashboard && (
        <FeedbackDashboard username={userEmail} userRole={userRole} />
      )}
    </div>
  );
}

export default App;
