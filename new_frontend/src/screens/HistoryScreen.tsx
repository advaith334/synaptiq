import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, MessageSquare, Brain, Clock, FileImage, Filter, X, Eye } from 'lucide-react';

interface HistoryItem {
  timestamp: string;
  mri_url: string;
  context: any;
  summary: string;
}

const HistoryScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/history')
      .then(res => res.json())
      .then(data => {
        setHistoryItems(data);
        setIsLoading(false);
      })
      .catch(() => {
        setHistoryItems([]);
        setIsLoading(false);
      });
  }, []);

  const filteredHistory = historyItems.filter(item => {
    // Text search filter
    const matchesSearch = 
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.context?.tumor_detection?.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.context?.findings || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Date range filter - only apply if dates are set
    let matchesDateRange = true;
    if (startDate || endDate) {
      try {
        // Parse the timestamp string to get the date
        const year = item.timestamp.substring(0, 4);
        const month = item.timestamp.substring(4, 6);
        const day = item.timestamp.substring(6, 8);
        const itemDate = new Date(`${year}-${month}-${day}`);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDateRange = matchesDateRange && itemDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && itemDate <= end;
        }
      } catch (error) {
        // If date parsing fails, include the item
        matchesDateRange = true;
      }
    }

    return matchesSearch && matchesDateRange;
  });

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasDateFilters = startDate || endDate;

  const formatTimestamp = (timestamp: string) => {
    try {
      // The timestamp from backend is a string like "20241201_143022"
      // Convert it to a proper date format
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(9, 11);
      const minute = timestamp.substring(11, 13);
      const second = timestamp.substring(13, 15);
      
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        fullDate: date
      };
    } catch (error) {
      // Fallback if date parsing fails
      return {
        date: 'Unknown Date',
        time: 'Unknown Time',
        fullDate: new Date()
      };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-gray-400">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Analysis History</h1>
        <p className="text-slate-600 dark:text-gray-300">
          Review your previous MRI scan analyses and continue conversations with AI.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search scans, questions, or findings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 shadow-sm text-slate-900 dark:text-white"
          />
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-4 transition-colors duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-600 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300">Filter by Date Range</h3>
            </div>
            {hasDateFilters && (
              <button
                onClick={clearDateFilters}
                className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                <X className="h-3 w-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          
          {hasDateFilters && (
            <div className="mt-3 text-xs text-slate-600 dark:text-gray-400">
              {startDate && endDate ? (
                <>Showing results from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</>
              ) : startDate ? (
                <>Showing results from {new Date(startDate).toLocaleDateString()} onwards</>
              ) : endDate ? (
                <>Showing results up to {new Date(endDate).toLocaleDateString()}</>
              ) : null}
            </div>
          )}
          
          {!hasDateFilters && (
            <div className="mt-3 text-xs text-slate-600 dark:text-gray-400">
              Showing all submissions
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-slate-200 dark:border-gray-700 shadow-sm transition-colors duration-300 max-w-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
              <FileImage className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{filteredHistory.length}</p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Total Scans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(searchTerm || hasDateFilters) && (
        <div className="mb-4 text-sm text-slate-600 dark:text-gray-400">
          Showing {filteredHistory.length} of {historyItems.length} results
          {searchTerm && ` matching "${searchTerm}"`}
          {hasDateFilters && ` within selected date range`}
        </div>
      )}

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="h-12 w-12 text-slate-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-gray-400 mb-2">
              {historyItems.length === 0 ? 'No analyses yet' : 'No analyses found'}
            </h3>
            <p className="text-slate-500 dark:text-gray-400">
              {historyItems.length === 0 
                ? "Upload your first MRI scan to get started with AI analysis." 
                : searchTerm || hasDateFilters
                ? "Try adjusting your search terms or date range." 
                : "No scans match your current filters."}
            </p>
            {historyItems.length === 0 && (
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Upload First Scan
              </Link>
            )}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const timestamp = formatTimestamp(item.timestamp);
            const hasTumor = item.context?.tumor_detection?.present || false;
            const tumorType = item.context?.tumor_detection?.type || 'Unknown';
            
            return (
              <Link
                key={item.timestamp}
                to={`/scan/${item.timestamp}`}
                className="block bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-slate-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <img
                          src={item.mri_url}
                          alt="MRI Scan"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const nextElement = target.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = 'flex';
                          }}
                        />
                        <div className="hidden w-full h-full items-center justify-center text-slate-400 dark:text-gray-500">
                          <FileImage className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                            MRI Scan Analysis
                          </h3>
                          
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span>{timestamp.date}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{timestamp.time}</span>
                            </div>
                          </div>
                          
                          {hasTumor && (
                            <p className="text-sm text-red-600 dark:text-red-400 mb-2 font-medium">
                              Tumor Type: {tumorType}
                            </p>
                          )}
                          
                          {item.summary && (
                            <p className="text-sm text-slate-600 dark:text-gray-300 mb-2 line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                          
                          {item.context?.findings && (
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="h-4 w-4 text-slate-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-600 dark:text-gray-300 italic line-clamp-1">
                                "{item.context.findings}"
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* View Details Button */}
                        <div className="flex-shrink-0 ml-4">
                          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                            <Eye className="h-4 w-4" />
                            <span>View Details</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;