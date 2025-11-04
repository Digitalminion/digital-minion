#!/usr/bin/env node
/**
 * Framework Migration CLI
 *
 * Command-line tool to migrate framework data from source files
 * to .minion/local partitioned JSONL storage.
 *
 * Usage:
 *   npx tsx src/framework/migrate-cli.ts [options]
 *
 * Options:
 *   --source <path>       Source directory (default: ./src/framework)
 *   --target <path>       Target .minion/local path (default: ./.minion/local)
 *   --au <id>            Administrative unit (default: digital-minion)
 *   --bu <id>            Business unit (default: corp)
 *   --org <id>           Organization (default: global-information-security)
 *   --team <id>          Team (default: global-threat-management)
 *   --dry-run            Perform dry run without writing data
 *   --force              Force migration even if namespace exists
 *   --help               Show help
 */

import { migrateFrameworks } from './migrate';
import { resolve } from 'path';

interface CliOptions {
  source: string;
  target: string;
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;
  dryRun: boolean;
  force: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    source: './packages/program/src/framework',
    target: './.minion/local',
    administrativeUnit: 'digital-minion',
    businessUnit: 'corp',
    organization: 'global-information-security',
    team: 'global-threat-management',
    dryRun: false,
    force: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--source':
        options.source = args[++i];
        break;
      case '--target':
        options.target = args[++i];
        break;
      case '--au':
        options.administrativeUnit = args[++i];
        break;
      case '--bu':
        options.businessUnit = args[++i];
        break;
      case '--org':
        options.organization = args[++i];
        break;
      case '--team':
        options.team = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Framework Migration CLI

Migrates framework data from source JSON files to .minion/local partitioned JSONL storage.

Usage:
  npx tsx src/framework/migrate-cli.ts [options]

Options:
  --source <path>       Source directory containing framework data
                        (default: ./packages/program/src/framework)

  --target <path>       Target .minion/local directory
                        (default: ./.minion/local)

  --au <id>            Administrative unit identifier
                        (default: digital-minion)

  --bu <id>            Business unit identifier
                        (default: corp)

  --org <id>           Organization identifier
                        (default: global-information-security)

  --team <id>          Team identifier
                        (default: global-threat-management)

  --dry-run            Perform dry run without writing data
                        (useful for testing migration)

  --force              Force migration even if namespace exists
                        (will recreate namespace schema)

  --help, -h           Show this help message

Examples:
  # Dry run to preview migration
  npx tsx src/framework/migrate-cli.ts --dry-run

  # Migrate with default settings
  npx tsx src/framework/migrate-cli.ts

  # Migrate with custom organization/team
  npx tsx src/framework/migrate-cli.ts --org my-org --team my-team

  # Force re-migration
  npx tsx src/framework/migrate-cli.ts --force

Storage Structure:
  The migration will create the following structure in .minion/local:

  .minion/local/
    administrative_unit=digital-minion/
      business_unit=corp/
        organization=global-information-security/
          team=global-threat-management/
            framework.manifest.json
            framework=nist-csf/
              data_type=metadata/
                category=_/
                  data-{hash}.jsonl    # Framework definition
              data_type=control/
                category=identify/
                  data-{hash}.jsonl    # Identify controls
                category=protect/
                  data-{hash}.jsonl    # Protect controls
                ...
              data_type=assessment/
                category={assessment-id}/
                  data-{hash}.jsonl    # Assessment data
              data_type=mapping/
                category=policy/
                  data-{hash}.jsonl    # Policy mappings
                category=role/
                  data-{hash}.jsonl    # Role mappings
                category=method/
                  data-{hash}.jsonl    # Method mappings
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('========================================');
  console.log('Framework Data Migration');
  console.log('========================================');
  console.log('');
  console.log('Configuration:');
  console.log(`  Source:      ${resolve(options.source)}`);
  console.log(`  Target:      ${resolve(options.target)}`);
  console.log(`  Admin Unit:  ${options.administrativeUnit}`);
  console.log(`  Bus. Unit:   ${options.businessUnit}`);
  console.log(`  Org:         ${options.organization}`);
  console.log(`  Team:        ${options.team}`);
  console.log(`  Dry Run:     ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`  Force:       ${options.force ? 'YES' : 'NO'}`);
  console.log('');
  console.log('========================================');
  console.log('');

  try {
    const result = await migrateFrameworks({
      sourceBasePath: resolve(options.source),
      targetBasePath: resolve(options.target),
      context: {
        administrativeUnit: options.administrativeUnit,
        businessUnit: options.businessUnit,
        organization: options.organization,
        team: options.team,
      },
      dryRun: options.dryRun,
      force: options.force,
    });

    console.log('');
    console.log('========================================');
    if (result.success) {
      console.log('Migration completed successfully!');
      if (options.dryRun) {
        console.log('');
        console.log('NOTE: This was a dry run. No data was written.');
        console.log('Run without --dry-run to perform actual migration.');
      }
    } else {
      console.log('Migration completed with errors.');
      console.log(`Total errors: ${result.errors.length}`);
    }
    console.log('========================================');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('Migration failed:');
    console.error(error);
    console.error('========================================');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
