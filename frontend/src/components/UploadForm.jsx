import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const UploadForm = ({ onResult, onFileResults, onReferencesUpdated, username, onTextSubmit }) => {
    // Modes: 'text', 'file', 'reference', 'crossuser', 'myupload'
    const [mode, setMode] = useState('crossuser');
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (mode === 'text') {
                // Check against reference documents
                const response = await axios.post(`${API_BASE}/detect`, {
                    text: text,
                    username: username
                });
                if (onTextSubmit) onTextSubmit(text);
                onResult(response.data);
            } else if (mode === 'crossuser') {
                // Check text against other users' documents
                const response = await axios.post(`${API_BASE}/detect_cross_user`, {
                    text: text,
                    username: username
                });
                if (onTextSubmit) onTextSubmit(text);
                // Add indicator that this is cross-user detection
                const resultWithFlag = { ...response.data, cross_user_detection: true };
                onResult(resultWithFlag);
            } else if (mode === 'file') {
                // Check files against reference documents
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/detect_files`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username
                    }
                });
                if (onFileResults) onFileResults(response.data);
            } else if (mode === 'crossuserfile') {
                // Check files against other users' documents
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/detect_files_cross_user`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username
                    }
                });
                // Add indicator that this is cross-user detection
                const resultsWithFlag = response.data.map(r => ({
                    ...r,
                    result: r.result ? { ...r.result, cross_user_detection: true } : r.result
                }));
                if (onFileResults) onFileResults(resultsWithFlag);
            } else if (mode === 'reference') {
                // Add to reference database
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/upload_references`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username
                    }
                });

                const successCount = response.data.uploaded.filter(u => u.status === 'success').length;
                const skippedCount = response.data.uploaded.filter(u => u.status === 'skipped').length;

                let message = `Successfully uploaded ${successCount} reference file(s).`;
                if (skippedCount > 0) {
                    message += ` Skipped ${skippedCount} duplicate(s).`;
                }
                message += ` Total references: ${response.data.total_references}`;

                setSuccessMessage(message);
                setFiles([]);

                if (onReferencesUpdated) onReferencesUpdated();
            } else if (mode === 'myupload') {
                // Upload as user documents for cross-user detection
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/upload_documents`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username
                    }
                });

                const successCount = response.data.uploaded.filter(u => u.status === 'success').length;
                const skippedCount = response.data.uploaded.filter(u => u.status === 'skipped').length;

                let message = `Successfully stored ${successCount} document(s).`;
                if (skippedCount > 0) {
                    message += ` Skipped ${skippedCount} duplicate(s).`;
                }
                message += ` Your documents: ${response.data.total_user_documents} | System total: ${response.data.total_system_documents}`;

                setSuccessMessage(message);
                setFiles([]);
            }
        } catch (err) {
            setError('Failed to analyze. Ensure backend is running.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getModeColor = () => {
        if (mode === 'reference') return 'green';
        if (mode === 'myupload') return 'purple';
        if (mode === 'crossuser' || mode === 'crossuserfile') return 'indigo';
        return 'blue';
    };

    const color = getModeColor();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Check for Plagiarism</h2>

            {/* Primary Mode Tabs */}
            <div className="flex mb-2 border-b">
                <button
                    className={`pb-2 px-4 ${mode === 'crossuser' || mode === 'crossuserfile' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('crossuser'); setError(''); setSuccessMessage(''); }}
                >
                    🔍 Cross-User Check
                </button>
                <button
                    className={`pb-2 px-4 ${mode === 'text' || mode === 'file' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('text'); setError(''); setSuccessMessage(''); }}
                >
                    📚 Reference Check
                </button>
                <button
                    className={`pb-2 px-4 ${mode === 'myupload' ? 'border-b-2 border-purple-600 font-bold text-purple-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('myupload'); setError(''); setSuccessMessage(''); }}
                >
                    📤 My Uploads
                </button>
                <button
                    className={`pb-2 px-4 ${mode === 'reference' ? 'border-b-2 border-green-600 font-bold text-green-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('reference'); setError(''); setSuccessMessage(''); }}
                >
                    ➕ Add References
                </button>
            </div>

            {/* Sub-mode toggles for cross-user and reference checks */}
            {(mode === 'crossuser' || mode === 'crossuserfile') && (
                <div className="flex gap-2 mb-4">
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${mode === 'crossuser' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        onClick={() => setMode('crossuser')}
                    >
                        Paste Text
                    </button>
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${mode === 'crossuserfile' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        onClick={() => setMode('crossuserfile')}
                    >
                        Upload Files
                    </button>
                </div>
            )}

            {(mode === 'text' || mode === 'file') && (
                <div className="flex gap-2 mb-4">
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        onClick={() => setMode('text')}
                    >
                        Paste Text
                    </button>
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${mode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        onClick={() => setMode('file')}
                    >
                        Upload Files
                    </button>
                </div>
            )}

            {/* Mode Description */}
            <div className={`mb-4 p-3 rounded-md text-sm ${mode === 'crossuser' || mode === 'crossuserfile' ? 'bg-indigo-50 text-indigo-800' :
                    mode === 'myupload' ? 'bg-purple-50 text-purple-800' :
                        mode === 'reference' ? 'bg-green-50 text-green-800' :
                            'bg-blue-50 text-blue-800'
                }`}>
                {(mode === 'crossuser' || mode === 'crossuserfile') && (
                    <>
                        <strong>Cross-User Detection:</strong> Check your content against all other users' uploads.
                        Your own documents are excluded from comparison.
                    </>
                )}
                {(mode === 'text' || mode === 'file') && (
                    <>
                        <strong>Reference Check:</strong> Check your content against the global reference document database.
                    </>
                )}
                {mode === 'myupload' && (
                    <>
                        <strong>Upload Your Documents:</strong> Add your documents to the system.
                        Other users will be checked against your uploads, but you won't be matched against your own content.
                    </>
                )}
                {mode === 'reference' && (
                    <>
                        <strong>Add References:</strong> Upload documents to the global reference database for all users.
                    </>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                {(mode === 'text' || mode === 'crossuser') ? (
                    <textarea
                        className={`w-full p-4 border rounded-md focus:ring-2 h-48 ${mode === 'crossuser' ? 'border-indigo-300 focus:ring-indigo-500' : 'border-gray-300 focus:ring-blue-500'
                            }`}
                        placeholder={mode === 'crossuser' ? 'Paste text to check against other users\' documents...' : 'Paste your text here...'}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required
                    />
                ) : mode === 'file' || mode === 'crossuserfile' ? (
                    <div className={`h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center p-4 ${mode === 'crossuserfile' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                        }`}>
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${mode === 'crossuserfile' ? 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                                }`}
                            required
                        />
                        <p className={`mt-2 text-sm ${mode === 'crossuserfile' ? 'text-indigo-600' : 'text-gray-500'}`}>
                            {mode === 'crossuserfile' ? 'Check files against other users\' documents' : 'Upload files to check for plagiarism'}
                        </p>
                    </div>
                ) : mode === 'reference' ? (
                    <div className="h-48 border-2 border-dashed border-green-300 rounded-md flex flex-col items-center justify-center p-4 bg-green-50">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                            required
                        />
                        <p className="mt-2 text-sm text-green-700 font-medium">Upload reference documents to compare against</p>
                        <p className="text-xs text-gray-500">These files will be added to the global reference database</p>
                    </div>
                ) : mode === 'myupload' ? (
                    <div className="h-48 border-2 border-dashed border-purple-300 rounded-md flex flex-col items-center justify-center p-4 bg-purple-50">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                            required
                        />
                        <p className="mt-2 text-sm text-purple-700 font-medium">Upload your documents to the system</p>
                        <p className="text-xs text-gray-500">Other users will be checked against these, but you won't match your own</p>
                    </div>
                ) : null}

                {error && <p className="text-red-500 mt-2">{error}</p>}
                {successMessage && <p className="text-green-600 mt-2 font-medium">{successMessage}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className={`mt-4 w-full py-2 px-4 text-white rounded-md font-semibold transition ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${mode === 'reference' ? 'bg-green-600 hover:bg-green-700' :
                            mode === 'myupload' ? 'bg-purple-600 hover:bg-purple-700' :
                                (mode === 'crossuser' || mode === 'crossuserfile') ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {loading ? (
                        mode === 'reference' ? 'Uploading...' :
                            mode === 'myupload' ? 'Storing...' :
                                'Analyzing...'
                    ) : (
                        mode === 'reference' ? 'Upload References' :
                            mode === 'myupload' ? 'Store My Documents' :
                                (mode === 'crossuser' || mode === 'crossuserfile') ? 'Check Against Other Users' :
                                    'Analyze'
                    )}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
