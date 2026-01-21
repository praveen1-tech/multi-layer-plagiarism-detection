import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const UploadForm = ({ onResult, onFileResults, onReferencesUpdated, username }) => {
    const [mode, setMode] = useState('text'); // 'text', 'file', or 'reference'
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
                const response = await axios.post(`${API_BASE}/detect`, {
                    text: text,
                    username: username  // Include username for activity tracking
                });
                onResult(response.data);
            } else if (mode === 'file') {
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/detect_files`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username  // Include username for activity tracking
                    }
                });
                if (onFileResults) onFileResults(response.data);
            } else if (mode === 'reference') {
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }

                const response = await axios.post(`${API_BASE}/upload_references`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-Username': username  // Include username for activity tracking
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

                // Notify parent to refresh references list
                if (onReferencesUpdated) onReferencesUpdated();
            }
        } catch (err) {
            setError('Failed to analyze. Ensure backend is running.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Check for Plagiarism</h2>

            <div className="flex mb-4 border-b">
                <button
                    className={`pb-2 px-4 ${mode === 'text' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('text'); setError(''); setSuccessMessage(''); }}
                >
                    Paste Text
                </button>
                <button
                    className={`pb-2 px-4 ${mode === 'file' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('file'); setError(''); setSuccessMessage(''); }}
                >
                    Upload Files
                </button>
                <button
                    className={`pb-2 px-4 ${mode === 'reference' ? 'border-b-2 border-green-600 font-bold text-green-600' : 'text-gray-500'}`}
                    onClick={() => { setMode('reference'); setError(''); setSuccessMessage(''); }}
                >
                    Add References
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {mode === 'text' ? (
                    <textarea
                        className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-48"
                        placeholder="Paste your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required={mode === 'text'}
                    />
                ) : mode === 'file' ? (
                    <div className="h-48 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center p-4">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            required={mode === 'file'}
                        />
                        <p className="mt-2 text-sm text-gray-500">Upload files to check for plagiarism</p>
                    </div>
                ) : (
                    <div className="h-48 border-2 border-dashed border-green-300 rounded-md flex flex-col items-center justify-center p-4 bg-green-50">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                            required={mode === 'reference'}
                        />
                        <p className="mt-2 text-sm text-green-700 font-medium">Upload reference documents to compare against</p>
                        <p className="text-xs text-gray-500">These files will be added to your reference database</p>
                    </div>
                )}

                {error && <p className="text-red-500 mt-2">{error}</p>}
                {successMessage && <p className="text-green-600 mt-2 font-medium">{successMessage}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className={`mt-4 w-full py-2 px-4 ${mode === 'reference' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md font-semibold transition ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? (mode === 'reference' ? 'Uploading...' : 'Analyzing...') : (mode === 'reference' ? 'Upload References' : 'Analyze')}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
