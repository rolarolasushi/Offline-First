import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wifi, WifiOff } from 'lucide-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TaskList } from '@/components/TaskList';
import { Task } from '@/database';
import { router } from 'expo-router';
import { syncManager } from '@/services/syncManager';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [isOnline, setIsOnline] = React.useState(syncManager.getIsOnline());
  
  React.useEffect(() => {
    const updateSyncState = () => {
      setIsOnline(syncManager.getIsOnline());
    };

    updateSyncState();
    syncManager.addSyncListener(updateSyncState);
    
    const interval = setInterval(() => {
      updateSyncState();
    }, 2000);
    
    return () => {
      syncManager.removeSyncListener(updateSyncState);
      clearInterval(interval);
    };
  }, []);

  const onlineColor = colorScheme === 'dark' ? '#4ade80' : '#22c55e';
  
  const handleTaskPress = (task: Task) => {
    router.push({
      pathname: '../task-detail',
      params: { taskId: task.id },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ThemedText type="title">Tasks</ThemedText>
        <View style={styles.subtitleRow}>
          <ThemedText style={styles.subtitle}>
            All your audit tasks
          </ThemedText>
          <View style={styles.statusContainer}>
            {isOnline ? (
              <Wifi size={18} color={onlineColor} />
            ) : (
              <WifiOff size={18} color="#ef4444" />
            )}
            <ThemedText style={styles.statusText}>
              {isOnline ? 'Online' : 'Offline'}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
      <TaskList onTaskPress={handleTaskPress} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  subtitle: {
    opacity: 0.7,
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '600',
  },
});
