import { sqliteDb, TaskData, TaskLocation } from './sqlite-db';
import { TaskStatus, SyncStatus, ConflictResolution } from './models/Task';

// Adapter class to mimic WatermelonDB Task model API
export class TaskAdapter {
  id: string;
  private data: TaskData;

  constructor(data: TaskData) {
    this.id = data.id;
    this.data = { ...data };
  }

  get title() { return this.data.title; }
  set title(value: string) { this.data.title = value; }
  get description() { return this.data.description; }
  set description(value: string | undefined) { this.data.description = value; }
  get status() { return this.data.status; }
  set status(value: TaskStatus) { this.data.status = value; }
  get syncStatus() { return this.data.sync_status; }
  set syncStatus(value: SyncStatus) { this.data.sync_status = value; }
  get serverId() { return this.data.server_id; }
  set serverId(value: string | undefined) { this.data.server_id = value; }
  get serverStatus() { return this.data.server_status; }
  set serverStatus(value: TaskStatus | undefined) { this.data.server_status = value; }
  get conflictResolution() { return this.data.conflict_resolution; }
  set conflictResolution(value: ConflictResolution | undefined) { this.data.conflict_resolution = value; }
  get createdAt() { return new Date(this.data.created_at); }
  get updatedAt() { return new Date(this.data.updated_at); }
  set updatedAt(value: Date) { this.data.updated_at = value.getTime(); }
  get syncedAt() { return this.data.synced_at ? new Date(this.data.synced_at) : undefined; }
  set syncedAt(value: Date | undefined) { this.data.synced_at = value ? value.getTime() : undefined; }
  get price() { return this.data.price; }
  set price(value: number | undefined) { this.data.price = value; }
  get location(): TaskLocation | undefined {
    if (this.data.location_lat && this.data.location_lng) {
      return {
        lat: this.data.location_lat,
        lng: this.data.location_lng,
        address: this.data.location_address || '',
      };
    }
    return undefined;
  }
  set location(value: TaskLocation | undefined) {
    if (value) {
      this.data.location_lat = value.lat;
      this.data.location_lng = value.lng;
      this.data.location_address = value.address;
    } else {
      this.data.location_lat = undefined;
      this.data.location_lng = undefined;
      this.data.location_address = undefined;
    }
  }
  get imageUrl(): string | string[] | undefined {
    if (!this.data.image_url) return undefined;
    // Try to parse as JSON array, fallback to single string
    try {
      const parsed = JSON.parse(this.data.image_url);
      return Array.isArray(parsed) ? parsed : this.data.image_url;
    } catch {
      return this.data.image_url;
    }
  }
  set imageUrl(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      this.data.image_url = JSON.stringify(value);
    } else {
      this.data.image_url = value;
    }
  }
  get expiresAt() { return this.data.expires_at ? new Date(this.data.expires_at) : undefined; }
  set expiresAt(value: Date | undefined) { this.data.expires_at = value ? value.getTime() : undefined; }

  async update(updater: (task: TaskAdapter) => void) {
    updater(this);
    await sqliteDb.updateTask(this.id, {
      title: this.data.title,
      description: this.data.description,
      status: this.data.status,
      sync_status: this.data.sync_status,
      server_id: this.data.server_id,
      server_status: this.data.server_status,
      conflict_resolution: this.data.conflict_resolution,
      updated_at: this.data.updated_at,
      synced_at: this.data.synced_at,
      price: this.data.price,
      location_lat: this.data.location_lat,
      location_lng: this.data.location_lng,
      location_address: this.data.location_address,
      image_url: this.data.image_url,
      expires_at: this.data.expires_at,
    });
    await sqliteDb.notifyChange();
  }

  async updateStatus(newStatus: TaskStatus) {
    this.data.status = newStatus;
    this.data.updated_at = Date.now();
    if (this.data.sync_status === 'synced') {
      this.data.sync_status = 'pending_sync';
    }
    await sqliteDb.updateTask(this.id, {
      status: newStatus,
      updated_at: this.data.updated_at,
      sync_status: this.data.sync_status,
    });
    await sqliteDb.notifyChange();
  }

  async markAsSyncing() {
    this.data.sync_status = 'syncing';
    await sqliteDb.updateTask(this.id, { sync_status: 'syncing' });
    await sqliteDb.notifyChange();
  }

  async markAsSynced(serverId?: string, serverStatus?: TaskStatus) {
    this.data.sync_status = 'synced';
    this.data.synced_at = Date.now();
    if (serverId) this.data.server_id = serverId;
    if (serverStatus) this.data.server_status = serverStatus;
    await sqliteDb.updateTask(this.id, {
      sync_status: 'synced',
      synced_at: this.data.synced_at,
      server_id: this.data.server_id,
      server_status: this.data.server_status,
    });
    await sqliteDb.notifyChange();
  }

  async resolveConflict(resolution: ConflictResolution, finalStatus?: TaskStatus) {
    this.data.conflict_resolution = resolution;
    if (finalStatus) {
      this.data.status = finalStatus;
    }
    this.data.sync_status = 'pending_sync';
    this.data.updated_at = Date.now();
    await sqliteDb.updateTask(this.id, {
      conflict_resolution: resolution,
      status: this.data.status,
      sync_status: 'pending_sync',
      updated_at: this.data.updated_at,
    });
    await sqliteDb.notifyChange();
  }

  async destroyPermanently() {
    await sqliteDb.deleteTask(this.id);
    await sqliteDb.notifyChange();
  }
}

// Database-like interface
export const database = {
  get: (table: string) => ({
    create: async (initializer: (task: TaskAdapter) => void) => {
      const now = Date.now();
      const taskData: Omit<TaskData, 'id'> = {
        title: '',
        description: undefined,
        status: 'pending',
        sync_status: 'pending_sync',
        created_at: now,
        updated_at: now,
      };
      
      const tempTask = new TaskAdapter({ id: 'temp', ...taskData } as TaskData);
      initializer(tempTask);
      
      const id = await sqliteDb.createTask({
        title: tempTask.data.title,
        description: tempTask.data.description,
        status: tempTask.data.status,
        sync_status: tempTask.data.sync_status,
        created_at: now,
        updated_at: now,
        price: tempTask.data.price,
        location_lat: tempTask.data.location_lat,
        location_lng: tempTask.data.location_lng,
        location_address: tempTask.data.location_address,
        image_url: tempTask.data.image_url,
        expires_at: tempTask.data.expires_at,
      });
      
      await sqliteDb.notifyChange();
      const created = await sqliteDb.getTask(id);
      if (!created) throw new Error('Failed to create task');
      return new TaskAdapter(created);
    },
    find: async (id: string) => {
      const data = await sqliteDb.getTask(id);
      if (!data) throw new Error('Task not found');
      return new TaskAdapter(data);
    },
    query: () => ({
      observe: () => ({
        subscribe: (callback: (tasks: TaskAdapter[]) => void) => {
          const unsubscribe = sqliteDb.subscribe(async (tasksData) => {
            const tasks = tasksData.map(data => new TaskAdapter(data));
            callback(tasks);
          });
          // Return an object with unsubscribe method
          return {
            unsubscribe: () => {
              if (typeof unsubscribe === 'function') {
                unsubscribe();
              }
            }
          };
        },
      }),
      fetch: async () => {
        const tasksData = await sqliteDb.getAllTasks();
        return tasksData.map(data => new TaskAdapter(data));
      },
    }),
  }),
  write: async (fn: () => Promise<void>) => {
    await fn();
  },
};
