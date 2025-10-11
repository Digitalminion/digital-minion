/**
 * Namespace System Usage Examples
 *
 * Demonstrates how to use the namespace system for hierarchical partition management
 */

import { NamespaceManager } from '../namespace.manager';
import { NamespaceMetadataManager, CreateNamespaceConfig } from '../namespace-metadata.manager';

/**
 * Example 1: Create a namespace with partition schema
 */
async function createTransactionsNamespace() {
  const metadataManager = new NamespaceMetadataManager();

  const config: CreateNamespaceConfig = {
    namespace: 'transactions',
    basePath: './data',
    partitionSchema: {
      order: ['year', 'country'],
      partitions: {
        year: {
          type: 'string',
          regex: '^\\d{4}$',
          required: true,
          description: 'Transaction year'
        },
        country: {
          type: 'string',
          regex: '^[A-Z]{2}$',
          required: true,
          description: 'Country code (ISO 3166-1 alpha-2)'
        }
      }
    },
    dataFormat: 'jsonl',
    itemSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        timestamp: { type: 'string' }
      }
    }
  };

  const metadata = await metadataManager.createNamespace(config);

  console.log('Created namespace:', metadata);

  // Directory structure created:
  // ./data/transactions/
  // ├── namespace.meta.json
  // └── data/
}

/**
 * Example 2: Validate and write items to partitions
 */
async function writeTransactions() {
  const manager = new NamespaceManager({ basePath: './data' });

  // Transaction with all required partition fields
  const transaction1 = {
    id: 'txn-001',
    year: '2025',
    country: 'US',
    amount: 100.50,
    currency: 'USD',
    timestamp: new Date().toISOString()
  };

  // Validate write
  const validation = await manager.validateWrite('transactions', transaction1);

  if (validation.isValid) {
    console.log('Valid transaction - will write to:', validation.partitionPath);
    // Output: "year=2025/country=US"

    // Ensure partition exists
    await manager.ensurePartitionExists('transactions', validation.partitionPath!, 'jsonl');

    // Write to: ./data/transactions/data/year=2025/country=US/data.jsonl
  } else {
    console.error('Validation errors:', validation.errors);
  }

  // Transaction missing required field
  const transaction2 = {
    id: 'txn-002',
    country: 'UK',
    amount: 75.25,
    currency: 'GBP'
    // Missing 'year' - will be rejected unless default is set
  };

  const validation2 = await manager.validateWrite('transactions', transaction2);
  console.log('Validation result:', validation2);
  // Output: { isValid: false, errors: [{ field: 'year', code: 'MISSING_REQUIRED', ... }] }
}

/**
 * Example 3: Using default values
 */
async function createNamespaceWithDefaults() {
  const metadataManager = new NamespaceMetadataManager();

  const config: CreateNamespaceConfig = {
    namespace: 'events',
    basePath: './data',
    partitionSchema: {
      order: ['year', 'month'],
      partitions: {
        year: {
          type: 'string',
          regex: '^\\d{4}$',
          required: true,
          defaultValue: new Date().getFullYear().toString(), // Auto-fill current year
          description: 'Event year'
        },
        month: {
          type: 'string',
          regex: '^(0[1-9]|1[0-2])$',
          required: true,
          defaultValue: (new Date().getMonth() + 1).toString().padStart(2, '0'), // Auto-fill current month
          description: 'Event month'
        }
      }
    },
    dataFormat: 'jsonl'
  };

  await metadataManager.createNamespace(config);

  // Now writes without year/month will use defaults
  const manager = new NamespaceManager({ basePath: './data' });

  const event = {
    id: 'evt-001',
    type: 'user_signup',
    userId: 'user-123'
    // year and month will be auto-filled with defaults
  };

  const validation = await manager.validateWrite('events', event);
  console.log('Partition path:', validation.partitionPath);
  // Output: "year=2025/month=10" (current year and month)
}

/**
 * Example 4: Query partitions
 */
async function queryPartitions() {
  const manager = new NamespaceManager({ basePath: './data' });

  // Query all transactions from 2025
  const partitions2025 = await manager.resolveQueryPartitions('transactions', {
    partitionFilter: { year: '2025' }
  });
  console.log('2025 partitions:', partitions2025);
  // Output: ["year=2025/country=US", "year=2025/country=UK", "year=2025/country=CA"]

  // Query US transactions only
  const usPartitions = await manager.resolveQueryPartitions('transactions', {
    partitionFilter: { country: 'US' }
  });
  console.log('US partitions:', usPartitions);
  // Output: ["year=2024/country=US", "year=2025/country=US"]

  // Query specific partition
  const specificPartition = await manager.resolveQueryPartitions('transactions', {
    partitionFilter: { year: '2025', country: 'US' }
  });
  console.log('Specific partition:', specificPartition);
  // Output: ["year=2025/country=US"]

  // Query all partitions (no filter)
  const allPartitions = await manager.resolveQueryPartitions('transactions');
  console.log('All partitions:', allPartitions);
  // Output: All discovered partitions
}

/**
 * Example 5: Add new partition level (split operation)
 */
async function addRegionPartition() {
  const manager = new NamespaceManager({ basePath: './data' });

  // Add 'region' partition between 'year' and 'country'
  const result = await manager.addPartition('transactions', {
    key: 'region',
    position: 1, // Insert after year (0), before country (1)
    type: 'string',
    regex: '^(NA|EU|ASIA|SA|AF|OC)$',
    required: true,
    description: 'Geographic region',
    deriveFromData: `(item) => {
      const countryToRegion = {
        'US': 'NA', 'CA': 'NA', 'MX': 'NA',
        'UK': 'EU', 'DE': 'EU', 'FR': 'EU',
        'JP': 'ASIA', 'CN': 'ASIA', 'IN': 'ASIA'
      };
      return countryToRegion[item.country] || 'OC';
    }`
  });

  console.log('Split operation result:', result);
  // Output: {
  //   success: true,
  //   operation: 'split',
  //   partitionsProcessed: 5,
  //   itemsProcessed: 10000,
  //   partitionsCreated: 15,
  //   partitionsDeleted: 5,
  //   executionTime: 2500
  // }

  // New structure:
  // ./data/transactions/data/
  // ├── year=2025/region=NA/country=US/data.jsonl
  // ├── year=2025/region=NA/country=CA/data.jsonl
  // └── year=2025/region=EU/country=UK/data.jsonl
}

/**
 * Example 6: Collapse partition level (merge operation)
 */
async function removeRegionPartition() {
  const manager = new NamespaceManager({ basePath: './data' });

  // Remove 'region' partition and merge data back
  const result = await manager.collapsePartition('transactions', 'region');

  console.log('Merge operation result:', result);
  // Output: {
  //   success: true,
  //   operation: 'merge',
  //   partitionsProcessed: 15,
  //   itemsProcessed: 10000,
  //   partitionsCreated: 5,
  //   partitionsDeleted: 15,
  //   executionTime: 1800
  // }

  // Reverted structure:
  // ./data/transactions/data/
  // ├── year=2025/country=US/data.jsonl
  // ├── year=2025/country=CA/data.jsonl
  // └── year=2025/country=UK/data.jsonl
}

/**
 * Example 7: Discover existing partitions
 */
async function discoverPartitions() {
  const metadataManager = new NamespaceMetadataManager();

  const partitions = await metadataManager.discoverPartitions('./data', 'transactions');

  console.log('Discovered partitions:', partitions);
  // Output: [
  //   {
  //     path: "year=2025/country=US",
  //     values: { year: "2025", country: "US" },
  //     created: "2025-10-04T12:00:00Z",
  //     itemCount: 1500,
  //     lastUpdated: "2025-10-04T14:30:00Z",
  //     sizeBytes: 245600
  //   },
  //   ...
  // ]
}

/**
 * Example 8: Complex partition schema with multiple levels
 */
async function createComplexNamespace() {
  const metadataManager = new NamespaceMetadataManager();

  const config: CreateNamespaceConfig = {
    namespace: 'logs',
    basePath: './data',
    partitionSchema: {
      order: ['year', 'month', 'day', 'service'],
      partitions: {
        year: {
          type: 'string',
          regex: '^\\d{4}$',
          required: true,
          deriveFromData: '(item) => new Date(item.timestamp).getFullYear().toString()'
        },
        month: {
          type: 'string',
          regex: '^(0[1-9]|1[0-2])$',
          required: true,
          deriveFromData: '(item) => (new Date(item.timestamp).getMonth() + 1).toString().padStart(2, "0")'
        },
        day: {
          type: 'string',
          regex: '^(0[1-9]|[12][0-9]|3[01])$',
          required: true,
          deriveFromData: '(item) => new Date(item.timestamp).getDate().toString().padStart(2, "0")'
        },
        service: {
          type: 'string',
          regex: '^[a-z-]+$',
          required: true,
          description: 'Service name'
        }
      }
    },
    dataFormat: 'jsonl'
  };

  await metadataManager.createNamespace(config);

  // Structure: year=2025/month=10/day=04/service=api-gateway/data.jsonl
}

/**
 * Example 9: Get partition file path
 */
async function getFilePaths() {
  const manager = new NamespaceManager({ basePath: './data' });

  const partitionPath = 'year=2025/country=US';
  const filePath = manager.getPartitionFilePath('transactions', partitionPath, 'jsonl');

  console.log('File path:', filePath);
  // Output: "./data/transactions/data/year=2025/country=US/data.jsonl"
}

// Export examples
export {
  createTransactionsNamespace,
  writeTransactions,
  createNamespaceWithDefaults,
  queryPartitions,
  addRegionPartition,
  removeRegionPartition,
  discoverPartitions,
  createComplexNamespace,
  getFilePaths
};
