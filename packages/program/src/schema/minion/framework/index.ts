/**
 * Framework Schema Namespace
 *
 * Defines infrastructure types for adapters, managers, and backend integration.
 * These types support the translation layer between domain models and backend implementations.
 */

import { BackendType, ProgramContext } from '../standard';
import { Matter, Activity, DiscreteTask, CreateMatterInput, CreateActivityInput, CreateDiscreteTaskInput, MatterStatistics } from '../function/matter';
import { Project, Feature, ProjectTask, ProjectSubtask, CreateProjectInput, CreateFeatureInput, CreateProjectTaskInput, CreateProjectSubtaskInput, ProjectStatistics, FeatureBurndownData } from '../function/project';
import { MaintenanceProcess, MaintenanceTask, MaintenanceStep, CreateMaintenanceProcessInput, GenerateMaintenanceTasksInput, GenerateMaintenanceTasksResult, MaintenanceSchedule } from '../function/maintenance';

/**
 * BackendAdapter base configuration
 */
export interface BackendAdapterConfig {
  /** Backend instance to use */
  backend: any; // AllBackends from @digital-minion/lib

  /** Program context */
  context: ProgramContext;

  /** Optional: Additional configuration */
  options?: {
    /** Whether to create missing sections/projects automatically */
    autoCreate?: boolean;

    /** Whether to use tags for metadata */
    useTags?: boolean;

    /** Whether to use custom fields for metadata (if supported) */
    useCustomFields?: boolean;

    /** Dry run mode - don't actually create/modify backend items */
    dryRun?: boolean;
  };
}

/**
 * Base backend adapter interface.
 * All function-specific adapters extend this.
 */
export interface IBackendAdapter {
  /** Backend instance */
  readonly backend: any;

  /** Program context */
  readonly context: ProgramContext;

  /**
   * Check if backend supports a specific feature.
   */
  supportsFeature(feature: BackendFeature): boolean;

  /**
   * Initialize the adapter (e.g., ensure project exists, create sections).
   */
  initialize(): Promise<void>;

  /**
   * Get backend-specific metadata tags.
   */
  getMetadataTags(): string[];

  /**
   * Sync local changes to backend.
   */
  syncToBackend?(): Promise<SyncResult>;

  /**
   * Sync backend changes to local.
   */
  syncFromBackend?(): Promise<SyncResult>;
}

/**
 * Backend features that may or may not be supported
 */
export enum BackendFeature {
  /** Milestone support */
  MILESTONES = 'milestones',

  /** Custom fields */
  CUSTOM_FIELDS = 'custom-fields',

  /** Task dependencies */
  DEPENDENCIES = 'dependencies',

  /** Time tracking */
  TIME_TRACKING = 'time-tracking',

  /** Attachments */
  ATTACHMENTS = 'attachments',

  /** Comments */
  COMMENTS = 'comments',

  /** Tags */
  TAGS = 'tags',

  /** Sections */
  SECTIONS = 'sections',

  /** Subtasks */
  SUBTASKS = 'subtasks',

  /** Webhooks */
  WEBHOOKS = 'webhooks',

  /** Search */
  SEARCH = 'search',

  /** Batch operations */
  BATCH_OPERATIONS = 'batch-operations'
}

/**
 * Sync result from backend operations
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;

  /** Number of items synced */
  itemsSynced: number;

  /** Number of items created */
  itemsCreated: number;

  /** Number of items updated */
  itemsUpdated: number;

  /** Number of items deleted */
  itemsDeleted: number;

  /** Number of conflicts */
  conflicts: number;

  /** Errors encountered */
  errors: SyncError[];

  /** Sync duration in milliseconds */
  durationMs: number;
}

/**
 * Sync error details
 */
export interface SyncError {
  /** Error type */
  type: 'network' | 'validation' | 'conflict' | 'permission' | 'unknown';

  /** Error message */
  message: string;

  /** Item ID that caused error */
  itemId?: string;

  /** Stack trace (if available) */
  stack?: string;
}

/**
 * Project-specific adapter interface
 */
export interface IProjectAdapter extends IBackendAdapter {
  // Project operations
  createProject(input: CreateProjectInput): Promise<Project>;
  getProject(projectId: string): Promise<Project>;
  updateProject(projectId: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(): Promise<Project[]>;

  // Feature operations
  createFeature(input: CreateFeatureInput): Promise<Feature>;
  getFeature(featureId: string): Promise<Feature>;
  updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature>;
  deleteFeature(featureId: string): Promise<void>;
  listFeatures(projectId: string): Promise<Feature[]>;

  // Task operations
  createTask(input: CreateProjectTaskInput): Promise<ProjectTask>;
  getTask(taskId: string): Promise<ProjectTask>;
  updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask>;
  deleteTask(taskId: string): Promise<void>;
  listTasks(projectId: string, featureId?: string): Promise<ProjectTask[]>;
  moveTaskToStage(taskId: string, stage: string): Promise<void>;

  // Subtask operations
  createSubtask(input: CreateProjectSubtaskInput): Promise<ProjectSubtask>;
  updateSubtask(subtaskId: string, updates: Partial<ProjectSubtask>): Promise<ProjectSubtask>;
  deleteSubtask(subtaskId: string): Promise<void>;
  listSubtasks(taskId: string): Promise<ProjectSubtask[]>;
}

/**
 * Matter-specific adapter interface
 */
export interface IMatterAdapter extends IBackendAdapter {
  // Matter operations
  createMatter(input: CreateMatterInput): Promise<Matter>;
  getMatter(matterId: string): Promise<Matter>;
  updateMatter(matterId: string, updates: Partial<Matter>): Promise<Matter>;
  deleteMatter(matterId: string): Promise<void>;
  listMatters(): Promise<Matter[]>;

  // Activity operations
  createActivity(input: CreateActivityInput): Promise<Activity>;
  getActivity(activityId: string): Promise<Activity>;
  updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity>;
  deleteActivity(activityId: string): Promise<void>;
  listActivities(matterId: string): Promise<Activity[]>;

  // Discrete task operations
  createDiscreteTask(input: CreateDiscreteTaskInput): Promise<DiscreteTask>;
  updateDiscreteTask(taskId: string, updates: Partial<DiscreteTask>): Promise<DiscreteTask>;
  deleteDiscreteTask(taskId: string): Promise<void>;
  listDiscreteTasks(activityId: string): Promise<DiscreteTask[]>;
}

/**
 * Maintenance-specific adapter interface
 */
export interface IMaintenanceAdapter extends IBackendAdapter {
  // Process operations
  createProcess(input: CreateMaintenanceProcessInput): Promise<MaintenanceProcess>;
  getProcess(processId: string): Promise<MaintenanceProcess>;
  updateProcess(processId: string, updates: Partial<MaintenanceProcess>): Promise<MaintenanceProcess>;
  deleteProcess(processId: string): Promise<void>;
  listProcesses(): Promise<MaintenanceProcess[]>;

  // Task generation
  generateTasks(input: GenerateMaintenanceTasksInput): Promise<GenerateMaintenanceTasksResult>;

  // Task operations
  getTask(taskId: string): Promise<MaintenanceTask>;
  updateTask(taskId: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask>;
  deleteTask(taskId: string): Promise<void>;
  listTasks(processId?: string): Promise<MaintenanceTask[]>;

  // Step operations
  updateStep(stepId: string, updates: Partial<MaintenanceStep>): Promise<MaintenanceStep>;
}

/**
 * Manager base interface.
 * Managers contain business logic and orchestrate adapter operations.
 */
export interface IManager {
  /** Adapter instance */
  readonly adapter: IBackendAdapter;

  /** Program context */
  readonly context: ProgramContext;

  /**
   * Initialize the manager.
   */
  initialize(): Promise<void>;
}

/**
 * Project manager interface
 */
export interface IProjectManager extends IManager {
  readonly adapter: IProjectAdapter;

  // High-level project operations
  getProject(): Promise<Project>;
  createFeature(input: Omit<CreateFeatureInput, 'projectId'>): Promise<Feature>;
  createTask(input: Omit<CreateProjectTaskInput, 'projectId'>): Promise<ProjectTask>;
  createSubtask(input: CreateProjectSubtaskInput): Promise<ProjectSubtask>;

  // Workflow operations
  moveTaskToStage(taskId: string, stage: string): Promise<ProjectTask>;
  completeTask(taskId: string): Promise<void>;
  completeSubtask(subtaskId: string): Promise<void>;

  // Analytics and reporting
  getStatistics(): Promise<ProjectStatistics>;
  getFeatureBurndown(featureId: string): Promise<FeatureBurndownData>;
  getVelocity(): Promise<any>;
  getHealth(): Promise<any>;
}

/**
 * Matter manager interface
 */
export interface IMatterManager extends IManager {
  readonly adapter: IMatterAdapter;

  // High-level matter operations
  createMatter(input: CreateMatterInput): Promise<Matter>;
  getMatter(matterId: string): Promise<Matter>;
  listMatters(filter?: any): Promise<Matter[]>;

  // Activity operations
  addActivity(input: Omit<CreateActivityInput, 'matterId'>): Promise<Activity>;
  addDiscreteTask(activityId: string, input: Omit<CreateDiscreteTaskInput, 'activityId'>): Promise<DiscreteTask>;

  // Workflow operations
  escalateMatter(matterId: string, escalateTo: string, reason: string): Promise<void>;
  resolveMatter(matterId: string, resolutionSummary: string, rootCause?: string): Promise<void>;
  closeMatter(matterId: string, reason: string): Promise<void>;

  // SLA operations
  checkSLA(matterId: string): Promise<any>;
  getMattersAtRisk(): Promise<Matter[]>;
  getMattersBreached(): Promise<Matter[]>;

  // Analytics
  getStatistics(): Promise<MatterStatistics>;
}

/**
 * Maintenance manager interface
 */
export interface IMaintenanceManager extends IManager {
  readonly adapter: IMaintenanceAdapter;

  // Process operations
  createProcess(input: CreateMaintenanceProcessInput): Promise<MaintenanceProcess>;
  getProcess(processId: string): Promise<MaintenanceProcess>;
  listProcesses(filter?: any): Promise<MaintenanceProcess[]>;
  pauseProcess(processId: string): Promise<void>;
  resumeProcess(processId: string): Promise<void>;

  // Task generation
  generateTasks(input?: GenerateMaintenanceTasksInput): Promise<GenerateMaintenanceTasksResult>;
  generateTasksForProcess(processId: string, lookAheadDays?: number): Promise<GenerateMaintenanceTasksResult>;

  // Task operations
  getTask(taskId: string): Promise<MaintenanceTask>;
  listTasks(filter?: any): Promise<MaintenanceTask[]>;
  completeTask(taskId: string, notes?: string): Promise<void>;
  skipTask(taskId: string, reason: string): Promise<void>;

  // Step operations
  completeStep(stepId: string, notes?: string): Promise<void>;

  // Scheduling
  getSchedule(startDate: string, endDate: string): Promise<MaintenanceSchedule>;
  getUpcomingTasks(days?: number): Promise<MaintenanceTask[]>;
  getOverdueTasks(): Promise<MaintenanceTask[]>;

  // Analytics
  getComplianceReport(startDate: string, endDate: string): Promise<any>;
  getProcessStatistics(processId: string): Promise<any>;
}

/**
 * Framework-specific adapter interface
 */
export interface IFrameworkAdapter extends IBackendAdapter {
  // Framework operations
  createFramework(input: import('../function/framework').CreateFrameworkInput): Promise<import('../function/framework').ControlFramework>;
  getFramework(frameworkId: string): Promise<import('../function/framework').ControlFramework>;
  listFrameworks(): Promise<import('../function/framework').ControlFramework[]>;
  updateFramework(frameworkId: string, updates: Partial<import('../function/framework').ControlFramework>): Promise<import('../function/framework').ControlFramework>;
  deleteFramework(frameworkId: string): Promise<void>;

  // Control operations
  createControl(input: import('../function/framework').CreateControlInput): Promise<import('../function/framework').Control>;
  getControl(controlId: string): Promise<import('../function/framework').Control>;
  listControls(frameworkId: string, filter?: import('../function/framework').FrameworkFilter): Promise<import('../function/framework').Control[]>;
  updateControl(controlId: string, updates: Partial<import('../function/framework').Control>): Promise<import('../function/framework').Control>;
  deleteControl(controlId: string): Promise<void>;

  // Assessment operations
  createAssessment(input: import('../function/framework').CreateAssessmentInput): Promise<import('../function/framework').ControlAssessment>;
  getAssessment(assessmentId: string): Promise<import('../function/framework').ControlAssessment>;
  listAssessments(frameworkId?: string): Promise<import('../function/framework').ControlAssessment[]>;
  updateAssessment(assessmentId: string, updates: Partial<import('../function/framework').ControlAssessment>): Promise<import('../function/framework').ControlAssessment>;
  deleteAssessment(assessmentId: string): Promise<void>;

  // Gap operations
  addGap(input: import('../function/framework').AddControlGapInput): Promise<import('../function/framework').ControlGap>;
  updateGap(gapId: string, updates: Partial<import('../function/framework').ControlGap>): Promise<import('../function/framework').ControlGap>;
  deleteGap(gapId: string): Promise<void>;
  listGaps(frameworkId?: string, assessmentId?: string): Promise<import('../function/framework').ControlGap[]>;

  // Mapping operations
  addMapping(mapping: import('../function/framework').ControlMapping): Promise<void>;
  removeMapping(frameworkId: string, controlId: string, type: string, targetId: string): Promise<void>;
  getMappings(frameworkId: string, controlId?: string): Promise<import('../function/framework').ControlMapping[]>;
}

/**
 * Framework manager interface
 */
export interface IFrameworkManager extends IManager {
  readonly adapter: IFrameworkAdapter;

  // Framework operations
  createFramework(input: import('../function/framework').CreateFrameworkInput): Promise<import('../function/framework').ControlFramework>;
  getFramework(frameworkId: string): Promise<import('../function/framework').ControlFramework>;
  listFrameworks(): Promise<import('../function/framework').ControlFramework[]>;
  updateFramework(frameworkId: string, updates: Partial<import('../function/framework').ControlFramework>): Promise<import('../function/framework').ControlFramework>;

  // Control operations
  createControl(input: import('../function/framework').CreateControlInput): Promise<import('../function/framework').Control>;
  getControl(controlId: string): Promise<import('../function/framework').Control>;
  listControls(frameworkId: string, filter?: import('../function/framework').FrameworkFilter): Promise<import('../function/framework').Control[]>;
  updateControlImplementation(input: import('../function/framework').UpdateControlImplementationInput): Promise<import('../function/framework').Control>;
  addEvidence(input: import('../function/framework').AddEvidenceInput): Promise<void>;

  // Assessment operations
  createAssessment(input: import('../function/framework').CreateAssessmentInput): Promise<import('../function/framework').ControlAssessment>;
  getAssessment(assessmentId: string): Promise<import('../function/framework').ControlAssessment>;
  listAssessments(frameworkId?: string): Promise<import('../function/framework').ControlAssessment[]>;
  completeAssessment(assessmentId: string): Promise<void>;
  approveAssessment(assessmentId: string, approver: string, notes?: string): Promise<void>;

  // Gap management
  addGap(input: import('../function/framework').AddControlGapInput): Promise<import('../function/framework').ControlGap>;
  resolveGap(gapId: string, notes?: string): Promise<void>;
  listGaps(frameworkId?: string, status?: string): Promise<import('../function/framework').ControlGap[]>;

  // Mapping management
  mapControlToPolicy(frameworkId: string, controlId: string, policyId: string, notes?: string): Promise<void>;
  mapControlToRole(frameworkId: string, controlId: string, roleId: string, notes?: string): Promise<void>;
  mapControlToMethod(frameworkId: string, controlId: string, methodId: string, notes?: string): Promise<void>;
  getMappings(frameworkId: string, controlId?: string): Promise<import('../function/framework').ControlMapping[]>;

  // Analytics
  getStatistics(frameworkId: string): Promise<import('../function/framework').FrameworkStatistics>;
  getDashboard(frameworkId: string): Promise<import('../function/framework').FrameworkDashboard>;
  getComplianceTrend(frameworkId: string, startDate: string, endDate: string): Promise<import('../function/framework').ComplianceTrendData[]>;
  getMaturityTrend(frameworkId: string, startDate: string, endDate: string): Promise<import('../function/framework').MaturityTrendData[]>;

  // Control identification
  getControlsRequiringAssessment(frameworkId: string): Promise<import('../function/framework').Control[]>;
  getHighPriorityGaps(frameworkId: string): Promise<import('../function/framework').ControlGap[]>;
  getControlsRequiringAttention(frameworkId: string): Promise<import('../function/framework').Control[]>;
}

/**
 * Program manager factory configuration
 */
export interface ProgramManagerConfig {
  /** Backend instance */
  backend: any;

  /** Program context */
  context: ProgramContext;

  /** Adapter options */
  adapterOptions?: BackendAdapterConfig['options'];
}

/**
 * Program manager - main entry point for program mode operations
 */
export interface IProgramManager {
  /** Current context */
  readonly context: ProgramContext;

  /** Project manager (when functionType is 'project') */
  readonly project?: IProjectManager;

  /** Matter manager (when functionType is 'matter') */
  readonly matter?: IMatterManager;

  /** Maintenance manager (when functionType is 'maintenance') */
  readonly maintenance?: IMaintenanceManager;

  /** Framework manager (when functionType is 'framework') */
  readonly framework?: IFrameworkManager;

  /**
   * Initialize the program manager
   */
  initialize(): Promise<void>;

  /**
   * Switch function type
   */
  switchFunction(functionType: 'project' | 'matter' | 'maintenance' | 'framework'): Promise<void>;

  /**
   * Update context
   */
  updateContext(context: Partial<ProgramContext>): Promise<void>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code: string;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field with warning */
  field: string;

  /** Warning message */
  message: string;

  /** Warning severity */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Backend mapping metadata
 */
export interface BackendMapping {
  /** Local work item type */
  localType: string;

  /** Backend type it maps to */
  backendType: string;

  /** Mapping strategy */
  strategy: 'direct' | 'inverted' | 'composite' | 'custom';

  /** Field mappings */
  fieldMappings: Record<string, string>;

  /** Metadata tags to apply */
  metadataTags: string[];

  /** Custom mapping function (if strategy is 'custom') */
  customMapper?: (input: any) => any;
}

/**
 * Event emitted by adapters and managers
 */
export interface ProgramEvent {
  /** Event type */
  type: string;

  /** Event timestamp */
  timestamp: string;

  /** Entity type affected */
  entityType: string;

  /** Entity ID */
  entityId: string;

  /** Event payload */
  payload: any;

  /** User who triggered event */
  actor?: string;
}

/**
 * Event listener interface
 */
export interface IProgramEventListener {
  /**
   * Handle a program event
   */
  onEvent(event: ProgramEvent): Promise<void>;
}
