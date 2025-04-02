// src/stores/userStore.js
import { create } from 'zustand';
import { supabase } from '../config/supabase';

const useUserStore = create((set) => ({
  user: null,
  loading: false,
  error: null,
  
  login: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      set({ user: data.user });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  checkUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      set({ user });
    } catch (error) {
      set({ error: error.message });
    }
  },
}));

export default useUserStore;