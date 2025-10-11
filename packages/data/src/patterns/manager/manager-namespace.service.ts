/**
 * Manager Namespace Service
 *
 * Manages namespace discovery, validation, and tracking for partitioned data.
 */

/**
 * Service for managing namespaces/partitions
 */
export class ManagerNamespaceService {
  private availableNamespaces: string[] = [];
  private supportedNamespaces?: string[];
  private discoverCallback?: () => Promise<void>;

  constructor(supportedNamespaces?: string[]) {
    this.supportedNamespaces = supportedNamespaces;
  }

  /**
   * Set callback for discovering namespaces
   */
  setDiscoverCallback(callback: () => Promise<void>): void {
    this.discoverCallback = callback;
  }

  /**
   * Discover available namespaces
   */
  async discoverNamespaces(): Promise<void> {
    if (this.discoverCallback) {
      await this.discoverCallback();
    }
  }

  /**
   * Get available namespaces
   */
  getAvailableNamespaces(): string[] {
    return [...this.availableNamespaces];
  }

  /**
   * Set available namespaces (called by subclass during discovery)
   */
  setAvailableNamespaces(namespaces: string[]): void {
    this.availableNamespaces = [...namespaces];
  }

  /**
   * Add namespace to available list
   */
  addNamespace(namespace: string): void {
    if (!this.availableNamespaces.includes(namespace)) {
      this.availableNamespaces.push(namespace);
    }
  }

  /**
   * Remove namespace from available list
   */
  removeNamespace(namespace: string): void {
    this.availableNamespaces = this.availableNamespaces.filter(ns => ns !== namespace);
  }

  /**
   * Check if namespace is supported
   */
  isNamespaceSupported(namespace: string): boolean {
    return this.availableNamespaces.includes(namespace);
  }

  /**
   * Get supported namespaces (configured)
   */
  getSupportedNamespaces(): string[] | undefined {
    return this.supportedNamespaces ? [...this.supportedNamespaces] : undefined;
  }

  /**
   * Clear all namespaces
   */
  clearNamespaces(): void {
    this.availableNamespaces = [];
  }
}
