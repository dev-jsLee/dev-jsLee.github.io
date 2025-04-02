// src/utils/syncUtils.js
import { supabase } from '../config/supabase';

class SyncManager {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
  }

  async syncDocument(document) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .upsert(document)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sync error:', error);
      this.addToQueue(document);
      throw error;
    }
  }

  addToQueue(document) {
    this.syncQueue.push(document);
    this.processSyncQueue();
  }

  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    while (this.syncQueue.length > 0) {
      const document = this.syncQueue[0];
      try {
        await this.syncDocument(document);
        this.syncQueue.shift();
      } catch (error) {
        console.error('Queue processing error:', error);
        break;
      }
    }
    this.isSyncing = false;
  }
}

export const syncManager = new SyncManager();