import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Task } from '@/database';
import { SyncStatus, TaskStatus } from '@/database/models/Task';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

const getStatusColor = (status: TaskStatus, colorScheme: 'light' | 'dark' | null) => {
  const isDark = colorScheme === 'dark';
  switch (status) {
    case 'done':
      return isDark ? '#4ade80' : '#22c55e';
    case 'in_progress':
      return isDark ? '#60a5fa' : '#3b82f6';
    case 'cancelled':
      return isDark ? '#f87171' : '#ef4444';
    default:
      return isDark ? '#94a3b8' : '#64748b';
  }
};

const getSyncStatusIcon = (syncStatus: SyncStatus) => {
  switch (syncStatus) {
    case 'pending_sync':
      return '⏳';
    case 'syncing':
      return <ActivityIndicator size="small" color="#3b82f6" />;
    case 'synced':
      return '✓';
    default:
      return '';
  }
};

const getSyncStatusText = (syncStatus: SyncStatus) => {
  switch (syncStatus) {
    case 'pending_sync':
      return 'Pending Sync';
    case 'syncing':
      return 'Syncing...';
    case 'synced':
      return 'Synced';
    default:
      return '';
  }
};

const formatStatusDisplay = (status: TaskStatus): string => {
  return status.replace(/_/g, ' ').toUpperCase();
};

export function TaskItem({ task, onPress, onStatusChange }: TaskItemProps) {
  const colorScheme = useColorScheme();
  const statusColor = getStatusColor(task.status, colorScheme);

  const handleStatusPress = () => {
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'done', 'cancelled'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    onStatusChange(task, statusOrder[nextIndex]);
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedView style={styles.taskCard}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {task.title}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <TouchableOpacity onPress={handleStatusPress}>
              <ThemedText style={styles.statusText}>{formatStatusDisplay(task.status)}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {task.description && (
          <ThemedText style={styles.description} numberOfLines={2}>
            {task.description}
          </ThemedText>
        )}

        {task.imageUrl && (
          <View style={styles.imagesContainer}>
            {Array.isArray(task.imageUrl) ? (
              task.imageUrl.length > 0 && (
                <Image source={{ uri: task.imageUrl[0] }} style={styles.taskImage} />
              )
            ) : (
              <Image source={{ uri: task.imageUrl }} style={styles.taskImage} />
            )}
            {Array.isArray(task.imageUrl) && task.imageUrl.length > 1 && (
              <View style={styles.imageCountBadge}>
                <ThemedText style={styles.imageCountText}>+{task.imageUrl.length - 1}</ThemedText>
              </View>
            )}
          </View>
        )}

        {(task.price || task.location) && (
          <View style={styles.metaInfo}>
            {task.price && (
              <ThemedText style={styles.metaText}>💰 ${task.price}</ThemedText>
            )}
            {task.location && (
              <ThemedText style={styles.metaText} numberOfLines={1}>
                📍 {task.location.address}
              </ThemedText>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.syncStatus}>
            {typeof getSyncStatusIcon(task.syncStatus) === 'string' ? (
              <ThemedText style={styles.syncStatusText}>
                {getSyncStatusIcon(task.syncStatus) as string}{' '}
              </ThemedText>
            ) : (
              getSyncStatusIcon(task.syncStatus)
            )}
            <ThemedText style={styles.syncStatusText}>
              {getSyncStatusText(task.syncStatus)}
            </ThemedText>
          </View>

          {task.conflictResolution && (
            <View style={styles.conflictBadge}>
              <ThemedText style={styles.conflictText}>
                ⚠️ Conflict: {task.conflictResolution}
              </ThemedText>
            </View>
          )}

          <ThemedText style={styles.dateText}>
            {new Date(task.updatedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  taskCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  imagesContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  taskImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncStatusText: {
    fontSize: 12,
    opacity: 0.7,
  },
  conflictBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conflictText: {
    fontSize: 10,
    color: '#92400e',
  },
  dateText: {
    fontSize: 12,
    opacity: 0.5,
  },
});
