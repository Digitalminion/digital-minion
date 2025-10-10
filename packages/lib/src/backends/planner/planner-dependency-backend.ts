import { IDependencyBackend } from '../core/dependency-backend';
import { Task } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';
import { OneDriveService } from './services/onedrive-service';

/**
 * Dependency graph stored in OneDrive
 */
interface DependencyGraph {
  version: string;
  dependencies: {
    [taskId: string]: string[]; // taskId -> array of task IDs it depends on
  };
  dependents: {
    [taskId: string]: string[]; // taskId -> array of task IDs that depend on it
  };
  lastModified: string;
}

/**
 * Microsoft Planner-based implementation of the IDependencyBackend interface.
 *
 * IMPORTANT LIMITATION: Planner does not have native support for task dependencies.
 * This implementation uses an external JSON file stored in the group's OneDrive
 * to track dependency relationships.
 *
 * The file is stored at: /Planner Dependencies/dependencies.json
 *
 * Pros:
 * - Works within Microsoft Graph ecosystem
 * - Queryable and maintainable
 * - Survives Planner limitations
 *
 * Cons:
 * - Not visible in Planner UI
 * - Requires manual synchronization if tasks are deleted
 * - Additional API call overhead
 * - No automatic blocking/enforcement of dependencies
 */
export class PlannerDependencyBackend extends PlannerBackendBase implements IDependencyBackend {
  private oneDriveService: OneDriveService;
  private readonly DEPENDENCIES_FILE_PATH = 'Planner Dependencies/dependencies.json';

  constructor(config: PlannerConfig) {
    super(config);
    this.oneDriveService = new OneDriveService(this.graphClient, this.groupId);
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      const graph = await this.loadDependencyGraph();

      // Add to dependencies map
      if (!graph.dependencies[taskId]) {
        graph.dependencies[taskId] = [];
      }
      if (!graph.dependencies[taskId].includes(dependsOnTaskId)) {
        graph.dependencies[taskId].push(dependsOnTaskId);
      }

      // Add to dependents map (reverse index)
      if (!graph.dependents[dependsOnTaskId]) {
        graph.dependents[dependsOnTaskId] = [];
      }
      if (!graph.dependents[dependsOnTaskId].includes(taskId)) {
        graph.dependents[dependsOnTaskId].push(taskId);
      }

      await this.saveDependencyGraph(graph);
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error}`);
    }
  }

  async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      const graph = await this.loadDependencyGraph();

      // Remove from dependencies map
      if (graph.dependencies[taskId]) {
        graph.dependencies[taskId] = graph.dependencies[taskId].filter(
          (id) => id !== dependsOnTaskId
        );
        if (graph.dependencies[taskId].length === 0) {
          delete graph.dependencies[taskId];
        }
      }

      // Remove from dependents map
      if (graph.dependents[dependsOnTaskId]) {
        graph.dependents[dependsOnTaskId] = graph.dependents[dependsOnTaskId].filter(
          (id) => id !== taskId
        );
        if (graph.dependents[dependsOnTaskId].length === 0) {
          delete graph.dependents[dependsOnTaskId];
        }
      }

      await this.saveDependencyGraph(graph);
    } catch (error) {
      throw new Error(`Failed to remove dependency: ${error}`);
    }
  }

  async getDependencies(taskId: string): Promise<Task[]> {
    try {
      const graph = await this.loadDependencyGraph();
      const dependencyIds = graph.dependencies[taskId] || [];

      // Fetch all dependency tasks
      const tasks: Task[] = [];
      for (const depId of dependencyIds) {
        try {
          const task = await this.graphClient.get<any>(`/planner/tasks/${depId}`);
          tasks.push({
            gid: task.id,
            name: task.title,
            completed: task.percentComplete === 100,
            notes: undefined,
            dueOn: task.dueDateTime ? task.dueDateTime.split('T')[0] : undefined,
            startOn: task.startDateTime ? task.startDateTime.split('T')[0] : undefined,
          });
        } catch (error) {
          // Task might have been deleted, skip it
          console.warn(`Failed to fetch dependency task ${depId}: ${error}`);
        }
      }

      return tasks;
    } catch (error) {
      throw new Error(`Failed to get dependencies: ${error}`);
    }
  }

  async getDependents(taskId: string): Promise<Task[]> {
    try {
      const graph = await this.loadDependencyGraph();
      const dependentIds = graph.dependents[taskId] || [];

      // Fetch all dependent tasks
      const tasks: Task[] = [];
      for (const depId of dependentIds) {
        try {
          const task = await this.graphClient.get<any>(`/planner/tasks/${depId}`);
          tasks.push({
            gid: task.id,
            name: task.title,
            completed: task.percentComplete === 100,
            notes: undefined,
            dueOn: task.dueDateTime ? task.dueDateTime.split('T')[0] : undefined,
            startOn: task.startDateTime ? task.startDateTime.split('T')[0] : undefined,
          });
        } catch (error) {
          // Task might have been deleted, skip it
          console.warn(`Failed to fetch dependent task ${depId}: ${error}`);
        }
      }

      return tasks;
    } catch (error) {
      throw new Error(`Failed to get dependents: ${error}`);
    }
  }

  /**
   * List dependency IDs (lighter weight than getDependencies)
   */
  async listDependencies(taskId: string): Promise<string[]> {
    try {
      const graph = await this.loadDependencyGraph();
      return graph.dependencies[taskId] || [];
    } catch (error) {
      throw new Error(`Failed to list dependencies: ${error}`);
    }
  }

  /**
   * List dependent IDs (lighter weight than getDependents)
   */
  async listDependents(taskId: string): Promise<string[]> {
    try {
      const graph = await this.loadDependencyGraph();
      return graph.dependents[taskId] || [];
    } catch (error) {
      throw new Error(`Failed to list dependents: ${error}`);
    }
  }

  /**
   * Clean up dependencies for a deleted task
   *
   * Extension method - should be called when a task is deleted
   * to remove all its dependency relationships
   *
   * @param taskId - The deleted task ID
   */
  async cleanupTaskDependencies(taskId: string): Promise<void> {
    try {
      const graph = await this.loadDependencyGraph();

      // Remove this task's dependencies
      delete graph.dependencies[taskId];

      // Remove this task from all dependents lists
      for (const [depTaskId, deps] of Object.entries(graph.dependencies)) {
        graph.dependencies[depTaskId] = deps.filter((id) => id !== taskId);
        if (graph.dependencies[depTaskId].length === 0) {
          delete graph.dependencies[depTaskId];
        }
      }

      // Remove this task's dependents
      delete graph.dependents[taskId];

      // Remove this task from all dependencies lists
      for (const [depTaskId, deps] of Object.entries(graph.dependents)) {
        graph.dependents[depTaskId] = deps.filter((id) => id !== taskId);
        if (graph.dependents[depTaskId].length === 0) {
          delete graph.dependents[depTaskId];
        }
      }

      await this.saveDependencyGraph(graph);
    } catch (error) {
      throw new Error(`Failed to cleanup task dependencies: ${error}`);
    }
  }

  /**
   * Load the dependency graph from OneDrive
   */
  private async loadDependencyGraph(): Promise<DependencyGraph> {
    try {
      // Ensure the folder exists
      await this.oneDriveService.ensureFolder('Planner Dependencies');

      // Try to get the file
      const path = `/groups/${this.groupId}/drive/root:/${this.DEPENDENCIES_FILE_PATH}:/content`;

      try {
        const content = await this.graphClient.get<string>(path);
        return JSON.parse(content);
      } catch (error) {
        // File doesn't exist, create empty graph
        const emptyGraph: DependencyGraph = {
          version: '1.0',
          dependencies: {},
          dependents: {},
          lastModified: new Date().toISOString(),
        };
        await this.saveDependencyGraph(emptyGraph);
        return emptyGraph;
      }
    } catch (error) {
      throw new Error(`Failed to load dependency graph: ${error}`);
    }
  }

  /**
   * Save the dependency graph to OneDrive
   */
  private async saveDependencyGraph(graph: DependencyGraph): Promise<void> {
    try {
      graph.lastModified = new Date().toISOString();

      const content = JSON.stringify(graph, null, 2);

      await this.oneDriveService.uploadFile(
        Buffer.from(content, 'utf-8'),
        'dependencies.json',
        'Planner Dependencies'
      );
    } catch (error) {
      throw new Error(`Failed to save dependency graph: ${error}`);
    }
  }

  /**
   * Get all tasks that are blocked (have unmet dependencies)
   *
   * Extension method - useful for finding tasks that can't start yet
   *
   * @returns Map of task ID to array of blocking task IDs
   */
  async getBlockedTasks(): Promise<Map<string, string[]>> {
    try {
      const graph = await this.loadDependencyGraph();
      const blocked = new Map<string, string[]>();

      // Get all tasks from Planner to check completion status
      const tasksResult = await this.graphClient.get<{ value: Array<{ id: string; percentComplete: number }> }>(
        `/planner/plans/${this.planId}/tasks`,
        { select: ['id', 'percentComplete'] }
      );

      const completedTasks = new Set(
        tasksResult.value
          .filter((t) => t.percentComplete === 100)
          .map((t) => t.id)
      );

      // Check each task with dependencies
      for (const [taskId, deps] of Object.entries(graph.dependencies)) {
        const incompleteDeps = deps.filter((depId) => !completedTasks.has(depId));
        if (incompleteDeps.length > 0) {
          blocked.set(taskId, incompleteDeps);
        }
      }

      return blocked;
    } catch (error) {
      throw new Error(`Failed to get blocked tasks: ${error}`);
    }
  }
}
