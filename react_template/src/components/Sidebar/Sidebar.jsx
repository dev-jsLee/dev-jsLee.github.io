// src/components/Sidebar/Sidebar.jsx
import React from 'react';
import useDocumentStore from '../../stores/documentStore';

const Sidebar = () => {
  const { documents, currentDocument, setCurrentDocument, createDocument } = useDocumentStore();

  const handleNewDocument = () => {
    createDocument('Untitled', '');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <button
          onClick={handleNewDocument}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Document
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setCurrentDocument(doc)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${
              currentDocument?.id === doc.id ? 'bg-gray-100' : ''
            }`}
          >
            <h3 className="font-medium truncate">{doc.title}</h3>
            <p className="text-sm text-gray-500 truncate">
              {new Date(doc.updatedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;