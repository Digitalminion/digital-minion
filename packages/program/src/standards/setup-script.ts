/**
 * Standards Setup Script
 *
 * Creates a complete standards structure in .minion/local for digital-minion
 */

import { StandardsManager } from './standards-manager';
import { CreatePolicyInput, CreateRoleInput, CreatePositionInput } from './types';

async function setupStandards() {
  console.log('=== Digital Minion Standards Setup ===\n');

  // Initialize manager for digital-minion administrative unit
  const manager = new StandardsManager({
    basePath: './.minion/local',
    administrativeUnit: 'digital-minion',
    businessUnit: 'corp',
    organization: 'platform',
    team: 'engineering'
  });

  console.log('Creating standards in:');
  console.log('./.minion/local/administrative_unit=digital-minion/business_unit=corp/organization=platform/team=engineering/\n');

  // ===== Step 1: Create Testing Standards =====
  console.log('Step 1: Creating testing policies...');

  const basicTestingPolicy: CreatePolicyInput = {
    name: 'Basic Testing Filesystem Access',
    scope: 'filesystem',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['read:*:*'],
        resources: ['**/*'],
        language: 'Can read all files to understand codebase'
      },
      {
        effect: 'Allow',
        actions: ['create:test:*', 'update:test:*'],
        resources: ['**/*.test.ts', '**/__tests__/**/*'],
        language: 'Can create and modify test files'
      },
      {
        effect: 'Deny',
        actions: ['delete:*:*'],
        resources: ['**/*'],
        language: 'Cannot delete any files'
      }
    ],
    description: 'Entry-level testing permissions'
  };

  const basicPolicy = await manager.createPolicy(basicTestingPolicy);
  console.log(`✓ Created policy: ${basicPolicy.name} (${basicPolicy.id})`);

  const testingFilesystemPolicy: CreatePolicyInput = {
    name: 'Testing Filesystem Access',
    scope: 'filesystem',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['delete:test:*'],
        resources: ['**/*.test.ts', '**/__tests__/**/*'],
        language: 'Can delete test files'
      }
    ],
    description: 'Standard testing permissions with deletion rights'
  };

  const testingFsPolicy = await manager.createPolicy(testingFilesystemPolicy);
  console.log(`✓ Created policy: ${testingFsPolicy.name} (${testingFsPolicy.id})`);

  const testingDeploymentPolicy: CreatePolicyInput = {
    name: 'Testing Deployment Policy',
    scope: 'service',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['deploy:service:staging'],
        resources: ['staging/**/*'],
        language: 'Can deploy to staging environment'
      },
      {
        effect: 'Deny',
        actions: ['deploy:service:production'],
        resources: ['production/**/*'],
        language: 'Cannot deploy to production'
      }
    ],
    description: 'Testing deployment limited to staging'
  };

  const testingDeployPolicy = await manager.createPolicy(testingDeploymentPolicy);
  console.log(`✓ Created policy: ${testingDeployPolicy.name} (${testingDeployPolicy.id})\n`);

  // ===== Step 2: Create Testing Roles =====
  console.log('Step 2: Creating testing roles...');

  const basicTestingRole: CreateRoleInput = {
    name: 'BasicTesting',
    domain: 'testing',
    level: 'basic',
    extends: null,
    policies: [basicPolicy.id],
    methods: ['Testing'],
    description: 'Entry-level testing role'
  };

  const basicRole = await manager.createRole(basicTestingRole);
  console.log(`✓ Created role: ${basicRole.name} (${basicRole.id})`);

  const testingRole: CreateRoleInput = {
    name: 'Testing',
    domain: 'testing',
    level: 'standard',
    extends: basicRole.id,
    policies: [testingFsPolicy.id, testingDeployPolicy.id],
    methods: ['Testing', 'CodeReview'],
    description: 'Standard testing role'
  };

  const standardRole = await manager.createRole(testingRole);
  console.log(`✓ Created role: ${standardRole.name} (${standardRole.id})\n`);

  // ===== Step 3: Create Testing Positions =====
  console.log('Step 3: Creating testing positions...');

  const qaAnalystPosition: CreatePositionInput = {
    title: 'QA Analyst',
    track: 'quality',
    roles: [basicRole.id],
    methods: ['Testing'],
    requiredAttributes: [
      { name: 'Jest', type: 'framework', minProficiency: 2 },
      { name: 'Testing', type: 'skill', minProficiency: 2 }
    ],
    description: 'Entry-level QA position'
  };

  const qaAnalyst = await manager.createPosition(qaAnalystPosition);
  console.log(`✓ Created position: ${qaAnalyst.title} (${qaAnalyst.id})`);

  const qaEngineerPosition: CreatePositionInput = {
    title: 'QA Engineer',
    track: 'quality',
    roles: [standardRole.id],
    methods: ['Testing', 'Documentation', 'CodeReview'],
    requiredAttributes: [
      { name: 'Jest', type: 'framework', minProficiency: 3 },
      { name: 'TypeScript', type: 'skill', minProficiency: 3 },
      { name: 'Testing', type: 'skill', minProficiency: 3 }
    ],
    description: 'Standard QA engineer'
  };

  const qaEngineer = await manager.createPosition(qaEngineerPosition);
  console.log(`✓ Created position: ${qaEngineer.title} (${qaEngineer.id})\n`);

  // ===== Step 4: Create Development Standards =====
  console.log('Step 4: Creating development policies...');

  const devFilesystemPolicy: CreatePolicyInput = {
    name: 'Development Filesystem Access',
    scope: 'filesystem',
    domain: 'development',
    statements: [
      {
        effect: 'Allow',
        actions: ['read:*:*'],
        resources: ['**/*'],
        language: 'Can read all files'
      },
      {
        effect: 'Allow',
        actions: ['create:typescript:*', 'update:typescript:*', 'delete:typescript:*'],
        resources: ['packages/**/src/**/*'],
        language: 'Can create, modify, and delete source files'
      }
    ],
    description: 'Standard development permissions'
  };

  const devFsPolicy = await manager.createPolicy(devFilesystemPolicy);
  console.log(`✓ Created policy: ${devFsPolicy.name} (${devFsPolicy.id})\n`);

  console.log('Step 5: Creating development roles...');

  const developmentRole: CreateRoleInput = {
    name: 'Development',
    domain: 'development',
    level: 'standard',
    extends: null,
    policies: [devFsPolicy.id],
    methods: ['Class', 'Interface', 'Function', 'Testing'],
    description: 'Standard development role'
  };

  const devRole = await manager.createRole(developmentRole);
  console.log(`✓ Created role: ${devRole.name} (${devRole.id})\n`);

  console.log('Step 6: Creating development positions...');

  const developerPosition: CreatePositionInput = {
    title: 'Software Developer',
    track: 'engineering',
    roles: [devRole.id],
    methods: ['Class', 'Interface', 'Function', 'Testing'],
    requiredAttributes: [
      { name: 'TypeScript', type: 'skill', minProficiency: 3 },
      { name: 'Node.js', type: 'framework', minProficiency: 3 }
    ],
    description: 'Software developer position'
  };

  const developer = await manager.createPosition(developerPosition);
  console.log(`✓ Created position: ${developer.title} (${developer.id})\n`);

  // ===== Step 7: Create Security Standards =====
  console.log('Step 7: Creating security policies...');

  const securityReadPolicy: CreatePolicyInput = {
    name: 'Security Read Access',
    scope: 'filesystem',
    domain: 'security',
    statements: [
      {
        effect: 'Allow',
        actions: ['read:*:*'],
        resources: ['**/*'],
        language: 'Can read all files for security audits'
      },
      {
        effect: 'Deny',
        actions: ['create:*:*', 'update:*:*', 'delete:*:*'],
        resources: ['**/*'],
        language: 'Cannot modify files - read-only for audits'
      }
    ],
    description: 'Read-only access for security audits'
  };

  const secPolicy = await manager.createPolicy(securityReadPolicy);
  console.log(`✓ Created policy: ${secPolicy.name} (${secPolicy.id})\n`);

  console.log('Step 8: Creating security roles...');

  const securityRole: CreateRoleInput = {
    name: 'Security',
    domain: 'security',
    level: 'standard',
    extends: null,
    policies: [secPolicy.id],
    methods: ['SecurityAudit'],
    description: 'Security audit role'
  };

  const secRole = await manager.createRole(securityRole);
  console.log(`✓ Created role: ${secRole.name} (${secRole.id})\n`);

  console.log('Step 9: Creating security positions...');

  const securityAnalystPosition: CreatePositionInput = {
    title: 'Security Analyst',
    track: 'security',
    roles: [secRole.id],
    methods: ['SecurityAudit'],
    requiredAttributes: [
      { name: 'Security Analysis', type: 'skill', minProficiency: 3 },
      { name: 'Code Review', type: 'skill', minProficiency: 3 }
    ],
    description: 'Security analyst position'
  };

  const securityAnalyst = await manager.createPosition(securityAnalystPosition);
  console.log(`✓ Created position: ${securityAnalyst.title} (${securityAnalyst.id})\n`);

  // ===== Step 10: Generate manifest =====
  console.log('Step 10: Generating standards manifest...');
  const manifest = await manager.discoverStandards();

  console.log('\n=== Standards Setup Complete ===');
  console.log(`Total Policies: ${manifest.stats.totalPolicies}`);
  console.log(`Total Roles: ${manifest.stats.totalRoles}`);
  console.log(`Total Positions: ${manifest.stats.totalPositions}`);
  console.log('\nManifest saved to: standard.manifest.json');

  console.log('\n=== Created Directory Structure ===');
  console.log('standard=policy/');
  console.log('  ├── scope=filesystem/');
  console.log('  │   ├── domain=testing/policies.jsonl');
  console.log('  │   ├── domain=development/policies.jsonl');
  console.log('  │   └── domain=security/policies.jsonl');
  console.log('  └── scope=service/');
  console.log('      └── domain=testing/policies.jsonl');
  console.log('standard=role/');
  console.log('  ├── domain=testing/');
  console.log('  │   ├── level=basic/roles.jsonl');
  console.log('  │   └── level=standard/roles.jsonl');
  console.log('  ├── domain=development/');
  console.log('  │   └── level=standard/roles.jsonl');
  console.log('  └── domain=security/');
  console.log('      └── level=standard/roles.jsonl');
  console.log('standard=position/');
  console.log('  ├── track=quality/positions.jsonl');
  console.log('  ├── track=engineering/positions.jsonl');
  console.log('  └── track=security/positions.jsonl');
  console.log('standard.manifest.json');

  return manifest;
}

// Run if executed directly
if (require.main === module) {
  setupStandards()
    .then(() => {
      console.log('\n✓ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Setup failed:', error);
      process.exit(1);
    });
}

export { setupStandards };
