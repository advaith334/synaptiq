import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Upload, History, Activity } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/90 backdrop-blur-lg border-b border-slate-200/50 dark:border-gray-800/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Synaptic
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 -mt-1">AI Brain Analysis</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive('/')
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-900'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span className="font-medium">Upload</span>
            </Link>
            
            <Link
              to="/history"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive('/history')
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-900'
              }`}
            >
              <History className="h-4 w-4" />
              <span className="font-medium">History</span>
            </Link>

            {/* Theme Toggle */}
            <div className="ml-2">
              <ThemeToggle />
            </div>

            {/* Status Indicator */}
            <div className="ml-4 pl-4 border-l border-slate-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 text-sm">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-600 dark:text-gray-300">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;