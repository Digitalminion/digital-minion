/**
 * Setup script for Global Threat Management team function trackers.
 * Creates function=projects/, function=matters/, and function=maintenance/ folders
 * with realistic security operations mock data.
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { v7 as uuidv7 } from 'uuid';
import type { Project, ProjectStatus, ProjectStage, Feature, ProjectTask, ProjectSubtask } from '../packages/program/src/functions/project/types';
import type { Matter, MatterType, MatterStatus, Activity, DiscreteTask, SLA } from '../packages/program/src/functions/matter/types';
import type { MaintenanceSchedule, Process, ProcessStatus, RecurrencePattern, MaintenanceTask, MaintenanceStep, TimeSection, TaskTemplate } from '../packages/program/src/functions/maintenance/types';
import type { ProgramContext } from '../packages/program/src/core/types';

// Team base path
const TEAM_PATH = join(
  process.cwd(),
  '.minion',
  'local',
  'administrative_unit=digital-minion',
  'business_unit=corp',
  'organization=global-information-security',
  'team=global-threat-management'
);

/**
 * Hash function for generating consistent file names
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate base program context
 */
function createContext(functionType: 'project' | 'matter' | 'maintenance'): ProgramContext {
  return {
    administrativeUnit: {
      id: 'digital-minion',
      name: 'Digital Minion',
      businessUnits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    businessUnit: {
      id: 'corp',
      administrativeUnitId: 'digital-minion',
      name: 'Corporate',
      organizations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    organization: {
      id: 'global-information-security',
      businessUnitId: 'corp',
      name: 'Global Information Security',
      teams: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    team: {
      id: 'global-threat-management',
      organizationId: 'global-information-security',
      name: 'Global Threat Management',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    functionType,
    backendType: 'local'
  };
}

/**
 * Generate project work items
 */
function generateProjects(): Project[] {
  const now = new Date();
  const context = createContext('project');

  // Project 1: SIEM Integration
  const project1Id = uuidv7();
  const feature1Id = uuidv7();
  const task1Id = uuidv7();
  const subtask1_1Id = uuidv7();
  const subtask1_2Id = uuidv7();
  const task2Id = uuidv7();
  const subtask2_1Id = uuidv7();
  const subtask2_2Id = uuidv7();
  const feature2Id = uuidv7();

  // Project 2: EDR Deployment
  const project2Id = uuidv7();
  const feature3Id = uuidv7();

  const projects: Project[] = [
    {
      id: project1Id,
      name: 'SIEM Integration and Enhancement',
      description: 'Integrate new threat intelligence feeds into SIEM platform and enhance detection rules',
      status: 'active' as ProjectStatus,
      context,
      owner: 'security-team-lead',
      targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      stages: ['backlog', 'scoping', 'working', 'validating', 'documenting', 'delivered'],
      features: [
        {
          id: feature1Id,
          projectId: project1Id,
          name: 'Threat Intelligence Feed Integration',
          description: 'Integrate commercial and OSINT threat feeds',
          status: 'in-progress',
          targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tasks: [
            {
              id: task1Id,
              projectId: project1Id,
              featureId: feature1Id,
              name: 'Evaluate threat intelligence providers',
              description: 'Compare pricing, quality, and coverage',
              completed: true,
              stage: 'delivered' as ProjectStage,
              assignee: 'senior-analyst-1',
              tags: ['research', 'threat-intel'],
              subtasks: [
                {
                  id: subtask1_1Id,
                  taskId: task1Id,
                  name: 'Compare top 5 providers',
                  completed: true,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                },
                {
                  id: subtask1_2Id,
                  taskId: task1Id,
                  name: 'Run POC with top 2 choices',
                  completed: true,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                }
              ],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            },
            {
              id: task2Id,
              projectId: project1Id,
              featureId: feature1Id,
              name: 'Integrate selected feeds into SIEM',
              description: 'Configure API connections and data parsing',
              completed: false,
              stage: 'working' as ProjectStage,
              assignee: 'analyst-2',
              tags: ['integration', 'siem'],
              subtasks: [
                {
                  id: subtask2_1Id,
                  taskId: task2Id,
                  name: 'Configure API connections',
                  completed: true,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                },
                {
                  id: subtask2_2Id,
                  taskId: task2Id,
                  name: 'Build data parsing rules',
                  completed: false,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                }
              ],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: feature2Id,
          projectId: project1Id,
          name: 'Enhanced Detection Rules',
          description: 'Create new detection rules based on MITRE ATT&CK',
          status: 'planned',
          targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          tasks: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      progress: {
        totalFeatures: 2,
        completedFeatures: 0,
        totalTasks: 2,
        completedTasks: 1
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: project2Id,
      name: 'EDR Solution Deployment',
      description: 'Deploy endpoint detection and response solution across organization',
      status: 'planning' as ProjectStatus,
      context,
      owner: 'security-team-lead',
      targetDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      stages: ['backlog', 'scoping', 'working', 'validating', 'documenting', 'delivered'],
      features: [
        {
          id: feature3Id,
          projectId: project2Id,
          name: 'EDR Tool Selection',
          description: 'Evaluate and select EDR solution',
          status: 'planned',
          tasks: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      progress: {
        totalFeatures: 1,
        completedFeatures: 0,
        totalTasks: 0,
        completedTasks: 0
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  return projects;
}

/**
 * Generate matter work items
 */
function generateMatters(): Matter[] {
  const now = new Date();
  const context = createContext('matter');

  // Matter 1: Phishing Campaign
  const matter1Id = uuidv7();
  const activity1Id = uuidv7();
  const discrete1_1Id = uuidv7();
  const discrete1_2Id = uuidv7();
  const activity2Id = uuidv7();
  const discrete2_1Id = uuidv7();
  const discrete2_2Id = uuidv7();

  // Matter 2: CVE Remediation
  const matter2Id = uuidv7();
  const activity3Id = uuidv7();
  const discrete3_1Id = uuidv7();
  const activity4Id = uuidv7();
  const discrete4_1Id = uuidv7();
  const discrete4_2Id = uuidv7();

  // Matter 3: Access Request
  const matter3Id = uuidv7();

  const matters: Matter[] = [
    {
      id: matter1Id,
      name: 'Targeted Phishing Campaign Investigation',
      description: 'Multiple executives received spear-phishing emails with malicious attachments',
      type: 'incident' as MatterType,
      status: 'investigating' as MatterStatus,
      context,
      requestedBy: 'soc-analyst',
      discoveredDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      sla: {
        responseTime: 1,
        resolutionTime: 24,
        priority: 'high'
      } as SLA,
      activities: [
        {
          id: activity1Id,
          matterId: matter1Id,
          name: 'Email Header and Attachment Analysis',
          description: 'Analyze email headers, links, and attachments for IOCs',
          status: 'complete',
          assignee: 'analyst-1',
          tags: ['email', 'forensics'],
          tasks: [
            {
              id: discrete1_1Id,
              activityId: activity1Id,
              name: 'Extract IOCs from emails',
              completed: true,
              assignee: 'analyst-1',
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            },
            {
              id: discrete1_2Id,
              activityId: activity1Id,
              name: 'Sandbox suspicious attachments',
              completed: true,
              assignee: 'analyst-1',
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: activity2Id,
          matterId: matter1Id,
          name: 'Threat Hunt for Additional Compromise',
          description: 'Search for signs of successful compromise across environment',
          status: 'in-progress',
          assignee: 'senior-analyst-1',
          tags: ['threat-hunt', 'investigation'],
          tasks: [
            {
              id: discrete2_1Id,
              activityId: activity2Id,
              name: 'Search SIEM for IOCs',
              completed: true,
              assignee: 'senior-analyst-1',
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            },
            {
              id: discrete2_2Id,
              activityId: activity2Id,
              name: 'Check endpoint logs for execution',
              completed: false,
              assignee: 'senior-analyst-1',
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      progress: {
        totalActivities: 2,
        completedActivities: 1,
        totalTasks: 4,
        completedTasks: 3
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: matter2Id,
      name: 'Critical CVE-2024-12345 Remediation',
      description: 'Critical vulnerability discovered in production web servers',
      type: 'vulnerability' as MatterType,
      status: 'in-progress' as MatterStatus,
      context,
      requestedBy: 'vuln-scanner',
      discoveredDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      sla: {
        responseTime: 2,
        resolutionTime: 48,
        priority: 'critical'
      } as SLA,
      activities: [
        {
          id: activity3Id,
          matterId: matter2Id,
          name: 'Impact Assessment',
          description: 'Determine affected systems and business impact',
          status: 'complete',
          assignee: 'analyst-2',
          tags: ['vulnerability', 'assessment'],
          tasks: [
            {
              id: discrete3_1Id,
              activityId: activity3Id,
              name: 'Scan for affected systems',
              completed: true,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: activity4Id,
          matterId: matter2Id,
          name: 'Emergency Patching',
          description: 'Apply patches to all affected systems',
          status: 'in-progress',
          assignee: 'sysadmin-team',
          tags: ['patching', 'remediation'],
          tasks: [
            {
              id: discrete4_1Id,
              activityId: activity4Id,
              name: 'Test patch in staging',
              completed: true,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            },
            {
              id: discrete4_2Id,
              activityId: activity4Id,
              name: 'Deploy to production',
              completed: false,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }
          ],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      progress: {
        totalActivities: 2,
        completedActivities: 1,
        totalTasks: 3,
        completedTasks: 2
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: matter3Id,
      name: 'New Analyst Security Tool Access',
      description: 'New analyst needs access to SIEM, EDR, and threat intel platforms',
      type: 'request' as MatterType,
      status: 'open' as MatterStatus,
      context,
      requestedBy: 'new-analyst',
      discoveredDate: now.toISOString(),
      sla: {
        responseTime: 4,
        resolutionTime: 24,
        priority: 'medium'
      } as SLA,
      activities: [],
      progress: {
        totalActivities: 0,
        completedActivities: 0,
        totalTasks: 0,
        completedTasks: 0
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  return matters;
}

/**
 * Generate maintenance schedules
 */
function generateMaintenanceSchedules(): MaintenanceSchedule[] {
  const now = new Date();
  const context = createContext('maintenance');

  // Schedule 1: Security Operations
  const schedule1Id = uuidv7();
  const process1Id = uuidv7();
  const process2Id = uuidv7();
  const process3Id = uuidv7();

  const schedules: MaintenanceSchedule[] = [
    {
      id: schedule1Id,
      name: 'Security Operations Maintenance',
      description: 'Recurring security operations and monitoring tasks',
      status: 'active',
      context,
      sections: ['overdue', 'due-now', 'due-today', 'due-tomorrow', 'due-end-of-week', 'due-end-of-month', 'future'],
      processes: [
        {
          id: process1Id,
          scheduleId: schedule1Id,
          name: 'Daily Security Log Review',
          description: 'Review security logs for anomalies and potential incidents',
          status: 'active' as ProcessStatus,
          recurrence: 'daily' as RecurrencePattern,
          template: {
            name: 'Daily Log Review - {{date}}',
            description: 'Review all security logs from the past 24 hours',
            defaultAssignee: 'soc-analyst',
            estimatedDuration: '2 hours',
            steps: [
              {
                name: 'Review SIEM alerts',
                defaultAssignee: 'soc-analyst'
              },
              {
                name: 'Check firewall logs',
                defaultAssignee: 'soc-analyst'
              },
              {
                name: 'Review failed authentication attempts',
                defaultAssignee: 'soc-analyst'
              },
              {
                name: 'Document any findings',
                defaultAssignee: 'soc-analyst'
              }
            ],
            tags: ['daily', 'monitoring', 'logs']
          } as TaskTemplate,
          lastGenerated: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          nextScheduled: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: process2Id,
          scheduleId: schedule1Id,
          name: 'Weekly Threat Hunting',
          description: 'Proactive threat hunting based on current threat landscape',
          status: 'active' as ProcessStatus,
          recurrence: 'weekly' as RecurrencePattern,
          template: {
            name: 'Weekly Threat Hunt - Week of {{date}}',
            description: 'Conduct proactive threat hunting activities',
            defaultAssignee: 'senior-analyst-1',
            estimatedDuration: '4 hours',
            steps: [
              {
                name: 'Review latest threat intelligence',
                defaultAssignee: 'senior-analyst-1'
              },
              {
                name: 'Develop hunting hypothesis',
                defaultAssignee: 'senior-analyst-1'
              },
              {
                name: 'Execute hunt queries',
                defaultAssignee: 'senior-analyst-1'
              },
              {
                name: 'Document findings and update detections',
                defaultAssignee: 'senior-analyst-1'
              }
            ],
            tags: ['weekly', 'threat-hunting', 'proactive']
          } as TaskTemplate,
          lastGenerated: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          nextScheduled: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: process3Id,
          scheduleId: schedule1Id,
          name: 'Monthly Vulnerability Scan',
          description: 'Comprehensive vulnerability scanning of all systems',
          status: 'active' as ProcessStatus,
          recurrence: 'monthly' as RecurrencePattern,
          template: {
            name: 'Monthly Vulnerability Scan - {{month}}',
            description: 'Scan all systems for vulnerabilities',
            defaultAssignee: 'analyst-2',
            estimatedDuration: '8 hours',
            steps: [
              {
                name: 'Run vulnerability scanners',
                defaultAssignee: 'analyst-2'
              },
              {
                name: 'Analyze scan results',
                defaultAssignee: 'analyst-2'
              },
              {
                name: 'Create remediation tickets',
                defaultAssignee: 'analyst-2'
              },
              {
                name: 'Report to leadership',
                defaultAssignee: 'security-team-lead'
              }
            ],
            tags: ['monthly', 'vulnerability', 'scanning']
          } as TaskTemplate,
          lastGenerated: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          nextScheduled: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  return schedules;
}

/**
 * Write JSONL data to file
 */
async function writeJsonl(filePath: string, data: any[]): Promise<void> {
  const lines = data.map(item => JSON.stringify(item)).join('\n') + '\n';
  await writeFile(filePath, lines, 'utf-8');
}

/**
 * Main setup function
 */
async function setupFunctions() {
  console.log('Setting up Global Threat Management team functions...\n');

  // Generate data
  const projects = generateProjects();
  const matters = generateMatters();
  const maintenanceSchedules = generateMaintenanceSchedules();

  // Create function folders
  const projectsDir = join(TEAM_PATH, 'function=projects');
  const mattersDir = join(TEAM_PATH, 'function=matters');
  const maintenanceDir = join(TEAM_PATH, 'function=maintenance');

  await mkdir(projectsDir, { recursive: true });
  await mkdir(mattersDir, { recursive: true });
  await mkdir(maintenanceDir, { recursive: true });

  // Write project data
  const projectHash = hashString(projectsDir);
  const projectFile = join(projectsDir, `data-${projectHash}.jsonl`);
  await writeJsonl(projectFile, projects);
  console.log(`✓ Created ${projects.length} projects in function=projects/data-${projectHash}.jsonl`);

  // Write matter data
  const matterHash = hashString(mattersDir);
  const matterFile = join(mattersDir, `data-${matterHash}.jsonl`);
  await writeJsonl(matterFile, matters);
  console.log(`✓ Created ${matters.length} matters in function=matters/data-${matterHash}.jsonl`);

  // Write maintenance data
  const maintenanceHash = hashString(maintenanceDir);
  const maintenanceFile = join(maintenanceDir, `data-${maintenanceHash}.jsonl`);
  await writeJsonl(maintenanceFile, maintenanceSchedules);
  console.log(`✓ Created ${maintenanceSchedules.length} maintenance schedules in function=maintenance/data-${maintenanceHash}.jsonl`);

  // Create function manifest
  const manifest = {
    teamId: 'global-threat-management',
    administrativeUnit: 'digital-minion',
    businessUnit: 'corp',
    organization: 'global-information-security',
    team: 'global-threat-management',
    stats: {
      totalProjects: projects.length,
      totalMatters: matters.length,
      totalMaintenanceSchedules: maintenanceSchedules.length
    },
    discoveredFunctions: {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        path: `function=projects/data-${projectHash}.jsonl`
      })),
      matters: matters.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        priority: m.sla?.priority,
        path: `function=matters/data-${matterHash}.jsonl`
      })),
      maintenance: maintenanceSchedules.map(s => ({
        id: s.id,
        name: s.name,
        totalProcesses: s.processes.length,
        path: `function=maintenance/data-${maintenanceHash}.jsonl`
      }))
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const manifestFile = join(TEAM_PATH, 'function.manifest.json');
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✓ Created function.manifest.json`);

  console.log('\n✅ Function setup complete!');
  console.log(`\nSummary:`);
  console.log(`  - ${projects.length} projects with ${projects.reduce((sum, p) => sum + p.features.length, 0)} features`);
  console.log(`  - ${matters.length} matters with ${matters.reduce((sum, m) => sum + m.activities.length, 0)} activities`);
  console.log(`  - ${maintenanceSchedules.length} maintenance schedules with ${maintenanceSchedules.reduce((sum, s) => sum + s.processes.length, 0)} processes`);
}

// Run setup
setupFunctions().catch(console.error);
