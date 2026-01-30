// Using expo-sqlite for Expo Go compatibility
// For production with WatermelonDB, uncomment the WatermelonDB code below
// and comment out the expo-sqlite implementation

export { database } from './taskAdapter';
export type { TaskAdapter as Task } from './taskAdapter';

// WatermelonDB version (requires development build):
// import { Database } from '@nozbe/watermelondb';
// import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
// import { schema } from './schema';
// import Task from './models/Task';
// 
// const adapter = new SQLiteAdapter({
//   schema,
//   jsi: false,
//   onSetUpError: (error) => {
//     console.error('Database setup error:', error);
//   },
// });
// 
// export const database = new Database({
//   adapter,
//   modelClasses: [Task],
// });
