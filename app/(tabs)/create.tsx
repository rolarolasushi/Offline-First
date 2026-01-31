import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TaskForm } from '@/components/TaskForm';
import { router } from 'expo-router';

export default function CreateTaskScreen() {
  const handleTaskCreated = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Create Task</ThemedText>
        <ThemedText style={styles.subtitle}>
          Fill out the form to create a new audit task
        </ThemedText>
      </ThemedView>

      <TaskForm onTaskCreated={handleTaskCreated} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
    fontSize: 14,
  },
});
