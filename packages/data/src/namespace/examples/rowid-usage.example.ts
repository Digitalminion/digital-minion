/**
 * RowId System Usage Examples
 *
 * Demonstrates partition-aware composite keys for O(1) direct lookups
 */

import { NamespaceMetadataManager, CreateNamespaceConfig } from '../namespace-metadata.manager';
import { RowIdGenerator } from '../rowid.generator';
import { RowIdResolver } from '../rowid.resolver';
import { NamespaceMetadata } from '../namespace.types';

/**
 * Example 1: Generate rowIds with partition encoding
 */
async function generateRowIds() {
  // Setup namespace
  const metadataManager = new NamespaceMetadataManager();

  const config: CreateNamespaceConfig = {
    namespace: 'transactions',
    basePath: './data',
    partitionSchema: {
      order: ['year', 'country', 'state'],
      partitions: {
        year: {
          type: 'string',
          regex: '^\\d{4}$',
          required: true
        },
        country: {
          type: 'string',
          regex: '^[A-Z]{2}$',
          required: true
        },
        state: {
          type: 'string',
          regex: '^[A-Z]{2}$',
          required: true
        }
      }
    },
    dataFormat: 'jsonl'
  };

  const metadata = await metadataManager.createNamespace(config);

  // Create generator
  const generator = new RowIdGenerator();

  // Generate rowId from partition values
  const rowId = generator.generateRowId(
    metadata,
    {
      year: '2025',
      country: 'US',
      state: 'TX'
    }
  );

  console.log('Generated rowId:', rowId);
  // Output: "2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"

  // Structure encodes partition path: year=2025/country=US/state=TX
}

/**
 * Example 2: Generate rowId from item data
 */
async function generateRowIdFromItem() {
  const metadataManager = new NamespaceMetadataManager();
  const metadata = await metadataManager.loadMetadata('./data', 'transactions');

  const generator = new RowIdGenerator();

  const transaction = {
    year: '2025',
    country: 'US',
    state: 'CA',
    amount: 150.50,
    currency: 'USD',
    customerId: 'cust-123'
  };

  // Generate rowId from item
  const rowId = generator.generateRowIdFromItem(metadata, transaction);

  console.log('RowId from item:', rowId);
  // Output: "2025.US.CA.7e9f2a4c-1b3d-5e8f-9a2c-4d6e8f1a3b5c"

  // Add rowId to item
  const itemWithRowId = {
    ...transaction,
    rowId
  };

  console.log('Item with rowId:', itemWithRowId);
}

/**
 * Example 3: Parse rowId to extract partition information
 */
async function parseRowId() {
  const metadataManager = new NamespaceMetadataManager();
  const metadata = await metadataManager.loadMetadata('./data', 'transactions');

  const generator = new RowIdGenerator();

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  const parsed = generator.parseRowId(rowId, metadata);

  console.log('Parsed rowId:', parsed);
  // Output: {
  //   rowId: "2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
  //   partitionValues: ["2025", "US", "TX"],
  //   partitionPath: "year=2025/country=US/state=TX",
  //   guid: "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
  //   partitionMap: { year: "2025", country: "US", state: "TX" }
  // }

  console.log('Partition path:', parsed.partitionPath);
  // Output: "year=2025/country=US/state=TX"

  console.log('GUID:', parsed.guid);
  // Output: "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"
}

/**
 * Example 4: Direct O(1) lookup by rowId
 */
async function lookupByRowId() {
  const resolver = new RowIdResolver({ basePath: './data' });

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  // Direct lookup - goes straight to the partition file
  const result = await resolver.lookupByRowId('transactions', rowId);

  console.log('Lookup result:', result);
  // Output: {
  //   found: true,
  //   item: { rowId: "2025.US.TX...", year: "2025", country: "US", state: "TX", amount: 150.50, ... },
  //   parsedRowId: { partitionPath: "year=2025/country=US/state=TX", ... },
  //   filePath: "./data/transactions/data/year=2025/country=US/state=TX/data.jsonl",
  //   lookupTime: 5  // milliseconds
  // }

  if (result.found) {
    console.log('Found item:', result.item);
    console.log('Lookup took:', result.lookupTime, 'ms');
    console.log('File location:', result.filePath);
  }

  // No map-reduce needed! Direct file access based on encoded partition path
}

/**
 * Example 5: Batch lookup multiple rowIds
 */
async function batchLookup() {
  const resolver = new RowIdResolver({ basePath: './data' });

  const rowIds = [
    '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f',
    '2025.US.CA.7e9f2a4c-1b3d-5e8f-9a2c-4d6e8f1a3b5c',
    '2025.UK.LN.9d1e3f5a-7b9c-1d3e-5f7a-9b1c3d5e7f9a'
  ];

  // Batch lookup groups by partition for efficiency
  const results = await resolver.lookupManyByRowId('transactions', rowIds);

  console.log('Batch lookup results:');
  for (const [rowId, result] of results.entries()) {
    console.log(`${rowId}: ${result.found ? 'FOUND' : 'NOT FOUND'}`);
    if (result.found) {
      console.log('  ->', result.item);
    }
  }

  // Efficient: Only reads each unique partition once
  // 2025.US.TX and 2025.US.CA are in same file system area
}

/**
 * Example 6: Update item by rowId
 */
async function updateByRowId() {
  const resolver = new RowIdResolver({ basePath: './data' });

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  // Update item directly
  const updated = await resolver.updateByRowId(
    'transactions',
    rowId,
    {
      amount: 175.75,
      status: 'completed'
    }
  );

  if (updated) {
    console.log('Updated item:', updated);
  } else {
    console.log('Item not found');
  }

  // Direct partition access - no full scan needed
}

/**
 * Example 7: Delete item by rowId
 */
async function deleteByRowId() {
  const resolver = new RowIdResolver({ basePath: './data' });

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  const deleted = await resolver.deleteByRowId('transactions', rowId);

  if (deleted) {
    console.log('Item deleted successfully');
  } else {
    console.log('Item not found');
  }
}

/**
 * Example 8: Custom rowId formats
 */
async function customRowIdFormats() {
  const metadataManager = new NamespaceMetadataManager();
  const metadata = await metadataManager.loadMetadata('./data', 'transactions');

  // Format 1: Include partition keys (more readable)
  const generator1 = new RowIdGenerator({ includeKeys: true });
  const rowId1 = generator1.generateRowId(metadata, {
    year: '2025',
    country: 'US',
    state: 'TX'
  });

  console.log('With keys:', rowId1);
  // Output: "year=2025.country=US.state=TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"

  // Format 2: Short GUID (smaller)
  const generator2 = new RowIdGenerator({ guidFormat: 'short' });
  const rowId2 = generator2.generateRowId(metadata, {
    year: '2025',
    country: 'US',
    state: 'TX'
  });

  console.log('Short GUID:', rowId2);
  // Output: "2025.US.TX.a7b9c3d5e1f2"

  // Format 3: Timestamp-based GUID
  const generator3 = new RowIdGenerator({ guidFormat: 'timestamp' });
  const rowId3 = generator3.generateRowId(metadata, {
    year: '2025',
    country: 'US',
    state: 'TX'
  });

  console.log('Timestamp GUID:', rowId3);
  // Output: "2025.US.TX.1728052800000-a7b9c3"

  // Format 4: Custom separator
  const generator4 = new RowIdGenerator();
  const rowId4 = generator4.generateRowId(
    metadata,
    { year: '2025', country: 'US', state: 'TX' },
    { separator: '-' }
  );

  console.log('Custom separator:', rowId4);
  // Output: "2025-US-TX-a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"
}

/**
 * Example 9: Get all items in same partition as rowId
 */
async function getPartitionItems() {
  const resolver = new RowIdResolver({ basePath: './data' });

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  // Get all items in the same partition
  const partitionItems = await resolver.getPartitionItems('transactions', rowId);

  console.log(`Found ${partitionItems.length} items in partition`);
  console.log('Partition items:', partitionItems);

  // Useful for: "Show me all transactions in the same state as this one"
}

/**
 * Example 10: Validate rowId format
 */
async function validateRowIdFormat() {
  const metadataManager = new NamespaceMetadataManager();
  const metadata = await metadataManager.loadMetadata('./data', 'transactions');

  const generator = new RowIdGenerator();

  // Valid rowId
  const validRowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';
  const isValid1 = generator.validateRowId(validRowId, metadata);
  console.log(`${validRowId} is valid:`, isValid1);
  // Output: true

  // Invalid rowId (bad year format)
  const invalidRowId1 = '25.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';
  const isValid2 = generator.validateRowId(invalidRowId1, metadata);
  console.log(`${invalidRowId1} is valid:`, isValid2);
  // Output: false (year doesn't match regex ^\d{4}$)

  // Invalid rowId (wrong number of parts)
  const invalidRowId2 = '2025.US.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';
  const isValid3 = generator.validateRowId(invalidRowId2, metadata);
  console.log(`${invalidRowId2} is valid:`, isValid3);
  // Output: false (missing state partition)
}

/**
 * Example 11: Extract partition path from rowId
 */
async function extractPartitionPath() {
  const metadataManager = new NamespaceMetadataManager();
  const metadata = await metadataManager.loadMetadata('./data', 'transactions');

  const generator = new RowIdGenerator();

  const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

  // Quick extraction without full parsing
  const partitionPath = generator.getPartitionPathFromRowId(rowId, metadata);
  console.log('Partition path:', partitionPath);
  // Output: "year=2025/country=US/state=TX"

  const guid = generator.getGuidFromRowId(rowId);
  console.log('GUID:', guid);
  // Output: "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"
}

/**
 * Example 12: Full workflow - Create, Write, Lookup
 */
async function fullWorkflow() {
  // 1. Setup namespace
  const metadataManager = new NamespaceMetadataManager();
  const config: CreateNamespaceConfig = {
    namespace: 'orders',
    basePath: './data',
    partitionSchema: {
      order: ['year', 'month'],
      partitions: {
        year: {
          type: 'string',
          regex: '^\\d{4}$',
          required: true,
          deriveFromData: '(item) => new Date(item.orderDate).getFullYear().toString()'
        },
        month: {
          type: 'string',
          regex: '^(0[1-9]|1[0-2])$',
          required: true,
          deriveFromData: '(item) => (new Date(item.orderDate).getMonth() + 1).toString().padStart(2, "0")'
        }
      }
    },
    dataFormat: 'jsonl'
  };

  const metadata = await metadataManager.createNamespace(config);

  // 2. Create order with generated rowId
  const generator = new RowIdGenerator();

  const order = {
    orderDate: '2025-10-15T14:30:00Z',
    customerId: 'cust-456',
    amount: 299.99,
    items: ['item-1', 'item-2']
  };

  // Generate rowId from order data
  const rowId = generator.generateRowIdFromItem(metadata, order);

  const orderWithRowId = {
    ...order,
    rowId
  };

  console.log('Order with rowId:', orderWithRowId);
  // rowId: "2025.10.abc123def456"
  // Encodes: year=2025/month=10

  // 3. Write to partition (would use FileJSONL/FileJSON here)
  // await fileJSONL.appendRow(partitionPath, orderWithRowId)

  // 4. Later: Direct lookup by rowId
  const resolver = new RowIdResolver({ basePath: './data' });
  const result = await resolver.lookupByRowId('orders', rowId);

  if (result.found) {
    console.log('Found order:', result.item);
    console.log('Located in:', result.filePath);
    console.log('Lookup took:', result.lookupTime, 'ms');
  }

  // Result: Direct access to ./data/orders/data/year=2025/month=10/data.jsonl
  // No map-reduce across all partitions needed!
}

export {
  generateRowIds,
  generateRowIdFromItem,
  parseRowId,
  lookupByRowId,
  batchLookup,
  updateByRowId,
  deleteByRowId,
  customRowIdFormats,
  getPartitionItems,
  validateRowIdFormat,
  extractPartitionPath,
  fullWorkflow
};
