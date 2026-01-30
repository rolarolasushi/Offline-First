import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'pending', 'in_progress', 'done', 'cancelled'
        { name: 'sync_status', type: 'string' }, // 'pending_sync', 'syncing', 'synced'
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'server_status', type: 'string', isOptional: true }, // Server's version of status
        { name: 'conflict_resolution', type: 'string', isOptional: true }, // 'client_wins', 'server_wins', 'manual'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
