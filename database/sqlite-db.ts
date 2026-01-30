import * as SQLite from 'expo-sqlite';
import { TaskStatus, SyncStatus, ConflictResolution } from './models/Task';

export interface TaskLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  sync_status: SyncStatus;
  server_id?: string;
  server_status?: TaskStatus;
  conflict_resolution?: ConflictResolution;
  created_at: number;
  updated_at: number;
  synced_at?: number;
  price?: number;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  image_url?: string;
  expires_at?: number;
}

class SQLiteDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    if (this.db) return;
    
    this.db = await SQLite.openDatabaseAsync('tasks.db');
    
    // Create tasks table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        server_id TEXT,
        server_status TEXT,
        conflict_resolution TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        price REAL,
        location_lat REAL,
        location_lng REAL,
        location_address TEXT,
        image_url TEXT,
        expires_at INTEGER
      );
    `);
    
    // Add new columns if they don't exist (for existing databases)
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN price REAL;
      `);
    } catch (e) {
      // Column might already exist
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN location_lat REAL;
      `);
    } catch (e) {}
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN location_lng REAL;
      `);
    } catch (e) {}
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN location_address TEXT;
      `);
    } catch (e) {}
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN image_url TEXT;
      `);
    } catch (e) {}
    try {
      await this.db.execAsync(`
        ALTER TABLE tasks ADD COLUMN expires_at INTEGER;
      `);
    } catch (e) {}
  }

  async getAllTasks(): Promise<TaskData[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getAllAsync<TaskData>(
      'SELECT * FROM tasks ORDER BY updated_at DESC'
    );
    return result;
  }

  async getTask(id: string): Promise<TaskData | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getFirstAsync<TaskData>(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async createTask(task: Omit<TaskData, 'id'>): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    // Generate UUID v4 format
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    const id = `task_${generateUUID()}`;
    
    await this.db.runAsync(
      `INSERT INTO tasks (id, title, description, status, sync_status, server_id, server_status, conflict_resolution, created_at, updated_at, synced_at, price, location_lat, location_lng, location_address, image_url, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        task.title,
        task.description || null,
        task.status,
        task.sync_status,
        task.server_id || null,
        task.server_status || null,
        task.conflict_resolution || null,
        task.created_at,
        task.updated_at,
        task.synced_at || null,
        task.price || null,
        task.location_lat || null,
        task.location_lng || null,
        task.location_address || null,
        task.image_url || null,
        task.expires_at || null,
      ]
    );
    
    return id;
  }

  async updateTask(id: string, updates: Partial<TaskData>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.sync_status !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.sync_status);
    }
    if (updates.server_id !== undefined) {
      fields.push('server_id = ?');
      values.push(updates.server_id || null);
    }
    if (updates.server_status !== undefined) {
      fields.push('server_status = ?');
      values.push(updates.server_status || null);
    }
    if (updates.conflict_resolution !== undefined) {
      fields.push('conflict_resolution = ?');
      values.push(updates.conflict_resolution || null);
    }
    if (updates.updated_at !== undefined) {
      fields.push('updated_at = ?');
      values.push(updates.updated_at);
    }
    if (updates.synced_at !== undefined) {
      fields.push('synced_at = ?');
      values.push(updates.synced_at || null);
    }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price || null);
    }
    if (updates.location_lat !== undefined) {
      fields.push('location_lat = ?');
      values.push(updates.location_lat || null);
    }
    if (updates.location_lng !== undefined) {
      fields.push('location_lng = ?');
      values.push(updates.location_lng || null);
    }
    if (updates.location_address !== undefined) {
      fields.push('location_address = ?');
      values.push(updates.location_address || null);
    }
    if (updates.image_url !== undefined) {
      fields.push('image_url = ?');
      values.push(updates.image_url || null);
    }
    if (updates.expires_at !== undefined) {
      fields.push('expires_at = ?');
      values.push(updates.expires_at || null);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteTask(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  }

  // Observable-like subscription for React components
  private listeners: Set<(tasks: TaskData[]) => void> = new Set();
  
  subscribe(listener: (tasks: TaskData[]) => void) {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private async notifyListeners() {
    const tasks = await this.getAllTasks();
    this.listeners.forEach(listener => listener(tasks));
  }
  
  async notifyChange() {
    await this.notifyListeners();
  }
}

export const sqliteDb = new SQLiteDatabase();
