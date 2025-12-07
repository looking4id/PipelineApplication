import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PipelineList from './pages/PipelineList';
import PipelineDetailView from './pages/PipelineDetail';
import PipelineSettings from './pages/PipelineSettings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PipelineList />} />
        <Route path="/pipeline/:id" element={<PipelineDetailView />} />
        <Route path="/pipeline/:id/edit" element={<PipelineSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
