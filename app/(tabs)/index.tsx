import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wifi, WifiOff, Settings2, Calendar, ArrowDown, ArrowUp } from 'lucide-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TaskList } from '@/components/TaskList';
import { Task } from '@/database';
import { router } from 'expo-router';
import { syncManager } from '@/services/syncManager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const [isOnline, setIsOnline] = React.useState(syncManager.getIsOnline());
  const [showFilter, setShowFilter] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');
  
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
        <View style={styles.titleRow}>
          <ThemedText type="title">Tasks</ThemedText>
          <View style={styles.topRightContainer}>
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
            <TouchableOpacity 
              onPress={() => setShowFilter(!showFilter)}
              style={styles.filterButton}
            >
              <Settings2 size={24} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              style={styles.calendarButton}
            >
              <View style={styles.calendarIconContainer}>
                <Calendar size={20} color={textColor} />
                {sortOrder === 'desc' ? (
                  <ArrowDown size={12} color={textColor} style={styles.arrowOverlay} />
                ) : (
                  <ArrowUp size={12} color={textColor} style={styles.arrowOverlay} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <ThemedText style={styles.subtitle}>
          All your audit tasks
        </ThemedText>
      </ThemedView>
      <TaskList onTaskPress={handleTaskPress} showFilter={showFilter} onCloseFilter={() => setShowFilter(false)} sortOrder={sortOrder} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topRightContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
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
  filterButton: {
    padding: 4,
  },
  calendarButton: {
    padding: 4,
  },
  calendarIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
});
