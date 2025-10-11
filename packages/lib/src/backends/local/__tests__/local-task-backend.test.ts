import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalTaskBackend } from '../local-task-backend';
import { LocalConfig } from '../local-config';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('LocalTaskBackend', () => {
  let backend: LocalTaskBackend;
  let testBasePath: string;
  let config: LocalConfig;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testBasePath = path.join(os.tmpdir(), `digital-minion-test-${Date.now()}`);

    config = {
      basePath: testBasePath,
      projectId: 'test-project',
      format: 'jsonl',
      enableCaching: false, // Disable caching for tests
      autoDiscoverPartitions: true,
    };

    backend = new LocalTaskBackend(config);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });

  describe('createTask', () => {
    it('should create a task with basic fields', async () => {
      const task = await backend.createTask('Test Task', 'Test notes');

      expect(task).toBeDefined();
      expect(task.gid).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.notes).toBe('Test notes');
      expect(task.completed).toBe(false);
    });

    it('should create a task with priority', async () => {
      const task = await backend.createTask('Test Task', 'Notes', undefined, 'high');

      expect(task).toBeDefined();
      expect(task.priority).toBe('high');
      expect(task.tags).toContain('priority:high');
    });

    it('should create a task with due date', async () => {
      const dueDate = '2025-12-31';
      const task = await backend.createTask('Test Task', 'Notes', dueDate);

      expect(task).toBeDefined();
      expect(task.dueOn).toBe(dueDate);
    });

    it('should create a milestone task', async () => {
      const task = await backend.createTask('Milestone', 'Notes', undefined, undefined, true);

      expect(task).toBeDefined();
      expect(task.isMilestone).toBe(true);
    });
  });

  describe('listTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await backend.listTasks();
      expect(tasks).toEqual([]);
    });

    it('should list all created tasks', async () => {
      await backend.createTask('Task 1');
      await backend.createTask('Task 2');
      await backend.createTask('Task 3');

      const tasks = await backend.listTasks();
      expect(tasks).toHaveLength(3);
      expect(tasks.map(t => t.name)).toContain('Task 1');
      expect(tasks.map(t => t.name)).toContain('Task 2');
      expect(tasks.map(t => t.name)).toContain('Task 3');
    });
  });

  describe('getTask', () => {
    it('should retrieve a task by ID', async () => {
      const created = await backend.createTask('Test Task');
      const retrieved = await backend.getTask(created.gid);

      expect(retrieved).toBeDefined();
      expect(retrieved.gid).toBe(created.gid);
      expect(retrieved.name).toBe('Test Task');
    });

    it('should throw error for non-existent task', async () => {
      await expect(backend.getTask('non-existent-id')).rejects.toThrow();
    });
  });

  describe('updateTask', () => {
    it('should update task name', async () => {
      const task = await backend.createTask('Original Name');
      const updated = await backend.updateTask(task.gid, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.gid).toBe(task.gid);
    });

    it('should update task completion status', async () => {
      const task = await backend.createTask('Test Task');
      expect(task.completed).toBe(false);

      const updated = await backend.updateTask(task.gid, { completed: true });
      expect(updated.completed).toBe(true);
    });

    it('should update task priority', async () => {
      const task = await backend.createTask('Test Task');
      const updated = await backend.updateTask(task.gid, { priority: 'high' });

      expect(updated.priority).toBe('high');
      expect(updated.tags).toContain('priority:high');
    });

    it('should update priority tag when priority changes', async () => {
      const task = await backend.createTask('Test Task', undefined, undefined, 'low');
      expect(task.tags).toContain('priority:low');

      const updated = await backend.updateTask(task.gid, { priority: 'high' });
      expect(updated.tags).not.toContain('priority:low');
      expect(updated.tags).toContain('priority:high');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = await backend.createTask('Test Task');
      await backend.deleteTask(task.gid);

      await expect(backend.getTask(task.gid)).rejects.toThrow();
    });

    it('should throw error when deleting non-existent task', async () => {
      await expect(backend.deleteTask('non-existent-id')).rejects.toThrow();
    });
  });

  describe('completeTask', () => {
    it('should mark a task as complete', async () => {
      const task = await backend.createTask('Test Task');
      const completed = await backend.completeTask(task.gid);

      expect(completed.completed).toBe(true);
      expect(completed.gid).toBe(task.gid);
    });
  });

  describe('assignToUser', () => {
    it('should assign a task to a user', async () => {
      const task = await backend.createTask('Test Task');
      const assigned = await backend.assignToUser(task.gid, 'user-123');

      expect(assigned.assigneeGid).toBe('user-123');
    });
  });

  describe('unassignTask', () => {
    it('should unassign a task', async () => {
      const task = await backend.createTask('Test Task');
      await backend.assignToUser(task.gid, 'user-123');

      const unassigned = await backend.unassignTask(task.gid);
      expect(unassigned.assignee).toBeUndefined();
      expect(unassigned.assigneeGid).toBeUndefined();
    });
  });
});
