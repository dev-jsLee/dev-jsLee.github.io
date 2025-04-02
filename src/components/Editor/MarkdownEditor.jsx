// src/components/Editor/MarkdownEditor.jsx
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import useDocumentStore from '../../stores/documentStore';

const MarkdownEditor = () => {
  const { currentDocument, updateDocument } = useDocumentStore();
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content);
      setPreview(marked(currentDocument.content));
    }
  }, [currentDocument]);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setPreview(marked(newContent));
    
    // Debounced update
    const timeoutId = setTimeout(() => {
      if (currentDocument) {
        updateDocument(currentDocument.id, { content: newContent });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="h-full flex">
      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={handleChange}
          className="w-full h-full p-4 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start writing in markdown..."
        />
      </div>

      {/* Preview */}
      <div className="flex-1 p-4 border-l overflow-y-auto">
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;