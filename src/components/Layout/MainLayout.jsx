// src/components/Layout/MainLayout.jsx
import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import MarkdownEditor from '../Editor/MarkdownEditor';
import GraphView from '../Graph/GraphView';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r">
        <Sidebar />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <MarkdownEditor />
      </div>

      {/* Right Graph View */}
      <div className="w-80 bg-white border-l">
        <GraphView />
      </div>
    </div>
  );
};

export default MainLayout;