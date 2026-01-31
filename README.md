# Offline-First Task Execution App 📱

An offline-first task management application built with React Native and Expo. This app is designed for field workers who need to audit products in locations with poor connectivity (like inside a Walmart store). All data is stored locally and automatically syncs when connectivity is restored.

## 🎯 Project Overview

This is a **Task Execution App** that works **100% offline**. Users can create tasks, add images, set locations, and update task statuses without an internet connection. When connectivity is restored, all changes are automatically synchronized with the server.

### Key Features

- ✅ **100% Offline Functionality** - Create and manage tasks without internet
- 📸 **Image Capture** - Take photos or select from library (multiple images per task)
- 📍 **Location Services** - Get current location or manually enter addresses
- 🔄 **Automatic Sync** - Queues changes when offline, syncs when online
- 🎨 **Modern UI** - Pinterest-style masonry layout with smooth animations
- 🌓 **Dark Mode Support** - Automatic theme switching
- 🔍 **Filter & Sort** - Filter by status and sort by date
- ⚡ **Background Sync** - Syncs even when app is in background
- 🔀 **Conflict Resolution** - Handles server/client data conflicts intelligently

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (will be installed with dependencies)
- **iOS Simulator** (for Mac) or **Android Emulator** (for testing)
- **Expo Go** app on your physical device (optional, for testing)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

**Note:** If you encounter peer dependency issues, use:

```bash
npm install --legacy-peer-deps
```

### 2. Start the Development Server

```bash
npx expo start
```

This will start the Expo development server and display a QR code.

### 3. Run on Your Device/Simulator

You have several options:

#### iOS Simulator (Mac only)
```bash
npm run ios
```

#### iOS Device
```bash
npm run ios:device
```

#### Android Emulator
```bash
npm run android
```

#### Expo Go (Physical Device)
1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code displayed in the terminal
3. The app will load on your device

**Note:** Some features (like background sync) require a development build and won't work in Expo Go.

## 📁 Project Structure

```
Offline-First/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Tasks list screen
│   │   └── create.tsx     # Create task screen
│   └── task-detail.tsx    # Task detail/edit screen
├── components/            # Reusable React components
│   ├── TaskForm.tsx       # Task creation form
│   ├── TaskList.tsx       # Tasks list with masonry layout
│   └── TaskItem.tsx       # Individual task card
├── database/              # Database layer
│   ├── sqlite-db.ts       # SQLite database implementation
│   ├── taskAdapter.ts     # Task model adapter
│   └── models/            # Type definitions
├── services/              # Business logic services
│   ├── syncManager.ts     # Sync queue and management
│   ├── mockApi.ts         # Mock API for testing
│   └── backgroundSync.ts  # Background sync tasks
└── hooks/                 # Custom React hooks
```

## 🏗️ How It Works

### Architecture Overview

The app follows an **offline-first architecture** with the following components:

1. **Local Database (SQLite)**
   - Uses `expo-sqlite` for local data storage
   - All tasks are stored locally immediately
   - Data persists across app restarts

2. **Sync Manager**
   - Monitors network connectivity
   - Queues changes when offline
   - Automatically syncs when online
   - Handles conflicts between local and server data

3. **Task Adapter**
   - Provides a consistent API for task operations
   - Mimics WatermelonDB interface for compatibility
   - Handles data transformations

### Data Flow

```
User Action → Local Database → Sync Queue → Server (when online)
     ↓              ↓                ↓
  Immediate    Persisted      Queued for
  UI Update    Locally        Sync
```

### Offline-First Strategy

1. **Create Task**: Saved immediately to local database
2. **Update Task**: Changes saved locally, marked as `pending_sync`
3. **Network Detection**: App monitors connectivity status
4. **Auto Sync**: When online, sync manager processes queued changes
5. **Conflict Resolution**: Handles cases where server and client data differ

### Sync Status Indicators

- ⏳ **Pending Sync** - Task has local changes waiting to sync
- 🔄 **Syncing** - Currently being synced with server
- ✓ **Synced** - Successfully synchronized

### Background Sync

The app registers a background fetch task that:
- Runs every 15 minutes (when app is in background)
- Automatically syncs pending changes
- Works only in development builds (not in Expo Go)

## 🛠️ Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform and tooling
- **Expo Router** - File-based routing
- **expo-sqlite** - Local database
- **@react-native-community/netinfo** - Network status detection
- **expo-image-picker** - Camera and photo library access
- **expo-location** - Location services
- **react-native-reanimated** - Smooth animations
- **lucide-react-native** - Icon library
- **TypeScript** - Type safety

## 📱 Features in Detail

### Task Management
- Create tasks with title, description, price, location, images, and expiration date
- Update task status (Pending → In Progress → Done → Cancelled)
- Delete tasks
- View task details with all information

### Image Handling
- Take photos with camera
- Select multiple images from library
- View images in task cards and detail screen
- Remove images before saving

### Location Services
- Get current location with reverse geocoding
- Manually enter location addresses
- Display coordinates when available

### Filtering & Sorting
- Filter tasks by status (All, Pending, In Progress, Done, Cancelled)
- Sort by date (Newest/Oldest by creation or update date)
- Visual indicators for active filters

### UI/UX
- Pinterest-style masonry layout for task cards
- Smooth animations and transitions
- Dark mode support
- Safe area handling for notched devices
- Unsaved changes detection with alerts

## 🔧 Development

### Available Scripts

```bash
npm start              # Start Expo development server
npm run ios            # Run on iOS simulator
npm run ios:device     # Run on iOS device
npm run android        # Run on Android emulator
npm run web            # Run in web browser
npm run lint           # Run ESLint
```

### Mock API

The app uses a mock API for testing (`services/mockApi.ts`). To use a real API:

1. Update `USE_MOCK_API` flag in `services/syncManager.ts`
2. Set `API_BASE_URL` to your backend endpoint
3. Ensure your API matches the expected interface

### Database

The app uses SQLite for local storage. The database is automatically initialized on first launch. All data is stored in `tasks.db` in the app's document directory.

### Permissions

The app requires the following permissions:
- **Camera** - For taking photos
- **Photo Library** - For selecting images
- **Location** - For getting current location

These are configured in `app.json` and requested at runtime.

## 🐛 Troubleshooting

### Common Issues

**"Network request failed" errors**
- This is expected when offline. Tasks will sync when connectivity is restored.

**Images not showing**
- Ensure camera/photo library permissions are granted
- Check that image URIs are valid

**Sync not working**
- Verify network connectivity
- Check that `USE_MOCK_API` is set correctly
- Ensure sync manager is initialized (check app startup logs)

**Background sync not working**
- Background sync requires a development build, not Expo Go
- Build with `eas build` or `expo run:ios`/`expo run:android`

## 📝 Notes

- The app is designed for Expo Go compatibility, but some features (background sync) require a development build
- All data is stored locally and persists across app restarts
- The sync queue is stored in AsyncStorage for persistence
- Conflict resolution uses a "client wins" strategy by default, with manual review option

