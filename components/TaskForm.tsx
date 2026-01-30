import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { database, Task } from '@/database';
import { syncManager } from '@/services/syncManager';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TaskLocation } from '@/database/sqlite-db';

interface TaskFormProps {
  onTaskCreated?: () => void;
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#374151' }, 'icon');

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
        selectionLimit: 0, // 0 means no limit
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

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need location permissions to get your location');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode[0]) {
        const addr = reverseGeocode[0];
        const fullAddress = [
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ');
        setAddress(fullAddress);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      let location: TaskLocation | undefined;
      if (address.trim()) {
        // For now, we'll use a default location if address is provided
        // In a real app, you'd get lat/lng from geocoding
        location = {
          lat: 19.4326, // Default to Mexico City coordinates
          lng: -99.1332,
          address: address.trim(),
        };
      }

      await database.write(async () => {
        await database.get('tasks').create((task) => {
          task.title = title.trim();
          task.description = description.trim() || undefined;
          task.status = 'pending';
          task.syncStatus = 'pending_sync';
          task.updatedAt = new Date();
          if (price) {
            task.price = parseFloat(price);
          }
          if (location) {
            task.location = location;
          }
          if (imageUris.length > 0) {
            // Store multiple images - the setter will handle JSON stringification
            task.imageUrl = imageUris;
          }
          if (expiresAt) {
            task.expiresAt = new Date(expiresAt);
          }
        });
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setAddress('');
      setImageUris([]);
      setExpiresAt('');

      // Trigger sync if online
      if (syncManager.getIsOnline()) {
        setTimeout(() => {
          syncManager.syncAll();
        }, 100);
      }

      onTaskCreated?.();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <ThemedText type="subtitle" style={styles.title}>
        Create New Task
      </ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
          placeholder="Task title"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea, { color: textColor, backgroundColor, borderColor }]}
          placeholder="Description (optional)"
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <TextInput
          style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
          placeholder="Price (optional)"
          placeholderTextColor="#94a3b8"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <View style={styles.locationContainer}>
          <TextInput
            style={[styles.input, styles.locationInput, { color: textColor, backgroundColor, borderColor }]}
            placeholder="Location address (optional)"
            placeholderTextColor="#94a3b8"
            value={address}
            onChangeText={setAddress}
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isLoading}
          >
            <ThemedText style={styles.locationButtonText}>
              {isLoading ? 'Getting...' : '📍 Get Location'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          {imageUris.length > 0 && (
            <View style={styles.imagesGrid}>
              {imageUris.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUris((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <ThemedText style={styles.removeImageText}>×</ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.imageButtonsRow}>
            <TouchableOpacity style={[styles.imageButton, styles.cameraButton]} onPress={takePhoto}>
              <ThemedText style={styles.imageButtonText}>
                📸 Camera
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.imageButton, styles.libraryButton]} onPress={pickImageFromLibrary}>
              <ThemedText style={styles.imageButtonText}>
                🖼️ Library
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
          placeholder="Expires at (YYYY-MM-DD) (optional)"
          placeholderTextColor="#94a3b8"
          value={expiresAt}
          onChangeText={setExpiresAt}
        />

        <TouchableOpacity style={styles.button} onPress={handleCreateTask}>
          <ThemedText style={styles.buttonText}>Create Task</ThemedText>
        </TouchableOpacity>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  imageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#10b981',
  },
  libraryButton: {
    backgroundColor: '#3b82f6',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  imageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
