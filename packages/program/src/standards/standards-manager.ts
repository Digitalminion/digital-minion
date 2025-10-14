/**
 * Standards Manager
 *
 * Manages Policy, Role, and Position standards at the team level.
 * Standards are stored in partition structure alongside functions.
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { v7 as uuidv7 } from 'uuid';
import { JsonlRowStorage, JsonObjectStorage } from '@digital-minion/data';
import {
  Policy,
  Role,
  Position,
  CreatePolicyInput,
  CreateRoleInput,
  CreatePositionInput,
  StandardsManifest,
  ResolvedRole,
  ResolvedPosition,
  AccessCheckRequest,
  AccessCheckResult,
  PolicyReference,
  RoleReference,
  PositionReference,
  StandardType
} from './types';

export interface StandardsManagerConfig {
  /** Base path to .minion directory */
  basePath: string;

  /** Team hierarchy */
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;
}

/**
 * Manages standards at the team level
 */
export class StandardsManager {
  private config: StandardsManagerConfig;
  private manifestCache: StandardsManifest | null = null;
  private jsonlStorage: JsonlRowStorage;
  private jsonStorage: JsonObjectStorage;

  constructor(config: StandardsManagerConfig) {
    this.config = config;
    this.jsonlStorage = new JsonlRowStorage();
    this.jsonStorage = new JsonObjectStorage();
  }

  /**
   * Get team base path
   */
  private getTeamPath(): string {
    return join(
      this.config.basePath,
      `administrative_unit=${this.config.administrativeUnit}`,
      `business_unit=${this.config.businessUnit}`,
      `organization=${this.config.organization}`,
      `team=${this.config.team}`
    );
  }

  /**
   * Get policy partition path
   */
  getPolicyPath(scope: string, domain: string): string {
    const partitionDir = join(
      this.getTeamPath(),
      `standard=policy`,
      `scope=${scope}`,
      `domain=${domain}`
    );
    return join(partitionDir, this.getDataFileName(partitionDir));
  }

  /**
   * Get role partition path
   */
  getRolePath(domain: string, level: string): string {
    const partitionDir = join(
      this.getTeamPath(),
      `standard=role`,
      `domain=${domain}`,
      `level=${level}`
    );
    return join(partitionDir, this.getDataFileName(partitionDir));
  }

  /**
   * Get position partition path
   */
  getPositionPath(track: string): string {
    const partitionDir = join(
      this.getTeamPath(),
      `standard=position`,
      `track=${track}`
    );
    return join(partitionDir, this.getDataFileName(partitionDir));
  }

  /**
   * Get or generate data file name for a partition
   */
  private getDataFileName(partitionDir: string): string {
    // Generate a consistent hash based on the partition path
    const hash = this.hashString(partitionDir);
    return `data-${hash}.jsonl`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get manifest path
   */
  getManifestPath(): string {
    return join(
      this.getTeamPath(),
      'standard.manifest.json'
    );
  }

  /**
   * Create a new policy
   */
  async createPolicy(input: CreatePolicyInput): Promise<Policy> {
    const policy: Policy = {
      id: this.generateId('policy', input.name),
      name: input.name,
      version: 1,
      scope: input.scope,
      domain: input.domain,
      statements: input.statements,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure directory exists
    const path = this.getPolicyPath(policy.scope, policy.domain);
    await this.ensureDirectoryExists(path);

    // Append to JSONL file
    await this.jsonlStorage.appendRow(path, policy);

    // Update manifest
    await this.updateManifest();

    return policy;
  }

  /**
   * Create a new role
   */
  async createRole(input: CreateRoleInput): Promise<Role> {
    const role: Role = {
      id: this.generateId('role', input.name),
      name: input.name,
      version: 1,
      domain: input.domain,
      level: input.level,
      extends: input.extends || null,
      policies: input.policies,
      methods: input.methods,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure directory exists
    const path = this.getRolePath(role.domain, role.level);
    await this.ensureDirectoryExists(path);

    // Append to JSONL file
    await this.jsonlStorage.appendRow(path, role);

    // Update manifest
    await this.updateManifest();

    return role;
  }

  /**
   * Create a new position
   */
  async createPosition(input: CreatePositionInput): Promise<Position> {
    const position: Position = {
      id: this.generateId('position', input.title),
      title: input.title,
      version: 1,
      track: input.track,
      roles: input.roles,
      methods: input.methods,
      requiredAttributes: input.requiredAttributes,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure directory exists
    const path = this.getPositionPath(position.track);
    await this.ensureDirectoryExists(path);

    // Append to JSONL file
    await this.jsonlStorage.appendRow(path, position);

    // Update manifest
    await this.updateManifest();

    return position;
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    // Scan all policy partitions
    const teamPath = this.getTeamPath();
    const policyBase = join(teamPath, 'standard=policy');

    try {
      // Read all scope directories
      const scopes = await fs.readdir(policyBase, { withFileTypes: true });

      for (const scopeDir of scopes) {
        if (!scopeDir.isDirectory()) continue;

        const scopePath = join(policyBase, scopeDir.name);
        const domains = await fs.readdir(scopePath, { withFileTypes: true });

        for (const domainDir of domains) {
          if (!domainDir.isDirectory()) continue;

          const partitionPath = join(scopePath, domainDir.name);
          const files = await fs.readdir(partitionPath, { withFileTypes: true });

          // Read all .jsonl files in this partition
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.jsonl')) {
              const filePath = join(partitionPath, file.name);
              const policies = await this.jsonlStorage.readAll(filePath) as Policy[];
              const policy = policies.find(p => p.id === policyId);
              if (policy) return policy;
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
      return null;
    }

    return null;
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role | null> {
    // Scan all role partitions
    const teamPath = this.getTeamPath();
    const roleBase = join(teamPath, 'standard=role');

    try {
      // Read all domain directories
      const domains = await fs.readdir(roleBase, { withFileTypes: true });

      for (const domainDir of domains) {
        if (!domainDir.isDirectory()) continue;

        const domainPath = join(roleBase, domainDir.name);
        const levels = await fs.readdir(domainPath, { withFileTypes: true });

        for (const levelDir of levels) {
          if (!levelDir.isDirectory()) continue;

          const partitionPath = join(domainPath, levelDir.name);
          const files = await fs.readdir(partitionPath, { withFileTypes: true });

          // Read all .jsonl files in this partition
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.jsonl')) {
              const filePath = join(partitionPath, file.name);
              const roles = await this.jsonlStorage.readAll(filePath) as Role[];
              const role = roles.find(r => r.id === roleId);
              if (role) return role;
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
      return null;
    }

    return null;
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId: string): Promise<Position | null> {
    // Scan all position partitions
    const teamPath = this.getTeamPath();
    const positionBase = join(teamPath, 'standard=position');

    try {
      // Read all track directories
      const tracks = await fs.readdir(positionBase, { withFileTypes: true });

      for (const trackDir of tracks) {
        if (!trackDir.isDirectory()) continue;

        const partitionPath = join(positionBase, trackDir.name);
        const files = await fs.readdir(partitionPath, { withFileTypes: true });

        // Read all .jsonl files in this partition
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.jsonl')) {
            const filePath = join(partitionPath, file.name);
            const positions = await this.jsonlStorage.readAll(filePath) as Position[];
            const position = positions.find(p => p.id === positionId);
            if (position) return position;
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
      return null;
    }

    return null;
  }

  /**
   * Resolve role with full inheritance chain
   */
  async resolveRole(roleId: string): Promise<ResolvedRole | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;

    const inheritanceChain: Role[] = [role];
    const allPolicies: Policy[] = [];
    const allMethods = new Set<string>(role.methods);

    // Walk up inheritance chain
    let currentRole = role;
    while (currentRole.extends) {
      const parentRole = await this.getRole(currentRole.extends);
      if (!parentRole) break;

      inheritanceChain.push(parentRole);
      parentRole.methods.forEach(m => allMethods.add(m));
      currentRole = parentRole;
    }

    // Collect all policies (child first for override)
    for (const r of inheritanceChain) {
      for (const policyId of r.policies) {
        const policy = await this.getPolicy(policyId);
        if (policy) {
          allPolicies.push(policy);
        }
      }
    }

    return {
      ...role,
      allPolicies,
      allMethods: Array.from(allMethods),
      inheritanceChain
    };
  }

  /**
   * Resolve position with all roles and policies
   */
  async resolvePosition(positionId: string): Promise<ResolvedPosition | null> {
    const position = await this.getPosition(positionId);
    if (!position) return null;

    const resolvedRoles: ResolvedRole[] = [];
    const allPolicies: Policy[] = [];
    const allMethods = new Set<string>(position.methods);

    // Resolve all roles
    for (const roleId of position.roles) {
      const resolvedRole = await this.resolveRole(roleId);
      if (resolvedRole) {
        resolvedRoles.push(resolvedRole);
        resolvedRole.allPolicies.forEach(p => {
          if (!allPolicies.find(existing => existing.id === p.id)) {
            allPolicies.push(p);
          }
        });
        resolvedRole.allMethods.forEach(m => allMethods.add(m));
      }
    }

    return {
      ...position,
      resolvedRoles,
      allPolicies,
      allMethods: Array.from(allMethods)
    };
  }

  /**
   * Check if entity has access to perform action on resource
   */
  async checkAccess(request: AccessCheckRequest, positionId: string): Promise<AccessCheckResult> {
    const resolvedPosition = await this.resolvePosition(positionId);
    if (!resolvedPosition) {
      return {
        allowed: false,
        effect: 'Deny',
        matchingStatements: [],
        reason: 'Position not found'
      };
    }

    const matchingStatements = [];
    let hasDeny = false;
    let hasAllow = false;
    let hasWarn = false;
    const warnings: string[] = [];
    let decidingPolicy: string | undefined;

    // Check all policies
    for (const policy of resolvedPosition.allPolicies) {
      for (const statement of policy.statements) {
        // Check if action matches
        const actionMatches = statement.actions.some(action =>
          this.matchesPattern(request.action, action)
        );

        // Check if resource matches
        const resourceMatches = statement.resources.some(resource =>
          this.matchesGlob(request.resource, resource)
        );

        if (actionMatches && resourceMatches) {
          matchingStatements.push(statement);

          if (statement.effect === 'Deny') {
            hasDeny = true;
            decidingPolicy = policy.id;
          } else if (statement.effect === 'Allow') {
            hasAllow = true;
            if (!decidingPolicy) decidingPolicy = policy.id;
          } else if (statement.effect === 'Warn') {
            hasWarn = true;
            warnings.push(statement.language);
          }
        }
      }
    }

    // Deny takes precedence over everything
    if (hasDeny) {
      return {
        allowed: false,
        effect: 'Deny',
        matchingStatements,
        reason: 'Explicit deny policy',
        decidingPolicy
      };
    }

    // Allow with warnings
    if (hasAllow) {
      return {
        allowed: true,
        effect: hasWarn ? 'Warn' : 'Allow',
        matchingStatements,
        warnings: warnings.length > 0 ? warnings : undefined,
        reason: hasWarn ? 'Allowed with warnings' : 'Allowed by policy',
        decidingPolicy
      };
    }

    // Default deny
    return {
      allowed: false,
      effect: 'Deny',
      matchingStatements,
      reason: 'No matching allow policy (default deny)'
    };
  }

  /**
   * Discover all standards in team
   */
  async discoverStandards(): Promise<StandardsManifest> {
    const manifest: StandardsManifest = {
      teamId: this.config.team,
      administrativeUnit: this.config.administrativeUnit,
      businessUnit: this.config.businessUnit,
      organization: this.config.organization,
      team: this.config.team,
      stats: {
        totalPolicies: 0,
        totalRoles: 0,
        totalPositions: 0,
        totalMethods: 0
      },
      discoveredStandards: {
        policies: [],
        roles: [],
        positions: [],
        methods: []
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const teamPath = this.getTeamPath();

    // Discover policies
    try {
      const policyBase = join(teamPath, 'standard=policy');
      const scopes = await fs.readdir(policyBase, { withFileTypes: true });

      for (const scopeDir of scopes) {
        if (!scopeDir.isDirectory()) continue;

        const scopePath = join(policyBase, scopeDir.name);
        const domains = await fs.readdir(scopePath, { withFileTypes: true });

        for (const domainDir of domains) {
          if (!domainDir.isDirectory()) continue;

          const partitionPath = join(scopePath, domainDir.name);
          const files = await fs.readdir(partitionPath, { withFileTypes: true });

          // Read all .jsonl files in this partition
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.jsonl')) {
              const filePath = join(partitionPath, file.name);
              const policies = await this.jsonlStorage.readAll(filePath) as Policy[];

              for (const policy of policies) {
                manifest.discoveredStandards.policies.push({
                  id: policy.id,
                  name: policy.name,
                  scope: policy.scope,
                  domain: policy.domain,
                  version: policy.version,
                  path: `standard=policy/${scopeDir.name}/${domainDir.name}/${file.name}`
                });
                manifest.stats.totalPolicies++;
              }
            }
          }
        }
      }
    } catch (error) {
      // No policies yet
    }

    // Discover roles
    try {
      const roleBase = join(teamPath, 'standard=role');
      const domains = await fs.readdir(roleBase, { withFileTypes: true });

      for (const domainDir of domains) {
        if (!domainDir.isDirectory()) continue;

        const domainPath = join(roleBase, domainDir.name);
        const levels = await fs.readdir(domainPath, { withFileTypes: true });

        for (const levelDir of levels) {
          if (!levelDir.isDirectory()) continue;

          const partitionPath = join(domainPath, levelDir.name);
          const files = await fs.readdir(partitionPath, { withFileTypes: true });

          // Read all .jsonl files in this partition
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.jsonl')) {
              const filePath = join(partitionPath, file.name);
              const roles = await this.jsonlStorage.readAll(filePath) as Role[];

              for (const role of roles) {
                manifest.discoveredStandards.roles.push({
                  id: role.id,
                  name: role.name,
                  domain: role.domain,
                  level: role.level,
                  version: role.version,
                  path: `standard=role/${domainDir.name}/${levelDir.name}/${file.name}`
                });
                manifest.stats.totalRoles++;
              }
            }
          }
        }
      }
    } catch (error) {
      // No roles yet
    }

    // Discover positions
    try {
      const positionBase = join(teamPath, 'standard=position');
      const tracks = await fs.readdir(positionBase, { withFileTypes: true });

      for (const trackDir of tracks) {
        if (!trackDir.isDirectory()) continue;

        const partitionPath = join(positionBase, trackDir.name);
        const files = await fs.readdir(partitionPath, { withFileTypes: true });

        // Read all .jsonl files in this partition
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.jsonl')) {
            const filePath = join(partitionPath, file.name);
            const positions = await this.jsonlStorage.readAll(filePath) as Position[];

            for (const position of positions) {
              manifest.discoveredStandards.positions.push({
                id: position.id,
                title: position.title,
                track: position.track,
                version: position.version,
                path: `standard=position/${trackDir.name}/${file.name}`
              });
              manifest.stats.totalPositions++;
            }
          }
        }
      }
    } catch (error) {
      // No positions yet
    }

    // Discover methods
    try {
      const { MethodsManager } = await import('./methods/methods-manager');
      const methodsManager = new MethodsManager(this.config);
      const methodReferences = await methodsManager.discoverMethods();

      manifest.discoveredStandards.methods = methodReferences;
      manifest.stats.totalMethods = methodReferences.length;
    } catch (error) {
      // No methods yet or methods module not available
    }

    this.manifestCache = manifest;
    return manifest;
  }

  /**
   * Update manifest with current standards
   */
  private async updateManifest(): Promise<void> {
    const manifest = await this.discoverStandards();
    const manifestPath = this.getManifestPath();

    await this.ensureDirectoryExists(manifestPath);
    await this.jsonStorage.write(manifestPath, manifest, { pretty: true });

    this.manifestCache = manifest;
  }

  /**
   * Ensure directory exists for file path
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = join(filePath, '..');
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate standard ID using UUID v7
   */
  private generateId(type: StandardType, name: string): string {
    return uuidv7();
  }

  /**
   * Match action pattern (e.g., "create:typescript:*" matches "create:typescript:class")
   */
  private matchesPattern(value: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }

  /**
   * Match glob pattern (e.g., "**\/*.ts" matches "src/foo/bar.ts")
   */
  private matchesGlob(value: string, pattern: string): boolean {
    // Simple glob matching - would use proper library like minimatch
    const regex = new RegExp(
      '^' +
      pattern
        .replace(/\*\*/g, '___DOUBLESTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/___DOUBLESTAR___/g, '.*')
        .replace(/\?/g, '.')
      + '$'
    );
    return regex.test(value);
  }
}
