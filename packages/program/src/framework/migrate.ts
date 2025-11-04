/**
 * Framework Data Migration Script
 *
 * Migrates framework data from src/framework/{framework-id}/*.json
 * to .minion/local with proper partitioned JSONL structure.
 */

import { DataLayer, NamespaceMetadataManager } from '@digital-minion/data';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import {
  ControlFramework,
  Control,
  ControlAssessment,
  ControlMapping,
} from '../schema/minion/function/framework';

/**
 * Migration configuration.
 */
export interface MigrationConfig {
  /** Source directory containing framework JSON files */
  sourceBasePath: string;

  /** Target .minion/local base path */
  targetBasePath: string;

  /** Program context for partitioning */
  context: {
    administrativeUnit: string;
    businessUnit: string;
    organization: string;
    team: string;
  };

  /** Whether to perform dry run (don't write data) */
  dryRun?: boolean;

  /** Whether to force migration even if data exists */
  force?: boolean;
}

/**
 * Migration result.
 */
export interface MigrationResult {
  success: boolean;
  frameworksMigrated: number;
  controlsMigrated: number;
  assessmentsMigrated: number;
  mappingsMigrated: number;
  errors: Array<{ item: string; error: string }>;
}

/**
 * Migrate all frameworks from source to .minion/local.
 */
export async function migrateFrameworks(
  config: MigrationConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    frameworksMigrated: 0,
    controlsMigrated: 0,
    assessmentsMigrated: 0,
    mappingsMigrated: 0,
    errors: [],
  };

  console.log('Framework Migration Starting...');
  console.log(`Source: ${config.sourceBasePath}`);
  console.log(`Target: ${config.targetBasePath}`);
  console.log(`Dry Run: ${config.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Ensure source directory exists
    if (!existsSync(config.sourceBasePath)) {
      throw new Error(`Source path does not exist: ${config.sourceBasePath}`);
    }

    // Initialize framework namespace
    await initializeFrameworkNamespace(config.targetBasePath, config.force);

    // Find all framework directories
    const frameworkDirs = readdirSync(config.sourceBasePath).filter((name) => {
      const path = join(config.sourceBasePath, name);
      return statSync(path).isDirectory() && existsSync(join(path, 'framework.json'));
    });

    console.log(`Found ${frameworkDirs.length} framework(s) to migrate:`);
    frameworkDirs.forEach((name) => console.log(`  - ${name}`));
    console.log('');

    // Migrate each framework
    for (const frameworkDir of frameworkDirs) {
      const frameworkPath = join(config.sourceBasePath, frameworkDir);
      const frameworkResult = await migrateFramework(
        frameworkPath,
        frameworkDir,
        config
      );

      result.frameworksMigrated += frameworkResult.frameworksMigrated;
      result.controlsMigrated += frameworkResult.controlsMigrated;
      result.assessmentsMigrated += frameworkResult.assessmentsMigrated;
      result.mappingsMigrated += frameworkResult.mappingsMigrated;
      result.errors.push(...frameworkResult.errors);

      if (!frameworkResult.success) {
        result.success = false;
      }
    }

    console.log('');
    console.log('Migration Complete!');
    console.log(`  Frameworks: ${result.frameworksMigrated}`);
    console.log(`  Controls: ${result.controlsMigrated}`);
    console.log(`  Assessments: ${result.assessmentsMigrated}`);
    console.log(`  Mappings: ${result.mappingsMigrated}`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach((err) => {
        console.log(`    - ${err.item}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Migration failed:', error);
    result.success = false;
    result.errors.push({
      item: 'migration',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Initialize framework namespace in .minion/local.
 */
async function initializeFrameworkNamespace(
  basePath: string,
  force?: boolean
): Promise<void> {
  const metadataManager = new NamespaceMetadataManager();

  console.log('Initializing framework namespace...');

  try {
    // Check if namespace already exists
    if (!force) {
      try {
        await metadataManager.loadMetadata(basePath, 'framework');
        console.log('Framework namespace already exists.');
        return;
      } catch {
        // Namespace doesn't exist, continue with creation
      }
    }

    // Create namespace - NOTE: Unlike entity/function/standard which use a flat
    // namespace, framework uses a more complex partitioning scheme
    await metadataManager.createNamespace({
      namespace: 'framework',
      basePath: basePath,
      partitionSchema: {
        order: [
          'administrative_unit',
          'business_unit',
          'organization',
          'team',
          'framework',
          'data_type',
          'category',
        ],
        partitions: {
          administrative_unit: {
            type: 'string',
            regex: '^[a-z0-9-]+$',
            required: true,
            description: 'Administrative unit identifier',
          },
          business_unit: {
            type: 'string',
            regex: '^[a-z0-9-]+$',
            required: true,
            description: 'Business unit identifier',
          },
          organization: {
            type: 'string',
            regex: '^[a-z0-9-]+$',
            required: true,
            description: 'Organization identifier',
          },
          team: {
            type: 'string',
            regex: '^[a-z0-9-]+$',
            required: true,
            description: 'Team identifier',
          },
          framework: {
            type: 'string',
            regex: '^[a-z0-9-]+$',
            required: true,
            description: 'Framework identifier (e.g., nist-csf, iso-27001)',
          },
          data_type: {
            type: 'string',
            regex: '^(metadata|control|assessment|mapping|gap)$',
            required: true,
            description: 'Type of framework data',
          },
          category: {
            type: 'string',
            regex: '^([a-z0-9-]+|_)$',
            required: true,
            description: 'Data category or _ for type-wide',
          },
        },
      },
      dataFormat: 'jsonl',
    });

    console.log('Framework namespace created successfully.');
  } catch (error) {
    console.error('Failed to initialize framework namespace:', error);
    throw error;
  }
}

/**
 * Migrate a single framework.
 */
async function migrateFramework(
  frameworkPath: string,
  frameworkId: string,
  config: MigrationConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    frameworksMigrated: 0,
    controlsMigrated: 0,
    assessmentsMigrated: 0,
    mappingsMigrated: 0,
    errors: [],
  };

  console.log(`Migrating framework: ${frameworkId}`);

  try {
    // 1. Migrate framework metadata
    const frameworkFile = join(frameworkPath, 'framework.json');
    if (existsSync(frameworkFile)) {
      const framework: ControlFramework = JSON.parse(
        readFileSync(frameworkFile, 'utf-8')
      );

      if (!config.dryRun) {
        await writeFrameworkMetadata(framework, config);
      }

      result.frameworksMigrated++;
      console.log(`  ✓ Framework metadata migrated`);
    }

    // 2. Migrate controls
    const controlsPath = join(frameworkPath, 'controls');
    if (existsSync(controlsPath)) {
      const controlsResult = await migrateControls(
        controlsPath,
        frameworkId,
        config
      );
      result.controlsMigrated = controlsResult.count;
      result.errors.push(...controlsResult.errors);
      console.log(`  ✓ ${controlsResult.count} control(s) migrated`);
    }

    // 3. Migrate assessments
    const assessmentsPath = join(frameworkPath, 'assessments');
    if (existsSync(assessmentsPath)) {
      const assessmentsResult = await migrateAssessments(
        assessmentsPath,
        frameworkId,
        config
      );
      result.assessmentsMigrated = assessmentsResult.count;
      result.errors.push(...assessmentsResult.errors);
      console.log(`  ✓ ${assessmentsResult.count} assessment(s) migrated`);
    }

    // 4. Migrate mappings
    const mappingsPath = join(frameworkPath, 'mappings');
    if (existsSync(mappingsPath)) {
      const mappingsResult = await migrateMappings(
        mappingsPath,
        frameworkId,
        config
      );
      result.mappingsMigrated = mappingsResult.count;
      result.errors.push(...mappingsResult.errors);
      console.log(`  ✓ ${mappingsResult.count} mapping(s) migrated`);
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      item: `framework-${frameworkId}`,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`  ✗ Error migrating framework: ${error}`);
  }

  return result;
}

/**
 * Write framework metadata to data layer.
 */
async function writeFrameworkMetadata(
  framework: ControlFramework,
  config: MigrationConfig
): Promise<void> {
  const dataLayer = new DataLayer({
    basePath: config.targetBasePath,
    collection: 'framework',
    adapterType: 'jsonl',
  });

  await dataLayer.initialize();

  await dataLayer.write({
    data: [framework],
    partitionPath: {
      administrative_unit: config.context.administrativeUnit,
      business_unit: config.context.businessUnit,
      organization: config.context.organization,
      team: config.context.team,
      framework: framework.id,
      data_type: 'metadata',
      category: '_',
    },
  });
}

/**
 * Migrate controls from directory structure.
 */
async function migrateControls(
  controlsPath: string,
  frameworkId: string,
  config: MigrationConfig
): Promise<{ count: number; errors: Array<{ item: string; error: string }> }> {
  const errors: Array<{ item: string; error: string }> = [];
  let count = 0;

  const dataLayer = new DataLayer({
    basePath: config.targetBasePath,
    collection: 'framework',
    adapterType: 'jsonl',
  });

  await dataLayer.initialize();

  // Recursively find all .json files in controls directory
  const controlFiles = findJsonFiles(controlsPath);

  for (const controlFile of controlFiles) {
    try {
      const control: Control = JSON.parse(readFileSync(controlFile, 'utf-8'));

      if (!config.dryRun) {
        await dataLayer.write({
          data: [control],
          partitionPath: {
            administrative_unit: config.context.administrativeUnit,
            business_unit: config.context.businessUnit,
            organization: config.context.organization,
            team: config.context.team,
            framework: frameworkId,
            data_type: 'control',
            category: control.category || '_',
          },
        });
      }

      count++;
    } catch (error) {
      errors.push({
        item: controlFile,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { count, errors };
}

/**
 * Migrate assessments.
 */
async function migrateAssessments(
  assessmentsPath: string,
  frameworkId: string,
  config: MigrationConfig
): Promise<{ count: number; errors: Array<{ item: string; error: string }> }> {
  const errors: Array<{ item: string; error: string }> = [];
  let count = 0;

  const dataLayer = new DataLayer({
    basePath: config.targetBasePath,
    collection: 'framework',
    adapterType: 'jsonl',
  });

  await dataLayer.initialize();

  const assessmentFiles = findJsonFiles(assessmentsPath);

  for (const assessmentFile of assessmentFiles) {
    try {
      const assessment: ControlAssessment = JSON.parse(
        readFileSync(assessmentFile, 'utf-8')
      );

      if (!config.dryRun) {
        await dataLayer.write({
          data: [assessment],
          partitionPath: {
            administrative_unit: config.context.administrativeUnit,
            business_unit: config.context.businessUnit,
            organization: config.context.organization,
            team: config.context.team,
            framework: frameworkId,
            data_type: 'assessment',
            category: assessment.id,
          },
        });
      }

      count++;
    } catch (error) {
      errors.push({
        item: assessmentFile,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { count, errors };
}

/**
 * Migrate mappings.
 */
async function migrateMappings(
  mappingsPath: string,
  frameworkId: string,
  config: MigrationConfig
): Promise<{ count: number; errors: Array<{ item: string; error: string }> }> {
  const errors: Array<{ item: string; error: string }> = [];
  let count = 0;

  const dataLayer = new DataLayer({
    basePath: config.targetBasePath,
    collection: 'framework',
    adapterType: 'jsonl',
  });

  await dataLayer.initialize();

  const mappingFiles = findJsonFiles(mappingsPath);

  for (const mappingFile of mappingFiles) {
    try {
      const mappings: ControlMapping[] = JSON.parse(
        readFileSync(mappingFile, 'utf-8')
      );

      // Group mappings by type
      const mappingsByType: Record<string, ControlMapping[]> = {};
      mappings.forEach((mapping) => {
        if (!mappingsByType[mapping.type]) {
          mappingsByType[mapping.type] = [];
        }
        mappingsByType[mapping.type].push(mapping);
      });

      // Write each type separately
      for (const [type, typeMappings] of Object.entries(mappingsByType)) {
        if (!config.dryRun) {
          await dataLayer.write({
            data: typeMappings,
            partitionPath: {
              administrative_unit: config.context.administrativeUnit,
              business_unit: config.context.businessUnit,
              organization: config.context.organization,
              team: config.context.team,
              framework: frameworkId,
              data_type: 'mapping',
              category: type,
            },
          });
        }
        count += typeMappings.length;
      }
    } catch (error) {
      errors.push({
        item: mappingFile,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { count, errors };
}

/**
 * Recursively find all JSON files in a directory.
 */
function findJsonFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}
