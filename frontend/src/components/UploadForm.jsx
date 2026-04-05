import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const UploadForm = ({ onResult, onFileResults, onReferencesUpdated, username, onTextSubmit }) => {
    // Text modes: 'crossuser' | 'text'
    const [textMode, setTextMode] = useState('crossuser');
    // Upload modes: 'crossuserfile' | 'file'
    const [uploadMode, setUploadMode] = useState('crossuserfile');
    // Reference modes: 'reference' | 'myupload'
    const [refMode, setRefMode] = useState('reference');

    const [text, setText] = useState('');
    const [uploadFiles, setUploadFiles] = useState([]);
    const [refFiles, setRefFiles] = useState([]);

    const [loadingText, setLoadingText] = useState(false);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loadingRef, setLoadingRef] = useState(false);

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // === Text Analyze ===
    const handleTextSubmit = async (e) => {
        e.preventDefault();
        setLoadingText(true);
        setError('');
        setSuccessMessage('');
        try {
            if (textMode === 'crossuser') {
                const response = await axios.post(`${API_BASE}/detect_cross_user`, {
                    text, username
                });
                if (onTextSubmit) onTextSubmit(text);
                onResult({ ...response.data, cross_user_detection: true });
            } else {
                const response = await axios.post(`${API_BASE}/detect`, {
                    text, username
                });
                if (onTextSubmit) onTextSubmit(text);
                onResult(response.data);
            }
        } catch (err) {
            setError('Failed to analyze text. Ensure backend is running.');
            console.error(err);
        } finally {
            setLoadingText(false);
        }
    };

    // === Upload Analyze ===
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setLoadingUpload(true);
        setError('');
        setSuccessMessage('');
        try {
            const formData = new FormData();
            for (let i = 0; i < uploadFiles.length; i++) {
                formData.append('files', uploadFiles[i]);
            }

            if (uploadMode === 'crossuserfile') {
                const response = await axios.post(`${API_BASE}/detect_files_cross_user`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'X-Username': username }
                });
                const resultsWithFlag = response.data.map(r => ({
                    ...r,
                    result: r.result ? { ...r.result, cross_user_detection: true } : r.result
                }));
                if (onFileResults) onFileResults(resultsWithFlag);
            } else {
                const response = await axios.post(`${API_BASE}/detect_files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'X-Username': username }
                });
                if (onFileResults) onFileResults(response.data);
            }
        } catch (err) {
            setError('Failed to analyze files. Ensure backend is running.');
            console.error(err);
        } finally {
            setLoadingUpload(false);
        }
    };

    // === Reference Upload ===
    const handleRefSubmit = async (e) => {
        e.preventDefault();
        setLoadingRef(true);
        setError('');
        setSuccessMessage('');
        try {
            const formData = new FormData();
            for (let i = 0; i < refFiles.length; i++) {
                formData.append('files', refFiles[i]);
            }

            if (refMode === 'reference') {
                const response = await axios.post(`${API_BASE}/upload_references`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'X-Username': username }
                });
                const successCount = response.data.uploaded.filter(u => u.status === 'success').length;
                const skippedCount = response.data.uploaded.filter(u => u.status === 'skipped').length;
                let message = `Successfully uploaded ${successCount} reference file(s).`;
                if (skippedCount > 0) message += ` Skipped ${skippedCount} duplicate(s).`;
                message += ` Total references: ${response.data.total_references}`;
                setSuccessMessage(message);
                setRefFiles([]);
                if (onReferencesUpdated) onReferencesUpdated();
            } else {
                const response = await axios.post(`${API_BASE}/upload_documents`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'X-Username': username }
                });
                const successCount = response.data.uploaded.filter(u => u.status === 'success').length;
                const skippedCount = response.data.uploaded.filter(u => u.status === 'skipped').length;
                let message = `Successfully stored ${successCount} document(s).`;
                if (skippedCount > 0) message += ` Skipped ${skippedCount} duplicate(s).`;
                message += ` Your documents: ${response.data.total_user_documents} | System total: ${response.data.total_system_documents}`;
                setSuccessMessage(message);
                setRefFiles([]);
            }
        } catch (err) {
            setError('Failed to upload. Ensure backend is running.');
            console.error(err);
        } finally {
            setLoadingRef(false);
        }
    };

    return (
        <div className="input-grid">
            {/* ===== LEFT COLUMN: Text Input ===== */}
            <div className="glass-card text-panel">
                <div className="glass-card-title">
                    <span className="icon">✏️</span> Text
                </div>

                <div className="mode-toggle">
                    <button
                        className={textMode === 'crossuser' ? 'active' : ''}
                        onClick={() => setTextMode('crossuser')}
                    >
                        Cross-User
                    </button>
                    <button
                        className={textMode === 'text' ? 'active' : ''}
                        onClick={() => setTextMode('text')}
                    >
                        Reference
                    </button>
                </div>

                <form onSubmit={handleTextSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <textarea
                        placeholder={textMode === 'crossuser'
                            ? "Paste text to check against other users' documents..."
                            : 'Paste your text here to check against references...'}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loadingText}
                        className={`btn-primary ${textMode === 'crossuser' ? 'indigo' : ''}`}
                    >
                        {loadingText ? (
                            <><span className="spinner"></span>Analyzing...</>
                        ) : (
                            'Analyze'
                        )}
                    </button>
                </form>
            </div>

            {/* ===== RIGHT COLUMN: Uploads + Reference ===== */}
            <div className="right-panels">
                {/* Uploads Check Panel */}
                <div className="glass-card">
                    <div className="glass-card-title">
                        <span className="icon">📤</span> Uploads Check
                    </div>

                    <div className="mode-toggle">
                        <button
                            className={uploadMode === 'crossuserfile' ? 'active' : ''}
                            onClick={() => setUploadMode('crossuserfile')}
                        >
                            Cross-User
                        </button>
                        <button
                            className={uploadMode === 'file' ? 'active' : ''}
                            onClick={() => setUploadMode('file')}
                        >
                            Reference
                        </button>
                    </div>

                    <form onSubmit={handleUploadSubmit}>
                        <div className="upload-zone">
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setUploadFiles(e.target.files)}
                                required
                            />
                            <p className="upload-zone-label">
                                {uploadMode === 'crossuserfile'
                                    ? "Check files against other users' documents"
                                    : 'Upload files to check for plagiarism'}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={loadingUpload}
                            className={`btn-primary ${uploadMode === 'crossuserfile' ? 'indigo' : ''}`}
                        >
                            {loadingUpload ? (
                                <><span className="spinner"></span>Analyzing...</>
                            ) : (
                                'Analyze'
                            )}
                        </button>
                    </form>
                </div>

                {/* Reference Check / Add Uploads Panel */}
                <div className="glass-card">
                    <div className="glass-card-title">
                        <span className="icon">{refMode === 'reference' ? '➕' : '📂'}</span>
                        {refMode === 'reference' ? 'Reference Check' : 'Add Uploads'}
                    </div>

                    <div className="mode-toggle">
                        <button
                            className={refMode === 'reference' ? 'active' : ''}
                            onClick={() => { setRefMode('reference'); setSuccessMessage(''); }}
                        >
                            Add References
                        </button>
                        <button
                            className={refMode === 'myupload' ? 'active' : ''}
                            onClick={() => { setRefMode('myupload'); setSuccessMessage(''); }}
                        >
                            Add Uploads
                        </button>
                    </div>

                    <form onSubmit={handleRefSubmit}>
                        <div className={`upload-zone ${refMode === 'reference' ? 'reference' : ''}`}>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setRefFiles(e.target.files)}
                                required
                            />
                            <p className="upload-zone-label">
                                {refMode === 'reference'
                                    ? 'Upload documents to the global reference database'
                                    : 'Upload your documents for cross-user detection'}
                            </p>
                        </div>

                        {successMessage && <p className="success-message">{successMessage}</p>}

                        <button
                            type="submit"
                            disabled={loadingRef}
                            className={`btn-primary ${refMode === 'reference' ? 'green' : 'purple'}`}
                        >
                            {loadingRef ? (
                                <><span className="spinner"></span>{refMode === 'reference' ? 'Uploading...' : 'Storing...'}</>
                            ) : (
                                refMode === 'reference' ? 'Upload' : 'Store My Documents'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Show error across both columns */}
            {error && (
                <div style={{ gridColumn: '1 / -1' }}>
                    <p className="error-message">{error}</p>
                </div>
            )}
        </div>
    );
};

export default UploadForm;
