import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, FileImage, Loader2, CheckCircle2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

const UploadScreen: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = useCallback((file: File) => {
    if (file.type.startsWith('image/') || file.name.toLowerCase().includes('.dcm')) {
      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      // Clean up previous file preview if exists
      if (uploadedFile) {
        URL.revokeObjectURL(uploadedFile.preview);
      }
      
      setUploadedFile({ id, file, preview });
    }
  }, [uploadedFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]); // Only process the first file
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]); // Only process the first file
    }
  }, [processFile]);

  const handleChooseFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeFile = useCallback(() => {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile.preview);
      setUploadedFile(null);
    }
  }, [uploadedFile]);

  const handleSubmit = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      const response = await fetch('http://localhost:5001/analyze_mri', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        alert(result.error || 'Upload failed.');
        setIsUploading(false);
        return;
      }
      // Navigate to analysis screen with the returned timestamp
      navigate(`/scan/${result.timestamp}`);
    } catch (err) {
      alert('Upload failed.');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
            Upload MRI Scan
          </h1>
          <p className="text-lg text-slate-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
            Upload your brain MRI scan for AI-powered tumor analysis. 
            Supported formats: JPG, PNG, DICOM files.
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.dcm"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Upload Area */}
        {!uploadedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-3xl p-16 mb-8 transition-all duration-300 cursor-pointer ${
              isDragOver
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
                : 'border-slate-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-gray-900/50 hover:shadow-md'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleChooseFileClick}
          >
            <div className="text-center pointer-events-none">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-2xl font-semibold text-slate-800 dark:text-white mb-3">
                Drop your MRI scan here
              </h3>
              <p className="text-slate-600 dark:text-gray-300 mb-8 text-lg">
                or click to browse files
              </p>
              
              <button 
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChooseFileClick();
                }}
              >
                <FileImage className="h-5 w-5 mr-3" />
                Choose File
              </button>
              
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-6">
                Maximum file size: 50MB
              </p>
            </div>
          </div>
        ) : (
          /* File Preview */
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-slate-200 dark:border-gray-700 p-8 mb-8 transition-colors duration-300">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">
                MRI Scan Ready for Analysis
              </h3>
              
              <div className="relative inline-block">
                {/* Image Preview */}
                <div className="w-64 h-64 mx-auto bg-slate-200 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md mb-6">
                  {uploadedFile.file.type.startsWith('image/') ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-16 w-16 text-slate-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-200 shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* File Info */}
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-4 max-w-sm mx-auto">
                <p className="font-semibold text-slate-800 dark:text-white truncate mb-1">
                  {uploadedFile.file.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-300">
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB • {uploadedFile.file.type.split('/')[1].toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={!uploadedFile || isUploading}
            className={`inline-flex items-center px-12 py-5 rounded-2xl font-bold text-xl transition-all duration-300 ${
              !uploadedFile
                ? 'bg-slate-200 dark:bg-gray-800 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                : isUploading
                ? 'bg-blue-600 text-white cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:scale-105'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 mr-3" />
                Start Analysis
              </>
            )}
          </button>
          
          {uploadedFile && !isUploading && (
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-4">
              Click to begin AI-powered tumor analysis
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;