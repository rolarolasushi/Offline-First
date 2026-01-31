import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncManager } from './syncManager';

const BACKGROUND_SYNC_TASK = 'background-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync started');
    await syncManager.syncAll();
    console.log('Background sync completed');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background sync registered');
  } catch (error: any) {
    if (error?.message?.includes('Background Fetch has not been configured')) {
      console.log('Background sync not available in Expo Go (requires development build)');
    } else {
      console.error('Error registering background sync:', error);
    }
  }
}

export async function unregisterBackgroundSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('Background sync unregistered');
  } catch (error) {
    console.error('Error unregistering background sync:', error);
  }
}
