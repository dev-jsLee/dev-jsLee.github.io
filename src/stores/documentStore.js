// src/stores/documentStore.js
import { create } from 'zustand';
import { supabase } from '../config/supabase';

const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  fetchDocuments: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updatedAt', { ascending: false });
      
      if (error) throw error;
      set({ documents: data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createDocument: async (title, content) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('documents')
        .insert([{ title, content }])
        .select()
        .single();

      if (error) throw error;
      set(state => ({
        documents: [data, ...state.documents],
        currentDocument: data,
      }));
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  updateDocument: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set(state => ({
        documents: state.documents.map(doc => 
          doc.id === id ? data : doc
        ),
        currentDocument: data,
      }));
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  setCurrentDocument: (document) => {
    set({ currentDocument: document });
  },
}));

export default useDocumentStore;