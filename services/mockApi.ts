/**
 * Mock API Service for Testing
 * 
 * In a real implementation, replace the API_BASE_URL in syncManager.ts
 * with your actual backend endpoint.
 * 
 * This mock service simulates a REST API for task management.
 */

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  price?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  image_url?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// In-memory store for mock API
let mockTasks: Map<string, TaskResponse> = new Map();
let nextId = 1;

export const mockApi = {
  async createTask(data: {
    title: string;
    description?: string;
    status: string;
    price?: number;
    location?: { lat: number; lng: number; address: string };
    image_url?: string;
    expires_at?: string;
  }): Promise<TaskResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const task: TaskResponse = {
      id: `task_${nextId++}`,
      title: data.title,
      description: data.description,
      status: data.status as TaskResponse['status'],
      price: data.price,
      location: data.location,
      image_url: data.image_url,
      expires_at: data.expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockTasks.set(task.id, task);
    return task;
  },

  async updateTask(
    id: string,
    data: {
      title: string;
      description?: string;
      status: string;
      price?: number;
      location?: { lat: number; lng: number; address: string };
      image_url?: string;
      expires_at?: string;
    }
  ): Promise<TaskResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const existingTask = mockTasks.get(id);
    if (!existingTask) {
      // If task doesn't exist, create it (this can happen if mock API was reset)
      const newTask: TaskResponse = {
        id: id,
        title: data.title,
        description: data.description,
        status: data.status as TaskResponse['status'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockTasks.set(id, newTask);
      return newTask;
    }

    const updatedTask: TaskResponse = {
      ...existingTask,
      title: data.title,
      description: data.description,
      status: data.status as TaskResponse['status'],
      price: data.price !== undefined ? data.price : existingTask.price,
      location: data.location !== undefined ? data.location : existingTask.location,
      image_url: data.image_url !== undefined ? data.image_url : existingTask.image_url,
      expires_at: data.expires_at !== undefined ? data.expires_at : existingTask.expires_at,
      updated_at: new Date().toISOString(),
    };

    mockTasks.set(id, updatedTask);
    return updatedTask;
  },

  async deleteTask(id: string): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!mockTasks.has(id)) {
      throw new Error('Task not found');
    }

    mockTasks.delete(id);
  },

  async getTask(id: string): Promise<TaskResponse | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockTasks.get(id) || null;
  },

  async getAllTasks(): Promise<TaskResponse[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return Array.from(mockTasks.values());
  },

  // Reset mock data (useful for testing)
  reset() {
    mockTasks.clear();
    nextId = 1;
  },
};
