import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/Navigation';
import UploadScreen from './screens/UploadScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import HistoryScreen from './screens/HistoryScreen';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-black dark:to-black transition-colors duration-300">
          <Navigation />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<UploadScreen />} />
              <Route path="/scan/:jobId" element={<AnalysisScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;