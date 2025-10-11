import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { Backends, Sync } from '@digital-minion/lib';

/**
 * Module for syncing tasks between backends.
 */
export class SyncModule implements Module {
  name = 'sync';
  description = 'Sync tasks between backends';

  register(program: Command): void {
    const syncCmd = program
      .command('sync')
      .description('Sync tasks between backends');

    // One-way sync from source to target
    syncCmd
      .command('pull <source> <target>')
      .description('Sync tasks from source backend to target backend')
      .option('--dry-run', 'Preview sync without making changes', false)
      .action(async (source: string, target: string, options: { dryRun: boolean }) => {
        await this.pullSync(source, target, options.dryRun);
      });
  }

  private async pullSync(sourceName: string, targetName: string, dryRun: boolean): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "dm config init" first.');
      process.exit(1);
    }

    // Validate backends exist
    if (!config.backends[sourceName]) {
      console.error(`✗ Source backend '${sourceName}' not found.`);
      process.exit(1);
    }

    if (!config.backends[targetName]) {
      console.error(`✗ Target backend '${targetName}' not found.`);
      process.exit(1);
    }

    console.log(`\nSyncing from '${sourceName}' to '${targetName}'...`);
    if (dryRun) {
      console.log('(DRY RUN - no changes will be made)\n');
    }

    try {
      // Create source backend
      const sourceConfig = config.backends[sourceName];
      const sourceBackends = Backends.BackendFactory.createAllBackends(
        this.convertToLibConfig(sourceConfig)
      );
      const sourceBackend: Sync.SyncBackend = {
        id: sourceName,
        name: sourceConfig.description || sourceName,
        type: sourceConfig.type,
        backends: sourceBackends,
      };

      // Create target backend
      const targetConfig = config.backends[targetName];
      const targetBackends = Backends.BackendFactory.createAllBackends(
        this.convertToLibConfig(targetConfig)
      );
      const targetBackend: Sync.SyncBackend = {
        id: targetName,
        name: targetConfig.description || targetName,
        type: targetConfig.type,
        backends: targetBackends,
      };

      // Create sync state manager
      const syncStateDir = configManager.getConfigDir();
      const stateManager = new Sync.SyncStateManager(syncStateDir, `${sourceName}-${targetName}`);

      // Create sync engine
      const engine = new Sync.OneWaySyncEngine(
        sourceBackend,
        targetBackend,
        stateManager,
        {
          direction: Sync.SyncDirection.ONE_WAY,
          conflictStrategy: Sync.ConflictStrategy.SOURCE_WINS,
          dryRun,
          syncTags: true,
          syncSections: true,
          callbacks: {
            onProgress: (progress) => {
              const percentage = Math.round(progress.percentage);
              const phase = progress.phase.replace(/-/g, ' ');
              console.log(`[${percentage}%] ${phase}... (${progress.itemsProcessed}/${progress.totalItems})`);
            },
            onError: (error) => {
              console.error(`  ✗ Error: ${error.message}`);
            },
          },
        }
      );

      // Execute sync
      const result = await engine.sync();

      // Display results
      console.log('\n' + '='.repeat(50));
      if (result.success) {
        console.log('✓ Sync completed successfully');
      } else {
        console.log('✗ Sync completed with errors');
      }
      console.log('='.repeat(50));

      if (OutputFormatter.isJson()) {
        OutputFormatter.print(result);
      } else {
        console.log(`\nStatistics:`);
        console.log(`  Items checked:  ${result.stats.itemsChecked}`);
        console.log(`  Items created:  ${result.stats.itemsCreated}`);
        console.log(`  Items updated:  ${result.stats.itemsUpdated}`);
        console.log(`  Items deleted:  ${result.stats.itemsDeleted}`);
        console.log(`  Items skipped:  ${result.stats.itemsSkipped}`);
        console.log(`  Duration:       ${result.durationMs}ms`);

        if (result.errors.length > 0) {
          console.log(`\nErrors (${result.errors.length}):`);
          for (const error of result.errors) {
            console.log(`  ✗ ${error.message}`);
            if (error.itemId) {
              console.log(`    Item: ${error.itemId}`);
            }
          }
        }
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`\n✗ Sync failed: ${error.message}`);
      process.exit(1);
    }
  }

  private convertToLibConfig(backendConfig: any): Backends.MinionConfig {
    if (backendConfig.type === 'asana') {
      return {
        backend: 'asana',
        config: backendConfig.asana,
      };
    } else if (backendConfig.type === 'local') {
      return {
        backend: 'local',
        config: backendConfig.local,
      };
    }
    throw new Error(`Unsupported backend type: ${backendConfig.type}`);
  }
}
