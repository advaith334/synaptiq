import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Loader2, Cuboid as Cube, Database, Activity, Brain, AlertTriangle } from 'lucide-react';
import { saveAnalysisToHistory, updateAnalysisInHistory, getAnalysisFromHistory, HistoryItem } from '../utils/historyStorage';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  preview: string;
}

const AnalysisScreen: React.FC = () => {
  const { jobId } = useParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<StoredFile | null>(null);
  const [analysisFindings, setAnalysisFindings] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;

    // Check if this analysis already exists in history
    const existingAnalysis = getAnalysisFromHistory(jobId);
    
    if (existingAnalysis) {
      // Load existing analysis data
      setUploadedFile(existingAnalysis.uploadedFiles[0] || null);
      setMessages(existingAnalysis.messages);
      setAnalysisFindings(existingAnalysis.findings);
      setIsProcessing(existingAnalysis.status === 'processing');
    } else {
      // New analysis - retrieve uploaded file from sessionStorage
      const storedFiles = sessionStorage.getItem('uploadedMRIFiles');
      if (storedFiles) {
        const files = JSON.parse(storedFiles);
        const file = files[0]; // Get the single uploaded file
        setUploadedFile(file);
        
        // Save initial analysis to history
        const initialAnalysis = {
          jobId,
          timestamp: new Date(),
          filename: file?.name || 'Unknown scan',
          lastQuestion: '',
          status: 'processing' as const,
          thumbnail: file?.preview || '',
          findings: '',
          uploadedFiles: files,
          messages: []
        };
        
        saveAnalysisToHistory(initialAnalysis);
      }

      // Simulate processing completion
      const timer = setTimeout(() => {
        setIsProcessing(false);
        
        // Generate analysis findings
        const findings = generateAnalysisFindings();
        setAnalysisFindings(findings);
        
        // Add initial AI message
        const initialMessage: ChatMessage = {
          id: '1',
          type: 'ai',
          content: 'Analysis complete! I\'ve processed your MRI scan and am ready to answer any questions about potential tumor presence, location, characteristics, or treatment options. What would you like to know?',
          timestamp: new Date()
        };
        
        setMessages([initialMessage]);
        
        // Update analysis in history
        updateAnalysisInHistory(jobId, {
          status: 'completed',
          findings,
          messages: [initialMessage]
        });
        
        // Clear session storage
        sessionStorage.removeItem('uploadedMRIFiles');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [jobId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateAnalysisFindings = (): string => {
    const findings = [
      'Low-grade glioma detected in frontal lobe',
      'Benign meningioma, well-circumscribed',
      'Multiple sclerosis lesions identified',
      'Small arteriovenous malformation noted',
      'Normal brain structure, no abnormalities detected',
      'Possible early-stage tumor requiring further evaluation'
    ];
    return findings[Math.floor(Math.random() * findings.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping || !jobId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'Based on the MRI analysis, I can see some areas of interest in the frontal lobe region. The tissue appears to have different density characteristics compared to normal brain tissue.',
        'The scan shows what appears to be a small lesion approximately 1.2cm in diameter. Further clinical correlation would be recommended for definitive diagnosis.',
        'The tumor markers suggest this could be a low-grade glioma. The location and characteristics are consistent with this type of brain tumor.',
        'I recommend discussing these findings with your oncologist. The scan shows good overall brain structure with the abnormality confined to a specific region.',
        'The enhancement pattern suggests this is likely benign. However, monitoring with follow-up scans would be advisable.',
        'The location near eloquent brain areas would require careful surgical planning if intervention is needed.'
      ];

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      setIsTyping(false);

      // Update history with new messages and last question
      updateAnalysisInHistory(jobId, {
        messages: finalMessages,
        lastQuestion: userMessage.content
      });
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Processing Banner */}
      {isProcessing && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200">Processing MRI Scan...</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">AI analysis in progress. This may take 1-2 minutes.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Scan Preview */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 transition-colors duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              MRI Scan Analysis
            </h2>
            <p className="text-sm text-slate-600 dark:text-gray-400">Job ID: {jobId}</p>
          </div>
          
          <div className="p-6">
            {/* Scan Image */}
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
              {uploadedFile ? (
                <>
                  <img 
                    src={uploadedFile.preview}
                    alt={uploadedFile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <p className="text-white text-sm font-medium">
                      {uploadedFile.name.includes('t2') || uploadedFile.name.includes('T2') ? 'Axial T2' : 
                       uploadedFile.name.includes('t1') || uploadedFile.name.includes('T1') ? 'Axial T1' : 
                       'MRI Scan'}
                    </p>
                  </div>
                  {!isProcessing && (
                    <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm rounded-lg px-3 py-1">
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3 text-white" />
                        <p className="text-white text-xs font-medium">Analyzed</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <Brain className="h-12 w-12 text-slate-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-gray-400">No scan uploaded</p>
                </div>
              )}
            </div>

            {/* File Info */}
            {uploadedFile && (
              <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Current Scan</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-white truncate">{uploadedFile.name}</p>
                <p className="text-sm text-slate-500 dark:text-gray-400">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            )}

            {/* Analysis Findings */}
            {analysisFindings && !isProcessing && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Key Findings</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{analysisFindings}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !uploadedFile}
              >
                <Cube className="h-4 w-4" />
                <span>Launch 3D Viewer</span>
              </button>
              
              <button 
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !uploadedFile}
              >
                <Database className="h-4 w-4" />
                <span>Show Similar Cases</span>
              </button>
            </div>

            {/* Analysis Status */}
            {!isProcessing && uploadedFile && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Analysis Complete</p>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">
                  Confidence: {Math.floor(Math.random() * 10) + 90}% • Processing time: {Math.floor(Math.random() * 30) + 30}s
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Chat */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col transition-colors duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">AI Analysis Chat</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400">Ask questions about the scan results</p>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-96">
            {messages.length === 0 && isProcessing ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-gray-400">Waiting for analysis to complete...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-200' : 'text-slate-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-gray-800 px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-slate-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isProcessing ? "Waiting for analysis..." : "Ask about tumor presence, location, type..."}
                disabled={isProcessing || isTyping}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-gray-800 disabled:text-slate-400 dark:disabled:text-gray-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing || isTyping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisScreen;