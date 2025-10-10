/**
 * Microsoft Planner backend implementations for all domain areas.
 *
 * Exports all Planner-specific backend classes that implement the
 * corresponding domain backend interfaces.
 */

// Configuration and base
export { PlannerConfig, PlannerBackendBase } from './planner-config';

// Graph client abstraction (for testing)
export { IGraphClient, GraphClient, MockGraphClient } from './graph-client';

// Services (encapsulated functionality)
export { OneDriveService } from './services/onedrive-service';
export { GroupsService } from './services/groups-service';

// Backend implementations
export { PlannerTaskBackend } from './planner-task-backend';
export { PlannerCommentBackend } from './planner-comment-backend';
export { PlannerAttachmentBackend } from './planner-attachment-backend';
export { PlannerSubtaskBackend } from './planner-subtask-backend';
export { PlannerTagBackend } from './planner-tag-backend';
export { PlannerUserBackend } from './planner-user-backend';
export { PlannerSectionBackend } from './planner-section-backend';
export { PlannerDependencyBackend } from './planner-dependency-backend';
