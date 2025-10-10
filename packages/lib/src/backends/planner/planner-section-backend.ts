import { ISectionBackend } from '../core/section-backend';
import { Section } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';

/**
 * Represents a Planner bucket from the Graph API
 */
interface PlannerBucket {
  id: string;
  name: string;
  planId: string;
  orderHint: string;
  '@odata.etag': string;
}

/**
 * Represents a Planner task for bucket assignment
 */
interface PlannerTask {
  id: string;
  bucketId?: string;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the ISectionBackend interface.
 *
 * In Planner, "buckets" are the equivalent of sections. They are columns
 * in the board view that group tasks together.
 */
export class PlannerSectionBackend extends PlannerBackendBase implements ISectionBackend {
  constructor(config: PlannerConfig) {
    super(config);
  }

  async listSections(): Promise<Section[]> {
    try {
      const result = await this.graphClient.get<{ value: PlannerBucket[] }>(
        `/planner/plans/${this.planId}/buckets`,
        {
          select: ['id', 'name', 'orderHint'],
        }
      );

      return result.value.map((bucket) => ({
        gid: bucket.id,
        name: bucket.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list sections: ${error}`);
    }
  }

  async createSection(name: string): Promise<Section> {
    try {
      const bucket = await this.graphClient.post<PlannerBucket>(
        '/planner/buckets',
        {
          name,
          planId: this.planId,
          orderHint: ' !', // Places at the end
        }
      );

      return {
        gid: bucket.id,
        name: bucket.name,
      };
    } catch (error) {
      throw new Error(`Failed to create section: ${error}`);
    }
  }

  async moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        (etag) =>
          this.graphClient.patch<PlannerTask>(
            `/planner/tasks/${taskId}`,
            {
              bucketId: sectionId,
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to move task to section: ${error}`);
    }
  }

  /**
   * Delete a section (bucket)
   *
   * Extension method - not in core interface but useful
   *
   * @param sectionId - The bucket ID to delete
   */
  async deleteSection(sectionId: string): Promise<void> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerBucket>(`/planner/buckets/${sectionId}`),
        (etag) =>
          this.graphClient.delete(`/planner/buckets/${sectionId}`, {
            headers: { 'If-Match': etag },
          })
      );
    } catch (error) {
      throw new Error(`Failed to delete section: ${error}`);
    }
  }
}
