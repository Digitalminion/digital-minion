/**
 * Standards System Examples
 *
 * Complete examples showing how to create and use policies, roles, and positions.
 */

import { StandardsManager } from './standards-manager';
import {
  Policy,
  Role,
  Position,
  CreatePolicyInput,
  CreateRoleInput,
  CreatePositionInput
} from './types';

/**
 * Example 1: Create complete testing hierarchy
 */
export async function createTestingStandards(manager: StandardsManager) {
  // Step 1: Create policies

  // Basic testing filesystem policy
  const basicTestingPolicy: CreatePolicyInput = {
    name: 'Basic Testing Filesystem Access',
    scope: 'filesystem',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['read:*:*'],
        resources: ['**/*'],
        language: 'Can read all files to understand codebase and what needs testing'
      },
      {
        effect: 'Allow',
        actions: ['create:test:*', 'update:test:*'],
        resources: ['**/*.test.ts', '**/__tests__/**/*'],
        language: 'Can create and modify test files throughout the codebase'
      },
      {
        effect: 'Deny',
        actions: ['delete:*:*'],
        resources: ['**/*'],
        language: 'Cannot delete any files - must request assistance'
      },
      {
        effect: 'Deny',
        actions: ['create:typescript:*', 'update:typescript:*'],
        resources: ['packages/**/!(*.test).ts'],
        language: 'Cannot modify production code - only test files'
      }
    ],
    description: 'Entry-level testing permissions for read-only access and test file modification'
  };

  const basicPolicy = await manager.createPolicy(basicTestingPolicy);

  // Standard testing filesystem policy (extends basic)
  const testingFilesystemPolicy: CreatePolicyInput = {
    name: 'Testing Filesystem Access',
    scope: 'filesystem',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['delete:test:*'],
        resources: ['**/*.test.ts', '**/__tests__/**/*'],
        language: 'Can delete test files created by this entity'
      },
      {
        effect: 'Allow',
        actions: ['update:configuration:test'],
        resources: ['jest.config.js', '**/jest.config.js', '**/.jestrc.*'],
        language: 'Can modify test configuration files'
      }
    ],
    description: 'Standard testing permissions with ability to delete tests and modify configs'
  };

  const testingFsPolicy = await manager.createPolicy(testingFilesystemPolicy);

  // Testing deployment policy
  const testingDeploymentPolicy: CreatePolicyInput = {
    name: 'Testing Deployment Policy',
    scope: 'service',
    domain: 'testing',
    statements: [
      {
        effect: 'Allow',
        actions: ['deploy:service:staging'],
        resources: ['staging/**/*'],
        language: 'Can deploy to staging environment for testing'
      },
      {
        effect: 'Deny',
        actions: ['deploy:service:production'],
        resources: ['production/**/*'],
        language: 'Cannot deploy to production - requires advanced role'
      }
    ],
    description: 'Testing deployment permissions for staging environment'
  };

  const testingDeployPolicy = await manager.createPolicy(testingDeploymentPolicy);

  // Advanced testing deployment policy
  const advancedTestingDeploymentPolicy: CreatePolicyInput = {
    name: 'Advanced Testing Deployment Policy',
    scope: 'service',
    domain: 'testing',
    statements: [
      {
        effect: 'Warn',
        actions: ['deploy:service:production'],
        resources: ['production/**/*'],
        language: 'Can deploy to production but should coordinate with team'
      }
    ],
    description: 'Advanced testing deployment with production access'
  };

  const advancedDeployPolicy = await manager.createPolicy(advancedTestingDeploymentPolicy);

  // Step 2: Create roles

  // BasicTesting role
  const basicTestingRole: CreateRoleInput = {
    name: 'BasicTesting',
    domain: 'testing',
    level: 'basic',
    extends: null, // No parent
    policies: [basicPolicy.id],
    methods: ['Testing'],
    description: 'Entry-level testing role with read access and test file creation'
  };

  const basicRole = await manager.createRole(basicTestingRole);

  // Testing role (extends BasicTesting)
  const testingRole: CreateRoleInput = {
    name: 'Testing',
    domain: 'testing',
    level: 'standard',
    extends: basicRole.id, // Extends BasicTesting
    policies: [testingFsPolicy.id, testingDeployPolicy.id],
    methods: ['Testing', 'CodeReview'],
    description: 'Standard testing role with deletion rights and staging deployment'
  };

  const standardRole = await manager.createRole(testingRole);

  // AdvancedTesting role (extends Testing)
  const advancedTestingRole: CreateRoleInput = {
    name: 'AdvancedTesting',
    domain: 'testing',
    level: 'advanced',
    extends: standardRole.id, // Extends Testing
    policies: [advancedDeployPolicy.id],
    methods: ['Testing', 'CodeReview', 'Documentation', 'Architecture'],
    description: 'Advanced testing role with production deployment and architecture input'
  };

  const advancedRole = await manager.createRole(advancedTestingRole);

  // Step 3: Create positions

  // QA Analyst (uses BasicTesting)
  const qaAnalystPosition: CreatePositionInput = {
    title: 'QA Analyst',
    track: 'quality',
    roles: [basicRole.id],
    methods: ['Testing'],
    requiredAttributes: [
      { name: 'Jest', type: 'framework', minProficiency: 2 },
      { name: 'Testing', type: 'skill', minProficiency: 2 }
    ],
    description: 'Entry-level QA position focused on test creation'
  };

  const qaAnalyst = await manager.createPosition(qaAnalystPosition);

  // QA Engineer (uses Testing)
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
    description: 'Standard QA engineer with testing and code review capabilities'
  };

  const qaEngineer = await manager.createPosition(qaEngineerPosition);

  // Senior QA Engineer (uses AdvancedTesting)
  const seniorQAPosition: CreatePositionInput = {
    title: 'Senior QA Engineer',
    track: 'quality',
    roles: [advancedRole.id],
    methods: ['Testing', 'Documentation', 'CodeReview', 'Architecture'],
    requiredAttributes: [
      { name: 'Jest', type: 'framework', minProficiency: 4 },
      { name: 'TypeScript', type: 'skill', minProficiency: 4 },
      { name: 'Testing', type: 'skill', minProficiency: 4 },
      { name: 'System Design', type: 'skill', minProficiency: 3 }
    ],
    description: 'Senior QA engineer with advanced testing and architecture capabilities'
  };

  const seniorQA = await manager.createPosition(seniorQAPosition);

  return {
    policies: [basicPolicy, testingFsPolicy, testingDeployPolicy, advancedDeployPolicy],
    roles: [basicRole, standardRole, advancedRole],
    positions: [qaAnalyst, qaEngineer, seniorQA]
  };
}

/**
 * Example 2: Create development standards
 */
export async function createDevelopmentStandards(manager: StandardsManager) {
  // Development filesystem policy
  const devFilesystemPolicy: CreatePolicyInput = {
    name: 'Development Filesystem Access',
    scope: 'filesystem',
    domain: 'development',
    statements: [
      {
        effect: 'Allow',
        actions: ['read:*:*'],
        resources: ['**/*'],
        language: 'Can read all files in the codebase'
      },
      {
        effect: 'Allow',
        actions: [
          'create:typescript:*',
          'update:typescript:*',
          'delete:typescript:*',
          'create:test:*',
          'update:test:*',
          'delete:test:*'
        ],
        resources: ['packages/**/src/**/*', 'packages/**/__tests__/**/*'],
        language: 'Can create, modify, and delete TypeScript source and test files'
      },
      {
        effect: 'Deny',
        actions: ['update:configuration:critical', 'delete:configuration:critical'],
        resources: ['package.json', 'tsconfig.json', '.github/**/*'],
        language: 'Cannot modify critical configuration files - requires advanced role'
      }
    ],
    description: 'Standard development permissions for code creation and modification'
  };

  const devFsPolicy = await manager.createPolicy(devFilesystemPolicy);

  // Advanced development policy (can modify configs)
  const advancedDevPolicy: CreatePolicyInput = {
    name: 'Advanced Development Filesystem Access',
    scope: 'filesystem',
    domain: 'development',
    statements: [
      {
        effect: 'Allow',
        actions: ['update:configuration:critical', 'delete:configuration:critical'],
        resources: ['package.json', 'tsconfig.json', '.github/**/*'],
        language: 'Can modify critical configuration files'
      }
    ],
    description: 'Advanced development permissions including configuration changes'
  };

  const advancedDevFsPolicy = await manager.createPolicy(advancedDevPolicy);

  // Development deployment policy
  const devDeploymentPolicy: CreatePolicyInput = {
    name: 'Development Deployment Policy',
    scope: 'service',
    domain: 'deployment',
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
        language: 'Cannot deploy to production without approval'
      }
    ],
    description: 'Development deployment limited to staging'
  };

  const devDeployPolicy = await manager.createPolicy(devDeploymentPolicy);

  // Create roles
  const developmentRole: CreateRoleInput = {
    name: 'Development',
    domain: 'development',
    level: 'standard',
    extends: null,
    policies: [devFsPolicy.id, devDeployPolicy.id],
    methods: ['Class', 'Interface', 'Function', 'Testing'],
    description: 'Standard development role for code creation'
  };

  const devRole = await manager.createRole(developmentRole);

  const advancedDevelopmentRole: CreateRoleInput = {
    name: 'AdvancedDevelopment',
    domain: 'development',
    level: 'advanced',
    extends: devRole.id,
    policies: [advancedDevFsPolicy.id],
    methods: ['Class', 'Interface', 'Function', 'Testing', 'Architecture', 'Documentation'],
    description: 'Advanced development with configuration and architecture capabilities'
  };

  const advancedDevRole = await manager.createRole(advancedDevelopmentRole);

  // Create positions
  const developerPosition: CreatePositionInput = {
    title: 'Software Developer',
    track: 'engineering',
    roles: [devRole.id],
    methods: ['Class', 'Interface', 'Function', 'Testing'],
    requiredAttributes: [
      { name: 'TypeScript', type: 'skill', minProficiency: 3 },
      { name: 'Node.js', type: 'framework', minProficiency: 3 },
      { name: 'Git', type: 'tool', minProficiency: 3 }
    ],
    description: 'Software developer position for code creation and testing'
  };

  const developer = await manager.createPosition(developerPosition);

  const seniorDeveloperPosition: CreatePositionInput = {
    title: 'Senior Software Developer',
    track: 'engineering',
    roles: [advancedDevRole.id],
    methods: ['Class', 'Interface', 'Function', 'Testing', 'Architecture', 'Documentation'],
    requiredAttributes: [
      { name: 'TypeScript', type: 'skill', minProficiency: 4 },
      { name: 'Node.js', type: 'framework', minProficiency: 4 },
      { name: 'System Design', type: 'skill', minProficiency: 4 },
      { name: 'Git', type: 'tool', minProficiency: 4 }
    ],
    description: 'Senior developer with architecture and configuration capabilities'
  };

  const seniorDev = await manager.createPosition(seniorDeveloperPosition);

  return {
    policies: [devFsPolicy, advancedDevFsPolicy, devDeployPolicy],
    roles: [devRole, advancedDevRole],
    positions: [developer, seniorDev]
  };
}

/**
 * Example 3: Check access for different positions
 */
export async function demonstrateAccessControl(manager: StandardsManager) {
  // Simulate access checks

  // QA Analyst trying to create a test
  const qaAnalystCreateTest = await manager.checkAccess(
    {
      entityId: 'qa-analyst-001',
      action: 'create:test:unit',
      resource: 'packages/core/src/__tests__/user.test.ts'
    },
    'position-qa-analyst-001'
  );

  console.log('QA Analyst creating test:', qaAnalystCreateTest.allowed);
  // Expected: true

  // QA Analyst trying to delete production code
  const qaAnalystDeleteCode = await manager.checkAccess(
    {
      entityId: 'qa-analyst-001',
      action: 'delete:typescript:class',
      resource: 'packages/core/src/user.ts'
    },
    'position-qa-analyst-001'
  );

  console.log('QA Analyst deleting code:', qaAnalystDeleteCode.allowed);
  // Expected: false (Deny policy)

  // QA Engineer trying to deploy to staging
  const qaEngineerDeployStaging = await manager.checkAccess(
    {
      entityId: 'qa-engineer-001',
      action: 'deploy:service:staging',
      resource: 'staging/user-service'
    },
    'position-qa-engineer-001'
  );

  console.log('QA Engineer deploying to staging:', qaEngineerDeployStaging.allowed);
  // Expected: true

  // QA Engineer trying to deploy to production
  const qaEngineerDeployProd = await manager.checkAccess(
    {
      entityId: 'qa-engineer-001',
      action: 'deploy:service:production',
      resource: 'production/user-service'
    },
    'position-qa-engineer-001'
  );

  console.log('QA Engineer deploying to production:', qaEngineerDeployProd.allowed);
  // Expected: false (Deny policy)

  // Senior QA Engineer trying to deploy to production
  const seniorQADeployProd = await manager.checkAccess(
    {
      entityId: 'senior-qa-001',
      action: 'deploy:service:production',
      resource: 'production/user-service'
    },
    'position-senior-qa-engineer-001'
  );

  console.log('Senior QA deploying to production:', seniorQADeployProd.allowed);
  // Expected: true (but with warnings)
  console.log('Warnings:', seniorQADeployProd.warnings);

  // Developer trying to modify code
  const developerModifyCode = await manager.checkAccess(
    {
      entityId: 'developer-001',
      action: 'update:typescript:class',
      resource: 'packages/core/src/user.ts'
    },
    'position-software-developer-001'
  );

  console.log('Developer modifying code:', developerModifyCode.allowed);
  // Expected: true

  // Developer trying to modify package.json
  const developerModifyConfig = await manager.checkAccess(
    {
      entityId: 'developer-001',
      action: 'update:configuration:critical',
      resource: 'package.json'
    },
    'position-software-developer-001'
  );

  console.log('Developer modifying package.json:', developerModifyConfig.allowed);
  // Expected: false (Deny policy)

  // Senior Developer trying to modify package.json
  const seniorDevModifyConfig = await manager.checkAccess(
    {
      entityId: 'senior-dev-001',
      action: 'update:configuration:critical',
      resource: 'package.json'
    },
    'position-senior-software-developer-001'
  );

  console.log('Senior Developer modifying package.json:', seniorDevModifyConfig.allowed);
  // Expected: true (child role overrides parent Deny)
}

/**
 * Example 4: Complete setup for a team
 */
export async function setupCompleteTeamStandards() {
  const manager = new StandardsManager({
    basePath: './.minion/local',
    administrativeUnit: 'digital-minion',
    businessUnit: 'corp',
    organization: 'global-information-security',
    team: 'global-threat-management'
  });

  console.log('Creating testing standards...');
  const testingStandards = await createTestingStandards(manager);
  console.log(`Created ${testingStandards.policies.length} testing policies`);
  console.log(`Created ${testingStandards.roles.length} testing roles`);
  console.log(`Created ${testingStandards.positions.length} testing positions`);

  console.log('\nCreating development standards...');
  const developmentStandards = await createDevelopmentStandards(manager);
  console.log(`Created ${developmentStandards.policies.length} development policies`);
  console.log(`Created ${developmentStandards.roles.length} development roles`);
  console.log(`Created ${developmentStandards.positions.length} development positions`);

  console.log('\nDiscovering all standards...');
  const manifest = await manager.discoverStandards();
  console.log(`Total policies: ${manifest.stats.totalPolicies}`);
  console.log(`Total roles: ${manifest.stats.totalRoles}`);
  console.log(`Total positions: ${manifest.stats.totalPositions}`);

  console.log('\nDemonstrating access control...');
  await demonstrateAccessControl(manager);

  return {
    testingStandards,
    developmentStandards,
    manifest
  };
}
