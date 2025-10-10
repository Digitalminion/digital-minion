import { ITagBackend } from '../core/tag-backend';
import { Tag } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';

/**
 * Represents Planner plan details with category descriptions
 */
interface PlannerPlanDetails {
  id: string;
  categoryDescriptions: {
    category1?: string;
    category2?: string;
    category3?: string;
    category4?: string;
    category5?: string;
    category6?: string;
    category7?: string;
    category8?: string;
    category9?: string;
    category10?: string;
    category11?: string;
    category12?: string;
    category13?: string;
    category14?: string;
    category15?: string;
    category16?: string;
    category17?: string;
    category18?: string;
    category19?: string;
    category20?: string;
    category21?: string;
    category22?: string;
    category23?: string;
    category24?: string;
    category25?: string;
  };
  '@odata.etag': string;
}

/**
 * Represents a Planner task with categories
 */
interface PlannerTask {
  id: string;
  appliedCategories?: Record<string, boolean>;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the ITagBackend interface.
 *
 * Note: Planner uses "categories" which are plan-specific (not workspace-wide).
 * Each plan has exactly 25 category slots (category1-category25).
 * Category labels are stored in the plan details.
 */
export class PlannerTagBackend extends PlannerBackendBase implements ITagBackend {
  constructor(config: PlannerConfig) {
    super(config);
  }

  async listTags(): Promise<Tag[]> {
    try {
      const planDetails = await this.getPlanDetails();

      const tags: Tag[] = [];
      const categories = planDetails.categoryDescriptions;

      // Iterate through all 25 category slots
      for (let i = 1; i <= 25; i++) {
        const categoryKey = `category${i}` as keyof typeof categories;
        const categoryLabel = categories[categoryKey];

        if (categoryLabel) {
          tags.push({
            gid: categoryKey,
            name: categoryLabel,
          });
        }
      }

      return tags;
    } catch (error) {
      throw new Error(`Failed to list tags: ${error}`);
    }
  }

  async createTag(name: string): Promise<Tag> {
    try {
      const categoryId = await this.ensureCategory(name);
      return {
        gid: categoryId,
        name,
      };
    } catch (error) {
      throw new Error(`Failed to create tag: ${error}`);
    }
  }

  async addTagToTask(taskId: string, tagName: string): Promise<void> {
    try {
      // Find or create the category
      const categoryId = await this.ensureCategory(tagName);

      // Add category to task
      await this.withEtag(
        () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        (etag) =>
          this.graphClient.patch<PlannerTask>(
            `/planner/tasks/${taskId}`,
            {
              appliedCategories: {
                [categoryId]: true,
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to add tag to task: ${error}`);
    }
  }

  async removeTagFromTask(taskId: string, tagName: string): Promise<void> {
    try {
      // Find the category ID for this tag name
      const planDetails = await this.getPlanDetails();
      const categoryId = this.findCategoryIdByName(planDetails, tagName);

      if (!categoryId) {
        // Tag doesn't exist, nothing to remove
        return;
      }

      // Remove category from task
      await this.withEtag(
        () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        (etag) =>
          this.graphClient.patch<PlannerTask>(
            `/planner/tasks/${taskId}`,
            {
              appliedCategories: {
                [categoryId]: null, // Setting to null removes it
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to remove tag from task: ${error}`);
    }
  }

  async getTasksByTag(tagName: string): Promise<string[]> {
    try {
      // Find the category ID for this tag
      const planDetails = await this.getPlanDetails();
      const categoryId = this.findCategoryIdByName(planDetails, tagName);

      if (!categoryId) {
        return [];
      }

      // Get all tasks in the plan
      const result = await this.graphClient.get<{ value: PlannerTask[] }>(
        `/planner/plans/${this.planId}/tasks`,
        {
          select: ['id', 'appliedCategories'],
        }
      );

      // Filter tasks that have this category applied
      return result.value
        .filter(
          (task) =>
            task.appliedCategories &&
            task.appliedCategories[categoryId] === true
        )
        .map((task) => task.id);
    } catch (error) {
      throw new Error(`Failed to get tasks by tag: ${error}`);
    }
  }

  /**
   * Get plan details with category descriptions
   */
  private async getPlanDetails(): Promise<PlannerPlanDetails> {
    try {
      const details = await this.graphClient.get<PlannerPlanDetails>(
        `/planner/plans/${this.planId}/details`
      );
      return details;
    } catch (error) {
      throw new Error(`Failed to get plan details: ${error}`);
    }
  }

  /**
   * Find category ID by name in plan details
   */
  private findCategoryIdByName(
    planDetails: PlannerPlanDetails,
    tagName: string
  ): string | null {
    const categories = planDetails.categoryDescriptions;

    for (let i = 1; i <= 25; i++) {
      const categoryKey = `category${i}` as keyof typeof categories;
      if (categories[categoryKey] === tagName) {
        return categoryKey;
      }
    }

    return null;
  }

  /**
   * Ensure a category exists with the given name, create if needed
   * Returns the category ID (e.g., "category1")
   */
  private async ensureCategory(tagName: string): Promise<string> {
    const planDetails = await this.getPlanDetails();

    // Check if category already exists
    const existingCategoryId = this.findCategoryIdByName(planDetails, tagName);
    if (existingCategoryId) {
      return existingCategoryId;
    }

    // Find first empty category slot
    const categories = planDetails.categoryDescriptions;
    for (let i = 1; i <= 25; i++) {
      const categoryKey = `category${i}` as keyof typeof categories;
      if (!categories[categoryKey]) {
        // Found empty slot, use it
        await this.updateCategoryLabel(categoryKey, tagName, planDetails['@odata.etag']);
        return categoryKey;
      }
    }

    throw new Error('All 25 category slots are in use. Cannot create new tag.');
  }

  /**
   * Update a category label in plan details
   */
  private async updateCategoryLabel(
    categoryId: string,
    label: string,
    etag: string
  ): Promise<void> {
    try {
      await this.graphClient.patch<PlannerPlanDetails>(
        `/planner/plans/${this.planId}/details`,
        {
          categoryDescriptions: {
            [categoryId]: label,
          },
        },
        { headers: { 'If-Match': etag } }
      );
    } catch (error) {
      throw new Error(`Failed to update category label: ${error}`);
    }
  }
}
