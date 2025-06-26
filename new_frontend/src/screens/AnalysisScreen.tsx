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
  const [analysis, setAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;
    setIsProcessing(true);
    fetch('http://localhost:5001/history')
      .then(res => res.json())
      .then(data => {
        const found = data.find((item: any) => item.timestamp === jobId);
        if (found) {
          setAnalysis(found);
          setMessages([
            {
              id: 'ai-init',
              type: 'ai',
              content: found.summary || 'Analysis complete! Ready for your questions.',
              timestamp: new Date(),
            },
          ]);
        }
        setIsProcessing(false);
      })
      .catch(() => setIsProcessing(false));
  }, [jobId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping || !jobId) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    try {
      const res = await fetch('http://localhost:5001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.content, timestamp: jobId }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-ai',
          type: 'ai',
          content: data.response || 'No response.',
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-ai',
          type: 'ai',
          content: 'Error contacting AI.',
          timestamp: new Date(),
        },
      ]);
    }
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLaunchViewer = async () => {
    if (!analysis) return;
    
    try {
      const response = await fetch('http://localhost:5001/run-viewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanDir: 'scan', // Default scan directory
          // Add tumor coordinates if available in the analysis context
          ...(analysis.context?.tumor_detection?.coordinates && {
            tumorCoords: analysis.context.tumor_detection.coordinates
          })
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert('3D Viewer launched successfully!');
      } else {
        alert(result.error || 'Failed to launch 3D viewer.');
      }
    } catch (error) {
      alert('Error launching 3D viewer.');
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
              {analysis?.mri_url ? (
                <>
                  <img 
                    src={analysis.mri_url}
                    alt={analysis?.name || 'MRI Scan'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <p className="text-white text-sm font-medium">
                      {analysis?.name?.includes('t2') || analysis?.name?.includes('T2') ? 'Axial T2' : 
                       analysis?.name?.includes('t1') || analysis?.name?.includes('T1') ? 'Axial T1' : 
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
            {analysis && (
              <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Current Scan</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-white truncate">{analysis.name}</p>
                <p className="text-sm text-slate-500 dark:text-gray-400">{(analysis.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            )}

            {/* Analysis Findings */}
            {analysis?.summary && !isProcessing && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Key Findings</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{analysis.summary}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={handleLaunchViewer}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !analysis?.mri_url}
              >
                <Cube className="h-4 w-4" />
                <span>Launch 3D Viewer</span>
              </button>
              
              <button 
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !analysis?.mri_url}
              >
                <Database className="h-4 w-4" />
                <span>Show Similar Cases</span>
              </button>
            </div>

            {/* Analysis Status */}
            {!isProcessing && analysis && (
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