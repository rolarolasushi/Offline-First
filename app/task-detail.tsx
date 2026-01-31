import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { database, Task } from '@/database';
import { TaskStatus } from '@/database/models/Task';
import { TaskLocation } from '@/database/sqlite-db';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { syncManager } from '@/services/syncManager';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>('pending');
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalStatus, setOriginalStatus] = useState<TaskStatus>('pending');
  const [originalImageUris, setOriginalImageUris] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<TaskLocation | null>(null);
  const [originalLocation, setOriginalLocation] = useState<TaskLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#374151' }, 'text');
  const buttonContainerBg = useThemeColor({}, 'background');
  const buttonBorderColor = useThemeColor({ light: '#e2e8f0', dark: '#374151' }, 'text');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const hasUnsavedChanges = () => {
    const imagesChanged = JSON.stringify(imageUris.sort()) !== JSON.stringify(originalImageUris.sort());
    const locationChanged = JSON.stringify(location) !== JSON.stringify(originalLocation);
    
    return (
      title.trim() !== originalTitle ||
      description.trim() !== originalDescription ||
      currentStatus !== originalStatus ||
      imagesChanged ||
      locationChanged
    );
  };

  usePreventRemove(
    hasUnsavedChanges(),
    ({ data }) => {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              router.back();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              if (task && title.trim()) {
                try {
                  await database.write(async () => {
                    await task.update((t) => {
                      t.title = title.trim();
                      t.description = description.trim() || undefined;
                      t.status = currentStatus;
                      t.imageUrl = imageUris.length > 0 ? imageUris : null;
          if (location && location.address && location.address.trim()) {
            t.location = location;
          } else if (location && (location.lat !== 0 || location.lng !== 0)) {
            t.location = location;
          } else {
            t.location = undefined;
          }
                      t.updatedAt = new Date();
                      if (t.syncStatus === 'synced') {
                        t.syncStatus = 'pending_sync';
                      }
                    });
                  });
                  if (syncManager.getIsOnline()) {
                    syncManager.syncAll();
                  }
                  router.back();
                } catch (error) {
                  console.error('Error saving before navigation:', error);
                  router.back();
                }
              } else {
                router.back();
              }
            },
          },
        ]
      );
    }
  );

  useEffect(() => {
    if (task) {
      setCurrentStatus(task.status);
    }
  }, [task]);

  const loadTask = async () => {
    try {
      const foundTask = await database.get('tasks').find(taskId);
      setTask(foundTask);
      setTitle(foundTask.title);
      setDescription(foundTask.description || '');
      setCurrentStatus(foundTask.status);
      setOriginalTitle(foundTask.title);
      setOriginalDescription(foundTask.description || '');
      setOriginalStatus(foundTask.status);
      
      if (foundTask.imageUrl) {
        const uris = Array.isArray(foundTask.imageUrl) ? foundTask.imageUrl : [foundTask.imageUrl];
        setImageUris(uris);
        setOriginalImageUris([...uris]);
      } else {
        setImageUris([]);
        setOriginalImageUris([]);
      }
      
      if (foundTask.location) {
        const taskLocation = foundTask.location;
        setLocation(taskLocation);
        setOriginalLocation({ ...taskLocation });
        setAddress(taskLocation.address || '');
      } else {
        setLocation(null);
        setOriginalLocation(null);
        setAddress('');
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Task not found');
      router.back();
    }
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              router.back();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleUpdate();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };


  const handleUpdate = async () => {
    if (!task || !title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await database.write(async () => {
        await task.update((t) => {
          t.title = title.trim();
          t.description = description.trim() || undefined;
          t.status = currentStatus;
          t.imageUrl = imageUris.length > 0 ? imageUris : null;
          if (location && location.address && location.address.trim()) {
            t.location = location;
          } else if (location && (location.lat !== 0 || location.lng !== 0)) {
            t.location = location;
          } else {
            t.location = undefined;
          }
          t.updatedAt = new Date();
          if (t.syncStatus === 'synced') {
            t.syncStatus = 'pending_sync';
          }
        });
      });

      setOriginalTitle(title.trim());
      setOriginalDescription(description.trim());
      setOriginalStatus(currentStatus);
      setOriginalImageUris([...imageUris]);
      setOriginalLocation(location ? { ...location } : null);

      await loadTask();
      
      if (location && location.address) {
        setAddress(location.address);
      }

      if (syncManager.getIsOnline()) {
        syncManager.syncAll();
      }

      Alert.alert('Success', 'Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await task.destroyPermanently();
              });

              if (task.serverId) {
                await syncManager.addToQueue({
                  taskId: task.serverId,
                  action: 'delete',
                  timestamp: Date.now(),
                });
              }

              router.back();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to add images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 0,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImageUris((prev) => [...prev, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUris((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need location permissions to get your location');
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const addr = reverseGeocode[0];
      const fullAddress = addr ? [
        addr.street,
        addr.city,
        addr.region,
        addr.postalCode,
        addr.country,
      ]
        .filter(Boolean)
        .join(', ') : '';
      
      const newLocation: TaskLocation = {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        address: fullAddress || `Lat: ${currentLocation.coords.latitude.toFixed(6)}, Lng: ${currentLocation.coords.longitude.toFixed(6)}`,
      };
      
      setLocation(newLocation);
      setAddress(newLocation.address);
      setIsLoadingLocation(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
      setIsLoadingLocation(false);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setCurrentStatus(newStatus);
  };

  if (!task) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const getStatusColor = (status: TaskStatus) => {
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

  return (
    <ThemedView style={styles.container}>
        <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <ChevronLeft size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>Task Details</ThemedText>
          <View style={styles.backButton} />
        </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Title
          </ThemedText>
          <TextInput
            style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor="#94a3b8"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Description
          </ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { color: textColor, backgroundColor, borderColor }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Task description"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <View style={styles.labelContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(currentStatus) }]} />
            <ThemedText type="subtitle" style={styles.label}>
              Status
            </ThemedText>
          </View>
          <View style={styles.statusContainer}>
            {(['pending', 'in_progress', 'done', 'cancelled'] as TaskStatus[]).map((status) => {
              const isSelected = currentStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    isSelected && { backgroundColor: getStatusColor(status) },
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <ThemedText
                    style={[
                      styles.statusButtonText,
                      isSelected && styles.statusButtonTextActive,
                    ]}
                  >
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Images ({imageUris.length})
          </ThemedText>
          
          {imageUris.length > 0 && (
            <View style={styles.imagesGrid}>
              {imageUris.map((uri: string, index: number) => (
                <View key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri }} 
                    style={styles.detailImage}
                    onError={(error) => {
                      console.error('Image load error:', error.nativeEvent.error);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <ThemedText style={styles.removeImageText}>×</ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.addImageButtons}>
            <TouchableOpacity
              style={[styles.addImageButton, { borderColor }]}
              onPress={pickImageFromLibrary}
            >
              <ThemedText style={styles.addImageButtonText}>📷 Add from Library</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addImageButton, { borderColor }]}
              onPress={takePhoto}
            >
              <ThemedText style={styles.addImageButtonText}>📸 Take Photo</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Location
          </ThemedText>
          <TextInput
            style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              if (location) {
                setLocation({
                  ...location,
                  address: text,
                });
              } else if (text.trim()) {
                setLocation({
                  lat: 0,
                  lng: 0,
                  address: text,
                });
              } else {
                setLocation(null);
              }
            }}
            placeholder="Location address"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.locationButton, { borderColor }]}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <ThemedText style={styles.locationButtonText}>📍 Get Current Location</ThemedText>
            )}
          </TouchableOpacity>
          {location && location.lat !== 0 && location.lng !== 0 && (
            <ThemedText style={styles.locationInfo}>
              Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </ThemedText>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Sync Status
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {task.syncStatus === 'pending_sync' && (
              <ThemedText style={styles.syncStatus}>⏳ Pending Sync</ThemedText>
            )}
            {task.syncStatus === 'syncing' && (
              <ThemedText style={styles.syncStatus}>🔄 Syncing...</ThemedText>
            )}
            {task.syncStatus === 'synced' && (
              <>
                <ThemedText style={[styles.syncStatus, { color: colorScheme === 'dark' ? '#4ade80' : '#22c55e', fontWeight: 'bold' }]}>
                  ✓
                </ThemedText>
                <ThemedText style={[styles.syncStatus, { color: colorScheme === 'dark' ? '#4ade80' : '#22c55e' }]}>
                  {' '}Synced
                </ThemedText>
              </>
            )}
          </View>
          {task.conflictResolution && (
            <ThemedText style={styles.conflictText}>
              ⚠️ Conflict: {task.conflictResolution}
            </ThemedText>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <ThemedText style={styles.metaText}>
            Created: {new Date(task.createdAt).toLocaleString()}
          </ThemedText>
          <ThemedText style={styles.metaText}>
            Updated: {new Date(task.updatedAt).toLocaleString()}
          </ThemedText>
          {task.syncedAt && (
            <ThemedText style={styles.metaText}>
              Synced: {new Date(task.syncedAt).toLocaleString()}
            </ThemedText>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View 
        entering={FadeInUp.delay(450).duration(400)}
        style={[
          styles.buttonContainer, 
          { 
            paddingBottom: insets.bottom + 16,
            backgroundColor: buttonContainerBg,
            borderTopColor: buttonBorderColor,
          }
        ]}
      >
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
          <ThemedText style={styles.buttonText}>Update Task</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <ThemedText style={styles.buttonText}>Delete Task</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 200, 
  },
  section: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    marginBottom: 0,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '48%',
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
    minHeight: 100,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  addImageButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  addImageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfo: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  syncStatus: {
    fontSize: 16,
    marginTop: 8,
  },
  conflictText: {
    fontSize: 14,
    color: '#f59e0b',
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  updateButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 26,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 26,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
