// src/components/Graph/GraphView.jsx
import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import useDocumentStore from '../../stores/documentStore';
import { extractLinks } from '../../utils/markdownUtils';

const GraphView = () => {
  const container = useRef(null);
  const network = useRef(null);
  const { documents, setCurrentDocument } = useDocumentStore();

  useEffect(() => {
    if (!container.current) return;

    const nodes = documents.map(doc => ({
      id: doc.id,
      label: doc.title,
    }));

    // Create edges based on document links
    const edges = [];
    documents.forEach(doc => {
      const links = extractLinks(doc.content);
      links.forEach(targetId => {
        edges.push({ from: doc.id, to: targetId });
      });
    });

    const data = { nodes, edges };
    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
      },
      physics: {
        stabilization: false,
        barnesHut: {
          gravitationalConstant: -80,
          springConstant: 0.001,
          springLength: 200,
        },
      },
    };

    network.current = new Network(container.current, data, options);
    
    network.current.on('selectNode', (params) => {
      const doc = documents.find(d => d.id === params.nodes[0]);
      if (doc) {
        setCurrentDocument(doc);
      }
    });

    return () => {
      if (network.current) {
        network.current.destroy();
      }
    };
  }, [documents, setCurrentDocument]);

  return (
    <div className="h-full p-4">
      <div ref={container} className="h-full border rounded" />
    </div>
  );
};

export default GraphView;