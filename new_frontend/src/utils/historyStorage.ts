export interface HistoryItem {
  id: string;
  jobId: string;
  timestamp: Date;
  filename: string;
  lastQuestion: string;
  status: 'completed' | 'processing' | 'failed';
  thumbnail: string;
  findings: string;
  uploadedFiles: {
    id: string;
    name: string;
    size: number;
    type: string;
    preview: string;
  }[];
  messages: {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }[];
}

const HISTORY_STORAGE_KEY = 'synaptic_analysis_history';

export const saveAnalysisToHistory = (analysisData: Omit<HistoryItem, 'id'>) => {
  try {
    const existingHistory = getAnalysisHistory();
    const newItem: HistoryItem = {
      ...analysisData,
      id: Date.now().toString(),
    };
    
    const updatedHistory = [newItem, ...existingHistory];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    return newItem;
  } catch (error) {
    console.error('Failed to save analysis to history:', error);
    return null;
  }
};

export const getAnalysisHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
      messages: item.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Failed to load analysis history:', error);
    return [];
  }
};

export const updateAnalysisInHistory = (jobId: string, updates: Partial<HistoryItem>) => {
  try {
    const history = getAnalysisHistory();
    const itemIndex = history.findIndex(item => item.jobId === jobId);
    
    if (itemIndex !== -1) {
      history[itemIndex] = { ...history[itemIndex], ...updates };
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      return history[itemIndex];
    }
    return null;
  } catch (error) {
    console.error('Failed to update analysis in history:', error);
    return null;
  }
};

export const getAnalysisFromHistory = (jobId: string): HistoryItem | null => {
  try {
    const history = getAnalysisHistory();
    return history.find(item => item.jobId === jobId) || null;
  } catch (error) {
    console.error('Failed to get analysis from history:', error);
    return null;
  }
};