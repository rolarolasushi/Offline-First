import { database, Task } from '@/database';
import { TaskStatus, ConflictResolution } from '@/database/models/Task';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockApi } from './mockApi';

const USE_MOCK_API = true;
const API_BASE_URL = 'https://api.example.com'; // Replace with actual API URL
const SYNC_QUEUE_KEY = 'sync_queue';

interface SyncQueueItem {
  taskId: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: number;
}

class SyncManager {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncListeners: Set<() => void> = new Set();

  constructor() {
    this.initializeNetworkListener();
  }

  private async initializeNetworkListener() {
    const state = await NetInfo.fetch();
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;
    
    if (wasOnline !== this.isOnline) {
      this.notifyListeners();
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      this.notifyListeners();

      if (!wasOnline && this.isOnline) {
        console.log('Network came online, triggering sync...');
        this.syncAll();
      }
    });
    
    return unsubscribe;
  }

  async syncAll() {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const tasks = (await database
        .get('tasks')
        .query()
        .fetch()) as Task[];

      for (const task of tasks) {
        if (task.syncStatus === 'pending_sync' || task.syncStatus === 'syncing') {
          await this.syncTask(task);
        }
      }

      await this.processSyncQueue();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async syncTask(task: Task) {
    try {
      await task.markAsSyncing();

      if (!task.serverId) {
        const response = await this.createTaskOnServer(task);
        if (response) {
          await task.markAsSynced(response.id, response.status);
        }
      } else {
        const response = await this.updateTaskOnServer(task);
        if (response) {
          if (response.status !== task.status && task.serverStatus && task.serverStatus !== task.status) {
            await this.handleConflict(task, response.status);
          } else {
            await task.markAsSynced(task.serverId, response.status);
          }
        } else {
          const createResponse = await this.createTaskOnServer(task);
          if (createResponse) {
            await task.markAsSynced(createResponse.id, createResponse.status);
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing task ${task.id}:`, error);
      await task.update((t) => {
        t.syncStatus = 'pending_sync';
      });
    }
  }

  private async createTaskOnServer(task: Task): Promise<{ id: string; status: TaskStatus } | null> {
    try {
      if (USE_MOCK_API) {
        const response = await mockApi.createTask({
          title: task.title,
          description: task.description,
          status: task.status,
          price: task.price,
          location: task.location,
          image_url: Array.isArray(task.imageUrl) ? task.imageUrl[0] : task.imageUrl,
          expires_at: task.expiresAt ? task.expiresAt.toISOString() : undefined,
        });
        return {
          id: response.id,
          status: response.status,
        };
      }

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: task.status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        return null;
      }
      console.error('Error creating task on server:', error);
      throw error;
    }
  }

  private async updateTaskOnServer(task: Task): Promise<{ status: TaskStatus } | null> {
    try {
      if (USE_MOCK_API && task.serverId) {
        try {
        const response = await mockApi.updateTask(task.serverId, {
          title: task.title,
          description: task.description,
          status: task.status,
          price: task.price,
          location: task.location,
          image_url: Array.isArray(task.imageUrl) ? task.imageUrl[0] : task.imageUrl,
          expires_at: task.expiresAt ? task.expiresAt.toISOString() : undefined,
        });
          return {
            status: response.status,
          };
        } catch (error: any) {
          if (error?.message?.includes('Task not found')) {
            return null;
          }
          throw error;
        }
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${task.serverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: task.status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        return null;
      }
      console.error('Error updating task on server:', error);
      throw error;
    }
  }

  private async handleConflict(task: Task, serverStatus: TaskStatus) {
    let resolution: ConflictResolution = 'client_wins';
    let finalStatus: TaskStatus = task.status;

    if (serverStatus === 'cancelled' && task.status === 'done') {
      resolution = 'client_wins';
      finalStatus = task.status;
    } else if (task.status === 'cancelled' && serverStatus === 'done') {
      resolution = 'server_wins';
      finalStatus = serverStatus;
    } else {
      resolution = 'manual';
      finalStatus = task.status;
    }

    await task.resolveConflict(resolution, finalStatus);
    
    if (resolution === 'client_wins') {
      await this.updateTaskOnServer(task);
      await task.markAsSynced(task.serverId, finalStatus);
    } else if (resolution === 'server_wins') {
      await task.markAsSynced(task.serverId, serverStatus);
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline) {
      return;
    }

    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!queueJson) return;

      const queue: SyncQueueItem[] = JSON.parse(queueJson);
      const remainingQueue: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'delete' && item.taskId) {
            if (USE_MOCK_API) {
              continue;
            }

            const response = await fetch(`${API_BASE_URL}/tasks/${item.taskId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete task: ${response.statusText}`);
            }
          }
        } catch (error: any) {
          if (error?.message?.includes('Network request failed') || 
              error?.message?.includes('Failed to fetch') ||
              error?.name === 'TypeError') {
            remainingQueue.push(item);
          } else {
            console.error(`Error processing queue item:`, error);
            remainingQueue.push(item);
          }
        }
      }

      if (remainingQueue.length > 0) {
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
      } else {
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }

  async addToQueue(item: SyncQueueItem) {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const queue: SyncQueueItem[] = queueJson ? JSON.parse(queueJson) : [];
      queue.push(item);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  addSyncListener(listener: () => void) {
    this.syncListeners.add(listener);
  }

  removeSyncListener(listener: () => void) {
    this.syncListeners.delete(listener);
  }

  private notifyListeners() {
    this.syncListeners.forEach((listener) => listener());
  }
}

export const syncManager = new SyncManager();
