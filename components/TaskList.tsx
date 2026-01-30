import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { database, Task } from '@/database';
import { TaskStatus } from '@/database/models/Task';
import { TaskItem } from './TaskItem';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { syncManager } from '@/services/syncManager';

interface TaskListProps {
  onTaskPress: (task: Task) => void;
}

export function TaskList({ onTaskPress }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(syncManager.getIsSyncing());

  // Subscribe to tasks changes
  useEffect(() => {
    const tasksCollection = database.get('tasks');
    const subscription = tasksCollection.query().observe().subscribe((tasksList: Task[]) => {
      setTasks(tasksList);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const updateSyncState = () => {
      setIsSyncing(syncManager.getIsSyncing());
    };

    // Initial update
    updateSyncState();

    // Subscribe to sync manager changes
    syncManager.addSyncListener(updateSyncState);
    
    // Also check network state periodically (every 2 seconds)
    const interval = setInterval(() => {
      updateSyncState();
    }, 2000);
    
    return () => {
      syncManager.removeSyncListener(updateSyncState);
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncManager.syncAll();
    setIsRefreshing(false);
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await task.updateStatus(newStatus);
    // Trigger sync if online
    if (syncManager.getIsOnline()) {
      syncManager.syncAll();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onPress={() => onTaskPress(item)}
            onStatusChange={handleStatusChange}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No tasks yet. Create one to get started!</ThemedText>
          </ThemedView>
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
});
