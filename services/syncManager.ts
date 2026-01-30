import { database, Task } from '@/database';
import { TaskStatus, ConflictResolution } from '@/database/models/Task';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockApi } from './mockApi';

// Set to true to use mock API for testing, false to use real API
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
    // Check initial network state
    const state = await NetInfo.fetch();
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;
    
    // Notify listeners of initial state
    if (wasOnline !== this.isOnline) {
      this.notifyListeners();
    }

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Notify listeners of state change
      this.notifyListeners();

      // If we just came online, trigger sync
      if (!wasOnline && this.isOnline) {
        console.log('Network came online, triggering sync...');
        this.syncAll();
      }
    });
    
    // Store unsubscribe function if needed
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

      // Sync tasks that need syncing
      for (const task of tasks) {
        if (task.syncStatus === 'pending_sync' || task.syncStatus === 'syncing') {
          await this.syncTask(task);
        }
      }

      // Process any queued items from AsyncStorage (for deleted tasks, etc.)
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
        // Create new task on server
        const response = await this.createTaskOnServer(task);
        if (response) {
          await task.markAsSynced(response.id, response.status);
        }
      } else {
        // Update existing task on server
        const response = await this.updateTaskOnServer(task);
        if (response) {
          // Check for conflicts
          if (response.status !== task.status && task.serverStatus && task.serverStatus !== task.status) {
            // Conflict detected - server status differs from local
            await this.handleConflict(task, response.status);
          } else {
            await task.markAsSynced(task.serverId, response.status);
          }
        } else {
          // If update failed (e.g., task not found), try creating it
          // This can happen if the mock API was reset
          const createResponse = await this.createTaskOnServer(task);
          if (createResponse) {
            await task.markAsSynced(createResponse.id, createResponse.status);
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing task ${task.id}:`, error);
      // Mark as pending sync to retry later
      await task.update((t) => {
        t.syncStatus = 'pending_sync';
      });
    }
  }

  private async createTaskOnServer(task: Task): Promise<{ id: string; status: TaskStatus } | null> {
    try {
      if (USE_MOCK_API) {
        // Use mock API for testing
        const response = await mockApi.createTask({
          title: task.title,
          description: task.description,
          status: task.status,
          price: task.price,
          location: task.location,
          image_url: task.imageUrl,
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
      // Network errors are expected when offline
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        // Silently fail - task will remain in pending_sync state
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
          // Use mock API for testing
        const response = await mockApi.updateTask(task.serverId, {
          title: task.title,
          description: task.description,
          status: task.status,
          price: task.price,
          location: task.location,
          image_url: task.imageUrl,
          expires_at: task.expiresAt ? task.expiresAt.toISOString() : undefined,
        });
          return {
            status: response.status,
          };
        } catch (error: any) {
          // If task not found in mock API, it will create it automatically
          // But if there's another error, return null to trigger create
          if (error?.message?.includes('Task not found')) {
            // The mock API now creates it automatically, so this shouldn't happen
            // But if it does, return null to trigger create
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
      // Network errors are expected when offline
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        // Silently fail - task will remain in pending_sync state
        return null;
      }
      console.error('Error updating task on server:', error);
      throw error;
    }
  }

  private async handleConflict(task: Task, serverStatus: TaskStatus) {
    // Conflict resolution strategy:
    // 1. If server says "cancelled" but client says "done", we'll use "client_wins" by default
    // 2. But mark it for manual review if needed
    let resolution: ConflictResolution = 'client_wins';
    let finalStatus: TaskStatus = task.status;

    if (serverStatus === 'cancelled' && task.status === 'done') {
      // Client wins - user's action takes precedence
      resolution = 'client_wins';
      finalStatus = task.status;
    } else if (task.status === 'cancelled' && serverStatus === 'done') {
      // Server wins - server's state is more authoritative
      resolution = 'server_wins';
      finalStatus = serverStatus;
    } else {
      // For other conflicts, use client wins but mark for review
      resolution = 'manual';
      finalStatus = task.status;
    }

    await task.resolveConflict(resolution, finalStatus);
    
    // If client wins, sync the client's status to server
    if (resolution === 'client_wins') {
      await this.updateTaskOnServer(task);
      await task.markAsSynced(task.serverId, finalStatus);
    } else if (resolution === 'server_wins') {
      await task.markAsSynced(task.serverId, serverStatus);
    }
  }

  private async processSyncQueue() {
    // Don't process queue if offline
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
            // Handle delete action
            if (USE_MOCK_API) {
              // Mock API doesn't support delete, so just remove from queue
              // In a real app, you'd call the mock API delete method
              continue;
            }

            const response = await fetch(`${API_BASE_URL}/tasks/${item.taskId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete task: ${response.statusText}`);
            }
          }
          // Item processed successfully, don't add to remaining queue
        } catch (error: any) {
          // Network errors are expected when offline or if network drops
          if (error?.message?.includes('Network request failed') || 
              error?.message?.includes('Failed to fetch') ||
              error?.name === 'TypeError') {
            // Silently keep item in queue for retry when network is back
            remainingQueue.push(item);
          } else {
            // Log other errors but still keep in queue
            console.error(`Error processing queue item:`, error);
            remainingQueue.push(item);
          }
        }
      }

      // Update queue with remaining items
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
