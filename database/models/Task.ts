import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type SyncStatus = 'pending_sync' | 'syncing' | 'synced';
export type ConflictResolution = 'client_wins' | 'server_wins' | 'manual';

export default class Task extends Model {
  static table = 'tasks';

  @field('title') title!: string;
  @field('description') description?: string;
  @field('status') status!: TaskStatus;
  @field('sync_status') syncStatus!: SyncStatus;
  @field('server_id') serverId?: string;
  @field('server_status') serverStatus?: TaskStatus;
  @field('conflict_resolution') conflictResolution?: ConflictResolution;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  async updateStatus(newStatus: TaskStatus) {
    await this.update((task) => {
      task.status = newStatus;
      task.updatedAt = new Date();
      if (task.syncStatus === 'synced') {
        task.syncStatus = 'pending_sync';
      }
    });
  }

  async markAsSyncing() {
    await this.update((task) => {
      task.syncStatus = 'syncing';
    });
  }

  async markAsSynced(serverId?: string, serverStatus?: TaskStatus) {
    await this.update((task) => {
      task.syncStatus = 'synced';
      task.syncedAt = new Date();
      if (serverId) {
        task.serverId = serverId;
      }
      if (serverStatus) {
        task.serverStatus = serverStatus;
      }
    });
  }

  async resolveConflict(resolution: ConflictResolution, finalStatus?: TaskStatus) {
    await this.update((task) => {
      task.conflictResolution = resolution;
      if (finalStatus) {
        task.status = finalStatus;
      }
      task.syncStatus = 'pending_sync';
      task.updatedAt = new Date();
    });
  }
}
