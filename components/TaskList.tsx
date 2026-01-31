import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { database, Task } from '@/database';
import { TaskStatus } from '@/database/models/Task';
import { TaskItem } from './TaskItem';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { syncManager } from '@/services/syncManager';
import { useThemeColor } from '@/hooks/use-theme-color';

interface TaskListProps {
  onTaskPress: (task: Task) => void;
  showFilter?: boolean;
  onCloseFilter?: () => void;
  sortOrder?: 'desc' | 'asc';
}

export function TaskList({ onTaskPress, showFilter = false, onCloseFilter, sortOrder = 'desc' }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#374151' }, 'text');

  useEffect(() => {
    const tasksCollection = database.get('tasks');
    const subscription = tasksCollection.query().observe().subscribe((tasksList: Task[]) => {
      setTasks(tasksList);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    if (selectedStatus !== 'all') {
      result = result.filter(task => task.status === selectedStatus);
    }
    
    result = [...result].sort((a, b) => {
      const aTime = a.updatedAt.getTime();
      const bTime = b.updatedAt.getTime();
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });
    
    return result;
  }, [tasks, selectedStatus, sortOrder]);

  const { leftColumn, rightColumn } = useMemo(() => {
    const left: Task[] = [];
    const right: Task[] = [];
    
    filteredTasks.forEach((task, index) => {
      if (index % 2 === 0) {
        left.push(task);
      } else {
        right.push(task);
      }
    });
    
    return { leftColumn: left, rightColumn: right };
  }, [filteredTasks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncManager.syncAll();
    setIsRefreshing(false);
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await task.updateStatus(newStatus);
    if (syncManager.getIsOnline()) {
      syncManager.syncAll();
    }
  };

  if (tasks.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No tasks yet. Create one to get started!</ThemedText>
        </ThemedView>
      </View>
    );
  }

  const getStatusColor = (status: TaskStatus | 'all') => {
    switch (status) {
      case 'done':
        return '#22c55e';
      case 'in_progress':
        return '#3b82f6';
      case 'cancelled':
        return '#ef4444';
      case 'pending':
        return '#64748b';
      default:
        return '#94a3b8';
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={onCloseFilter}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onCloseFilter}
        >
          <ThemedView 
            style={[styles.filterModal, { backgroundColor, borderColor }]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText type="subtitle" style={styles.filterTitle}>Filter by Status</ThemedText>
            {(['all', 'pending', 'in_progress', 'done', 'cancelled'] as (TaskStatus | 'all')[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  selectedStatus === status && { backgroundColor: getStatusColor(status) + '20' },
                ]}
                onPress={() => {
                  setSelectedStatus(status);
                  if (onCloseFilter) {
                    setTimeout(() => onCloseFilter(), 200);
                  }
                }}
              >
                <View style={[
                  styles.statusCircle,
                  { backgroundColor: status === 'all' ? '#94a3b8' : getStatusColor(status) }
                ]} />
                <ThemedText style={[
                  styles.filterOptionText,
                  selectedStatus === status && { fontWeight: '600' }
                ]}>
                  {status === 'all' ? 'All Tasks' : status.replace(/_/g, ' ').toUpperCase()}
                </ThemedText>
                {selectedStatus === status && (
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.masonryContainer}>
          <View style={styles.column}>
            {leftColumn.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => onTaskPress(task)}
                onStatusChange={handleStatusChange}
                isLeftColumn={true}
              />
            ))}
          </View>
          
          <View style={styles.column}>
            {rightColumn.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => onTaskPress(task)}
                onStatusChange={handleStatusChange}
                isLeftColumn={false}
                isFirstInRightColumn={index === 0}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  masonryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  filterTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  statusCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  filterOptionText: {
    flex: 1,
    fontSize: 14,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
});
