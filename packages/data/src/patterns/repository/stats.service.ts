/**
 * Repository Statistics Service
 *
 * Handles statistics tracking and persistence for repositories.
 */

export interface RepositoryStats {
  totalItems: number;
  lastUpdated: string;
  itemsByStatus?: Record<string, number>;
  itemsByType?: Record<string, number>;
}

export class RepositoryStatsService {
  private stats: RepositoryStats;
  private loadCallback?: () => Promise<void>;
  private saveCallback?: () => Promise<void>;

  constructor() {
    this.stats = {
      totalItems: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Set callbacks for loading/saving stats
   */
  setCallbacks(
    loadCallback?: () => Promise<void>,
    saveCallback?: () => Promise<void>
  ): void {
    this.loadCallback = loadCallback;
    this.saveCallback = saveCallback;
  }

  /**
   * Get current statistics
   */
  getStats(): RepositoryStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  async updateStats(totalItems: number): Promise<void> {
    this.stats.totalItems = totalItems;
    this.stats.lastUpdated = new Date().toISOString();

    if (this.saveCallback) {
      await this.saveCallback();
    }
  }

  /**
   * Load statistics from persistence
   */
  async loadStats(): Promise<void> {
    if (this.loadCallback) {
      await this.loadCallback();
    }
  }

  /**
   * Set stats directly (for loading from persistence)
   */
  setStats(stats: RepositoryStats): void {
    this.stats = { ...stats };
  }

  /**
   * Reset stats to initial state
   */
  resetStats(): void {
    this.stats = {
      totalItems: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}
