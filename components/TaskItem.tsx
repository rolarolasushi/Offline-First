import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Task } from '@/database';
import { SyncStatus, TaskStatus } from '@/database/models/Task';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  isLeftColumn?: boolean;
  isFirstInRightColumn?: boolean;
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

const getSyncStatusIcon = (syncStatus: SyncStatus, colorScheme: 'light' | 'dark' | null) => {
  const greenColor = colorScheme === 'dark' ? '#4ade80' : '#22c55e';
  switch (syncStatus) {
    case 'pending_sync':
      return '⏳';
    case 'syncing':
      return <ActivityIndicator size="small" color="#3b82f6" />;
    case 'synced':
      return <ThemedText style={{ color: greenColor, fontSize: 14, fontWeight: 'bold' }}>✓</ThemedText>;
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

export function TaskItem({ task, onPress, onStatusChange, isLeftColumn = true, isFirstInRightColumn = false }: TaskItemProps) {
  const colorScheme = useColorScheme();
  const statusColor = getStatusColor(task.status, colorScheme ?? 'light');
  const [isPressed, setIsPressed] = React.useState(false);

  const handleStatusPress = () => {
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'done', 'cancelled'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    onStatusChange(task, statusOrder[nextIndex]);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isPressed ? 0.98 : 1, {
            damping: 20,
            stiffness: 300,
          }),
        },
      ],
      opacity: withTiming(isPressed ? 0.9 : 1, { duration: 100 }),
    };
  });

  const handlePressIn = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    onPress();
  };

  const containerStyle = [
    styles.container,
    !isLeftColumn && isFirstInRightColumn && styles.rightColumnFirstItem,
  ];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[containerStyle, animatedStyle]}
    >
      <ThemedView style={styles.taskCard}>
        <TouchableOpacity 
          style={[styles.statusIndicator, { backgroundColor: statusColor }]}
          onPress={handleStatusPress}
        />
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
            {task.title}
          </ThemedText>
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
            {task.syncStatus === 'synced' ? (
              <>
                {getSyncStatusIcon(task.syncStatus, colorScheme ?? 'light')}
                <ThemedText style={[styles.syncStatusText, { color: colorScheme === 'dark' ? '#4ade80' : '#22c55e' }]}>
                  {' '}{getSyncStatusText(task.syncStatus)}
                </ThemedText>
              </>
            ) : typeof getSyncStatusIcon(task.syncStatus, colorScheme ?? 'light') === 'string' ? (
              <ThemedText style={styles.syncStatusText}>
                {getSyncStatusIcon(task.syncStatus, colorScheme ?? 'light') as string}{' '}
                {getSyncStatusText(task.syncStatus)}
              </ThemedText>
            ) : (
              <>
                {getSyncStatusIcon(task.syncStatus, colorScheme ?? 'light')}
                <ThemedText style={styles.syncStatusText}>
                  {' '}{getSyncStatusText(task.syncStatus)}
                </ThemedText>
              </>
            )}
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
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  rightColumnFirstItem: {
    marginTop: 16,
  },
  taskCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
    lineHeight: 16,
  },
  imagesContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  taskImage: {
    width: '100%',
    height: 120,
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
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'column',
    gap: 4,
    marginTop: 8,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncStatusText: {
    fontSize: 10,
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
    fontSize: 10,
    opacity: 0.5,
  },
});
