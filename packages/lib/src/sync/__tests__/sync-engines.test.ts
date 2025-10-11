import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OneWaySyncEngine } from '../one-way-sync.engine';
import { TwoWaySyncEngine } from '../two-way-sync.engine';
import { SyncStateManager } from '../sync-state.manager';
import { SyncDirection, ConflictStrategy, SyncBackend } from '../sync.types';
import { BackendFactory } from '../../backends/factory';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Sync Engines', () => {
  let tempDir: string;
  let sourceBackend: SyncBackend;
  let targetBackend: SyncBackend;
  let stateManager: SyncStateManager;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = path.join(os.tmpdir(), `dm-sync-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Create source backend (local)
    const sourceBackends = BackendFactory.createAllBackends({
      backend: 'local',
      config: {
        basePath: path.join(tempDir, 'source'),
        projectId: 'test-project',
      },
    });

    sourceBackend = {
      id: 'source',
      name: 'Source Local',
      type: 'local',
      backends: sourceBackends,
    };

    // Create target backend (local)
    const targetBackends = BackendFactory.createAllBackends({
      backend: 'local',
      config: {
        basePath: path.join(tempDir, 'target'),
        projectId: 'test-project',
      },
    });

    targetBackend = {
      id: 'target',
      name: 'Target Local',
      type: 'local',
      backends: targetBackends,
    };

    // Create state manager
    stateManager = new SyncStateManager(tempDir, 'source-target');
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('OneWaySyncEngine', () => {
    it('should sync tasks from source to target', async () => {
      // Create tasks in source
      const task1 = await sourceBackend.backends.task.createTask('Task 1', 'Notes 1');
      const task2 = await sourceBackend.backends.task.createTask('Task 2', 'Notes 2');

      // Configure sync
      const config = {
        direction: SyncDirection.ONE_WAY,
        conflictStrategy: ConflictStrategy.SOURCE_WINS,
        syncTags: false,
        syncSections: false,
      };

      // Create engine and sync
      const engine = new OneWaySyncEngine(sourceBackend, targetBackend, stateManager, config);
      const result = await engine.sync();

      // Verify results
      if (!result.success) {
        console.error('Sync failed with errors:', JSON.stringify(result.errors, null, 2));
      }
      expect(result.success).toBe(true);
      expect(result.stats.itemsCreated).toBe(2);
      expect(result.stats.itemsUpdated).toBe(0);
      expect(result.errors.length).toBe(0);

      // Verify tasks in target
      const targetTasks = await targetBackend.backends.task.listTasks();
      expect(targetTasks.length).toBe(2);
      expect(targetTasks.map(t => t.name)).toContain('Task 1');
      expect(targetTasks.map(t => t.name)).toContain('Task 2');
    });

    it('should update existing tasks in target', async () => {
      // Create and sync initial task
      const task = await sourceBackend.backends.task.createTask('Initial Task', 'Initial notes');

      let engine = new OneWaySyncEngine(sourceBackend, targetBackend, stateManager, {
        direction: SyncDirection.ONE_WAY,
        conflictStrategy: ConflictStrategy.SOURCE_WINS,
      });

      await engine.sync();

      // Update task in source
      await sourceBackend.backends.task.updateTask(task.gid, {
        name: 'Updated Task',
        notes: 'Updated notes',
      });

      // Sync again
      const result = await engine.sync();

      // Verify update was synced
      expect(result.success).toBe(true);
      expect(result.stats.itemsUpdated).toBe(1);

      const targetTasks = await targetBackend.backends.task.listTasks();
      expect(targetTasks.length).toBe(1);
      expect(targetTasks[0].name).toBe('Updated Task');
      expect(targetTasks[0].notes).toBe('Updated notes');
    });

    it('should handle dry-run mode', async () => {
      // Create task in source
      await sourceBackend.backends.task.createTask('Test Task');

      // Sync in dry-run mode
      const engine = new OneWaySyncEngine(sourceBackend, targetBackend, stateManager, {
        direction: SyncDirection.ONE_WAY,
        conflictStrategy: ConflictStrategy.SOURCE_WINS,
        dryRun: true,
      });

      const result = await engine.sync();

      // Verify dry run detected changes but didn't write
      expect(result.success).toBe(true);
      expect(result.stats.itemsCreated).toBe(1); // Detected but not actually created

      // Verify target is still empty
      const targetTasks = await targetBackend.backends.task.listTasks();
      expect(targetTasks.length).toBe(0);
    });
  });

  describe('TwoWaySyncEngine', () => {
    it('should sync changes from both backends', async () => {
      // Create task in source
      const sourceTask = await sourceBackend.backends.task.createTask('Source Task');

      // Create task in target
      const targetTask = await targetBackend.backends.task.createTask('Target Task');

      // Configure two-way sync
      const config = {
        direction: SyncDirection.TWO_WAY,
        conflictStrategy: ConflictStrategy.LAST_WRITE_WINS,
      };

      // Sync
      const engine = new TwoWaySyncEngine(sourceBackend, targetBackend, stateManager, config);
      const result = await engine.sync();

      // Verify both tasks are in both backends
      expect(result.success).toBe(true);

      const sourceTasks = await sourceBackend.backends.task.listTasks();
      const targetTasks = await targetBackend.backends.task.listTasks();

      expect(sourceTasks.length).toBe(2);
      expect(targetTasks.length).toBe(2);

      expect(sourceTasks.map(t => t.name)).toContain('Source Task');
      expect(sourceTasks.map(t => t.name)).toContain('Target Task');
      expect(targetTasks.map(t => t.name)).toContain('Source Task');
      expect(targetTasks.map(t => t.name)).toContain('Target Task');
    });

    it('should resolve conflicts using LAST_WRITE_WINS', async () => {
      // Create task in source and sync
      const task = await sourceBackend.backends.task.createTask('Initial Task', 'Initial');

      let engine = new TwoWaySyncEngine(sourceBackend, targetBackend, stateManager, {
        direction: SyncDirection.TWO_WAY,
        conflictStrategy: ConflictStrategy.LAST_WRITE_WINS,
      });

      await engine.sync();

      // Get synced task IDs
      const sourceTasks = await sourceBackend.backends.task.listTasks();
      const targetTasks = await targetBackend.backends.task.listTasks();
      const sourceTaskId = sourceTasks[0].gid;
      const targetTaskId = targetTasks[0].gid;

      // Simulate conflict: update in both backends
      await sourceBackend.backends.task.updateTask(sourceTaskId, {
        notes: 'Source update',
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await targetBackend.backends.task.updateTask(targetTaskId, {
        notes: 'Target update (later)',
      });

      // Sync again
      const result = await engine.sync();

      // Verify conflict was resolved (target wins because it was later)
      expect(result.success).toBe(true);

      const finalSourceTasks = await sourceBackend.backends.task.listTasks();
      const finalTargetTasks = await targetBackend.backends.task.listTasks();

      // Both should have the later update
      expect(finalSourceTasks[0].notes).toBe('Target update (later)');
      expect(finalTargetTasks[0].notes).toBe('Target update (later)');
    });
  });

  describe('SyncStateManager', () => {
    it('should create and retrieve sync items', async () => {
      const backendIds = {
        source: 'task-123',
        target: 'task-456',
      };

      const versions = {
        source: 'v1',
        target: 'v1',
      };

      // Create sync item
      const syncId = await stateManager.createSyncItem(backendIds, versions);
      expect(syncId).toBeDefined();

      // Retrieve sync item
      const syncItem = await stateManager.getSyncItem(syncId);
      expect(syncItem).toBeDefined();
      expect(syncItem?.backendIds.source).toBe('task-123');
      expect(syncItem?.backendIds.target).toBe('task-456');
    });

    it('should create and retrieve ID mappings', async () => {
      // Create mapping
      await stateManager.createIdMapping('source', 'task-123', 'target', 'task-456');

      // Retrieve mapping
      const targetId = await stateManager.getIdMapping('source', 'task-123', 'target');
      expect(targetId).toBe('task-456');

      // Reverse mapping
      const sourceId = await stateManager.getIdMapping('target', 'task-456', 'source');
      expect(sourceId).toBe('task-123');
    });

    it('should find sync item by backend ID', async () => {
      const backendIds = {
        source: 'task-789',
        target: 'task-abc',
      };

      const syncId = await stateManager.createSyncItem(backendIds, {});

      // Find by source ID
      const foundBySource = await stateManager.findSyncItemByBackendId('source', 'task-789');
      expect(foundBySource?.syncId).toBe(syncId);

      // Find by target ID
      const foundByTarget = await stateManager.findSyncItemByBackendId('target', 'task-abc');
      expect(foundByTarget?.syncId).toBe(syncId);
    });
  });
});
