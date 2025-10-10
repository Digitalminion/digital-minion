import { IGraphClient, GraphClient } from './graph-client';

/**
 * Microsoft Planner-specific configuration interface.
 *
 * Contains all the settings required to connect to and interact with
 * the Microsoft Graph API for a specific plan.
 */
export interface PlannerConfig {
  /** Microsoft Graph API access token for authentication. */
  accessToken: string;

  /** The tenant ID to operate within. */
  tenantId: string;

  /** The plan ID to operate within. */
  planId: string;

  /** The group ID that owns the plan (required for comments, files, etc.). */
  groupId: string;

  /** Optional: Provide a custom Graph client (useful for testing). */
  graphClient?: IGraphClient;
}

/**
 * Base class for all Planner backend implementations.
 *
 * Provides shared Microsoft Graph client initialization and configuration
 * that all domain backends can extend from.
 *
 * The base class uses dependency injection for the Graph client, making
 * it testable and allowing for mock implementations.
 */
export class PlannerBackendBase {
  protected graphClient: IGraphClient;
  protected accessToken: string;
  protected tenantId: string;
  protected planId: string;
  protected groupId: string;

  constructor(config: PlannerConfig) {
    // Use provided client or create new one
    this.graphClient = config.graphClient || new GraphClient(config.accessToken);

    this.accessToken = config.accessToken;
    this.tenantId = config.tenantId;
    this.planId = config.planId;
    this.groupId = config.groupId;
  }

  /**
   * Helper to handle etag requirements for Planner API.
   * All PATCH/DELETE operations require If-Match header with current etag.
   */
  protected async withEtag<T>(
    getResource: () => Promise<{ '@odata.etag': string }>,
    operation: (etag: string) => Promise<T>
  ): Promise<T> {
    const resource = await getResource();
    const etag = resource['@odata.etag'];
    return await operation(etag);
  }
}
