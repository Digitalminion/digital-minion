/**
 * Setup script for Global Threat Management team entities.
 * Creates entity=person, entity=agent, entity=device, and entity=service
 * with realistic security operations mock data.
 */

import { join } from 'path';
import { v7 as uuidv7 } from 'uuid';
import { EntityManager } from '../packages/program/src/entities/entity-manager';
import type {
  CreatePersonInput,
  CreateAgentInput,
  CreateDeviceInput,
  CreateServiceInput,
  Attribute
} from '../packages/program/src/entities/types';

const BASE_PATH = join(process.cwd(), '.minion', 'local');

const config = {
  basePath: BASE_PATH,
  teamId: 'global-threat-management',
  administrativeUnit: 'digital-minion',
  businessUnit: 'corp',
  organization: 'global-information-security',
  team: 'global-threat-management'
};

/**
 * Generate person entities (security team members)
 */
async function generatePersons(manager: EntityManager) {
  console.log('Creating person entities...');

  const persons: CreatePersonInput[] = [
    {
      id: uuidv7(),
      name: 'Sarah Chen',
      personType: 'employee',
      contact: {
        email: 'sarah.chen@digitalminion.dev',
        location: 'Seattle, WA',
        timezone: 'America/Los_Angeles'
      },
      positionId: uuidv7(),
      description: 'Security Team Lead with 10+ years experience',
      tags: ['security', 'leadership', 'incident-response'],
      attributes: [
        {
          name: 'Incident Response',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2015-01-01T00:00:00Z'
        },
        {
          name: 'Threat Hunting',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2016-06-01T00:00:00Z'
        },
        {
          name: 'CISSP',
          type: 'certification',
          validated: true,
          acquired_at: '2018-03-15T00:00:00Z',
          expires_at: '2027-03-15T00:00:00Z',
          evidence: ['https://cert.isc2.org/cissp-sarah-chen']
        },
        {
          name: 'Team Leadership',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2019-01-01T00:00:00Z'
        },
        {
          name: 'Python',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2017-01-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Marcus Johnson',
      personType: 'employee',
      contact: {
        email: 'marcus.johnson@digitalminion.dev',
        location: 'Austin, TX',
        timezone: 'America/Chicago'
      },
      positionId: uuidv7(),
      description: 'Senior Security Analyst specializing in threat hunting',
      tags: ['security', 'threat-hunting', 'malware-analysis'],
      attributes: [
        {
          name: 'Threat Hunting',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2018-01-01T00:00:00Z'
        },
        {
          name: 'Malware Analysis',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2019-06-01T00:00:00Z'
        },
        {
          name: 'GCIH',
          type: 'certification',
          validated: true,
          acquired_at: '2020-08-15T00:00:00Z',
          expires_at: '2024-08-15T00:00:00Z',
          evidence: ['https://www.giac.org/certified-professional/marcus-johnson']
        },
        {
          name: 'Python',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2018-03-01T00:00:00Z'
        },
        {
          name: 'SIEM Platforms',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2017-01-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Priya Patel',
      personType: 'employee',
      contact: {
        email: 'priya.patel@digitalminion.dev',
        location: 'Boston, MA',
        timezone: 'America/New_York'
      },
      positionId: uuidv7(),
      description: 'Security Analyst focusing on incident response',
      tags: ['security', 'incident-response', 'forensics'],
      attributes: [
        {
          name: 'Incident Response',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2020-01-01T00:00:00Z'
        },
        {
          name: 'Digital Forensics',
          type: 'skill',
          proficiency: 3,
          acquired_at: '2021-01-01T00:00:00Z'
        },
        {
          name: 'Security+',
          type: 'certification',
          validated: true,
          acquired_at: '2019-05-20T00:00:00Z',
          expires_at: '2025-05-20T00:00:00Z',
          evidence: ['https://comptia.org/certifications/security']
        },
        {
          name: 'Log Analysis',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2020-06-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Alex Kim',
      personType: 'contractor',
      contact: {
        email: 'alex.kim@contractor.com',
        location: 'San Francisco, CA',
        timezone: 'America/Los_Angeles'
      },
      positionId: uuidv7(),
      description: 'Junior Security Analyst contractor',
      tags: ['security', 'monitoring', 'soc'],
      attributes: [
        {
          name: 'Security Fundamentals',
          type: 'skill',
          proficiency: 3,
          acquired_at: '2023-01-01T00:00:00Z'
        },
        {
          name: 'Network Security',
          type: 'skill',
          proficiency: 3,
          acquired_at: '2023-03-01T00:00:00Z'
        },
        {
          name: 'SIEM Tools',
          type: 'framework',
          proficiency: 3,
          acquired_at: '2023-06-01T00:00:00Z'
        }
      ]
    }
  ];

  for (const personInput of persons) {
    await manager.createPerson(personInput);
  }

  console.log(`✓ Created ${persons.length} person entities`);
}

/**
 * Generate agent entities (AI security agents)
 */
async function generateAgents(manager: EntityManager) {
  console.log('Creating agent entities...');

  const agents: CreateAgentInput[] = [
    {
      id: uuidv7(),
      name: 'ThreatIntel Bot',
      contact: {
        email: 'threat-intel-bot@digitalminion.dev',
        location: 'Cloud',
        timezone: 'UTC'
      },
      positionId: uuidv7(),
      aiMetadata: {
        model: 'claude-sonnet-4-5',
        provider: 'Anthropic',
        maxConcurrentTasks: 20,
        modelVersion: '2025-01-01'
      },
      description: 'AI agent for automated threat intelligence collection and analysis',
      tags: ['ai', 'threat-intel', 'automation'],
      attributes: [
        {
          name: 'Threat Intelligence Analysis',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-08-01T00:00:00Z',
          notes: 'Trained on OSINT and commercial threat feeds'
        },
        {
          name: 'IOC Extraction',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-08-01T00:00:00Z',
          notes: 'Automated extraction and enrichment'
        },
        {
          name: 'Natural Language Processing',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-08-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Log Analyzer Bot',
      contact: {
        email: 'log-analyzer@digitalminion.dev',
        location: 'Cloud',
        timezone: 'UTC'
      },
      aiMetadata: {
        model: 'gpt-4o',
        provider: 'OpenAI',
        maxConcurrentTasks: 15,
        apiEndpoint: 'https://api.openai.com/v1',
        modelVersion: '2024-11-20'
      },
      description: 'AI agent for automated log analysis and anomaly detection',
      tags: ['ai', 'log-analysis', 'monitoring'],
      attributes: [
        {
          name: 'Log Analysis',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-09-01T00:00:00Z'
        },
        {
          name: 'Anomaly Detection',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-09-01T00:00:00Z'
        },
        {
          name: 'Pattern Recognition',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-09-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Incident Response Bot',
      contact: {
        email: 'incident-responder@digitalminion.dev',
        location: 'Cloud',
        timezone: 'UTC'
      },
      positionId: uuidv7(),
      aiMetadata: {
        model: 'claude-sonnet-4-5',
        provider: 'Anthropic',
        maxConcurrentTasks: 10,
        modelVersion: '2025-01-01'
      },
      description: 'AI agent for automated incident triage and response',
      tags: ['ai', 'incident-response', 'automation'],
      attributes: [
        {
          name: 'Incident Response',
          type: 'skill',
          proficiency: 4,
          acquired_at: '2025-09-15T00:00:00Z'
        },
        {
          name: 'Playbook Automation',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-09-15T00:00:00Z'
        },
        {
          name: 'Ticket Management',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2025-09-15T00:00:00Z'
        }
      ]
    }
  ];

  for (const agentInput of agents) {
    await manager.createAgent(agentInput);
  }

  console.log(`✓ Created ${agents.length} agent entities`);
}

/**
 * Generate device entities (security infrastructure)
 */
async function generateDevices(manager: EntityManager) {
  console.log('Creating device entities...');

  const devices: CreateDeviceInput[] = [
    {
      id: uuidv7(),
      name: 'SOC Analyst Workstation 1',
      deviceType: 'workstation',
      assignedTo: uuidv7(),
      hardware: {
        cpu: 'Intel Core i9-13900K',
        memory: 64,
        storage: 2000,
        os: 'Windows 11 Pro',
        osVersion: '23H2',
        serialNumber: 'WS-SOC-001-2024',
        assetTag: 'DM-WS-001'
      },
      network: {
        hostname: 'soc-ws-001',
        ipAddress: '10.50.10.101',
        macAddress: '00:1B:44:11:3A:B7',
        networkSegment: 'SOC-VLAN-50',
        dnsName: 'soc-ws-001.sec.digitalminion.internal'
      },
      security: {
        encrypted: true,
        antivirusInstalled: true,
        edrAgentInstalled: true,
        lastSecurityScan: '2025-10-11T06:00:00Z',
        complianceStatus: 'compliant'
      },
      location: 'SOC Room A, Building 1',
      description: 'Primary workstation for SOC analyst',
      tags: ['soc', 'workstation', 'secured'],
      attributes: [
        {
          name: 'SIEM Client',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2024-01-15T00:00:00Z',
          notes: 'Splunk Enterprise Security'
        },
        {
          name: 'EDR Console',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2024-01-15T00:00:00Z',
          notes: 'CrowdStrike Falcon'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'SIEM Primary Server',
      deviceType: 'server',
      hardware: {
        cpu: 'AMD EPYC 7763 64-Core',
        memory: 512,
        storage: 50000,
        os: 'Ubuntu Server 22.04 LTS',
        osVersion: '22.04.3',
        serialNumber: 'SRV-SIEM-001-2023',
        assetTag: 'DM-SRV-SIEM-001'
      },
      network: {
        hostname: 'siem-primary',
        ipAddress: '10.50.20.10',
        macAddress: '00:50:56:A1:B2:C3',
        networkSegment: 'SECURITY-DMZ',
        dnsName: 'siem-primary.sec.digitalminion.internal'
      },
      security: {
        encrypted: true,
        antivirusInstalled: true,
        edrAgentInstalled: true,
        lastSecurityScan: '2025-10-11T02:00:00Z',
        complianceStatus: 'compliant'
      },
      location: 'Data Center 1, Rack 5',
      description: 'Primary SIEM aggregation and correlation server',
      tags: ['siem', 'server', 'critical'],
      attributes: [
        {
          name: 'Splunk Enterprise',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2023-03-01T00:00:00Z'
        },
        {
          name: 'Log Collection',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-03-01T00:00:00Z',
          notes: 'Collecting 50TB/day'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Perimeter Firewall Primary',
      deviceType: 'security-appliance',
      hardware: {
        cpu: 'Custom ASIC',
        memory: 128,
        storage: 2000,
        os: 'Palo Alto PAN-OS',
        osVersion: '11.0.3',
        serialNumber: 'PA-5450-FW-001',
        assetTag: 'DM-FW-001'
      },
      network: {
        hostname: 'fw-perimeter-01',
        ipAddress: '192.168.1.1',
        macAddress: '00:1B:17:00:01:01',
        networkSegment: 'PERIMETER',
        dnsName: 'fw-perimeter-01.sec.digitalminion.internal'
      },
      security: {
        encrypted: true,
        complianceStatus: 'compliant',
        lastSecurityScan: '2025-10-10T00:00:00Z'
      },
      location: 'Data Center 1, Network DMZ',
      description: 'Primary perimeter firewall for internet traffic',
      tags: ['firewall', 'network-security', 'critical'],
      attributes: [
        {
          name: 'Threat Prevention',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2022-06-01T00:00:00Z'
        },
        {
          name: 'IPS/IDS',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2022-06-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Threat Hunter Mobile Workstation',
      deviceType: 'laptop',
      assignedTo: uuidv7(),
      hardware: {
        cpu: 'Intel Core i7-13800H',
        memory: 32,
        storage: 1000,
        os: 'Kali Linux',
        osVersion: '2024.3',
        serialNumber: 'LT-TH-001-2024',
        assetTag: 'DM-LT-001'
      },
      network: {
        hostname: 'threat-hunter-01',
        macAddress: '00:1A:2B:3C:4D:5E',
        networkSegment: 'SOC-VLAN-50'
      },
      security: {
        encrypted: true,
        antivirusInstalled: false,
        edrAgentInstalled: true,
        lastSecurityScan: '2025-10-10T00:00:00Z',
        complianceStatus: 'compliant'
      },
      location: 'Mobile - Marcus Johnson',
      description: 'Specialized laptop for threat hunting activities',
      tags: ['laptop', 'threat-hunting', 'kali'],
      attributes: [
        {
          name: 'Penetration Testing Tools',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2024-02-01T00:00:00Z'
        },
        {
          name: 'Forensics Tools',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2024-02-01T00:00:00Z'
        }
      ]
    }
  ];

  for (const deviceInput of devices) {
    await manager.createDevice(deviceInput);
  }

  console.log(`✓ Created ${devices.length} device entities`);
}

/**
 * Generate service entities (security services)
 */
async function generateServices(manager: EntityManager) {
  console.log('Creating service entities...');

  const services: CreateServiceInput[] = [
    {
      id: uuidv7(),
      name: 'SIEM API Service',
      serviceType: 'api',
      ownerId: uuidv7(),
      endpoints: [
        {
          url: 'https://siem-api.sec.digitalminion.internal/v1',
          protocol: 'https',
          port: 8089,
          version: 'v1'
        }
      ],
      monitoring: {
        healthCheckUrl: 'https://siem-api.sec.digitalminion.internal/v1/health',
        healthStatus: 'healthy',
        lastHealthCheck: '2025-10-11T23:45:00Z',
        uptime: 99.97,
        responseTime: 45
      },
      deployment: {
        environment: 'production',
        platform: 'Kubernetes',
        containerImage: 'digitalminion/siem-api:v2.4.1',
        version: '2.4.1',
        lastDeployed: '2025-10-01T14:30:00Z',
        deployedBy: uuidv7()
      },
      description: 'RESTful API for SIEM query and alerting',
      tags: ['api', 'siem', 'security'],
      attributes: [
        {
          name: 'REST API',
          type: 'framework',
          proficiency: 5,
          acquired_at: '2023-05-01T00:00:00Z'
        },
        {
          name: 'Authentication',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-05-01T00:00:00Z',
          notes: 'OAuth 2.0 + API keys'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Threat Intelligence Feed Aggregator',
      serviceType: 'api',
      ownerId: uuidv7(),
      endpoints: [
        {
          url: 'https://threat-intel.sec.digitalminion.internal/api',
          protocol: 'https',
          port: 443,
          version: 'v2'
        }
      ],
      monitoring: {
        healthCheckUrl: 'https://threat-intel.sec.digitalminion.internal/api/health',
        healthStatus: 'healthy',
        lastHealthCheck: '2025-10-11T23:50:00Z',
        uptime: 99.95,
        responseTime: 120
      },
      deployment: {
        environment: 'production',
        platform: 'AWS ECS',
        containerImage: 'digitalminion/threat-intel-aggregator:v1.8.2',
        version: '1.8.2',
        lastDeployed: '2025-09-25T10:00:00Z',
        deployedBy: uuidv7()
      },
      dependencies: [
        {
          serviceId: uuidv7(),
          type: 'required',
          purpose: 'Push IOCs to SIEM'
        }
      ],
      description: 'Aggregates threat intelligence from multiple commercial and OSINT sources',
      tags: ['threat-intel', 'api', 'integration'],
      attributes: [
        {
          name: 'IOC Processing',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2024-01-01T00:00:00Z'
        },
        {
          name: 'Data Enrichment',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2024-01-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'EDR Platform Service',
      serviceType: 'monitoring',
      ownerId: uuidv7(),
      endpoints: [
        {
          url: 'https://edr.sec.digitalminion.internal',
          protocol: 'https',
          port: 443,
          version: 'v7.2'
        }
      ],
      monitoring: {
        healthCheckUrl: 'https://edr.sec.digitalminion.internal/api/health',
        healthStatus: 'healthy',
        lastHealthCheck: '2025-10-11T23:55:00Z',
        uptime: 99.99,
        responseTime: 30
      },
      deployment: {
        environment: 'production',
        platform: 'SaaS',
        version: '7.2.15',
        lastDeployed: '2025-10-05T00:00:00Z',
        deployedBy: 'CrowdStrike'
      },
      description: 'Endpoint detection and response platform monitoring all endpoints',
      tags: ['edr', 'monitoring', 'endpoint-security'],
      attributes: [
        {
          name: 'Endpoint Monitoring',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-08-01T00:00:00Z'
        },
        {
          name: 'Threat Detection',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-08-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Vulnerability Scanning Service',
      serviceType: 'monitoring',
      ownerId: uuidv7(),
      endpoints: [
        {
          url: 'https://vulnscan.sec.digitalminion.internal',
          protocol: 'https',
          port: 8443
        }
      ],
      monitoring: {
        healthCheckUrl: 'https://vulnscan.sec.digitalminion.internal/health',
        healthStatus: 'healthy',
        lastHealthCheck: '2025-10-11T23:40:00Z',
        uptime: 99.8,
        responseTime: 200
      },
      deployment: {
        environment: 'production',
        platform: 'On-Premises',
        version: '10.2.1',
        lastDeployed: '2025-09-15T08:00:00Z',
        deployedBy: uuidv7()
      },
      dependencies: [
        {
          serviceId: uuidv7(),
          type: 'required',
          purpose: 'Send vulnerability findings'
        }
      ],
      description: 'Automated vulnerability scanning across all infrastructure',
      tags: ['vulnerability', 'scanning', 'assessment'],
      attributes: [
        {
          name: 'Vulnerability Assessment',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-06-01T00:00:00Z'
        },
        {
          name: 'Network Scanning',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2023-06-01T00:00:00Z'
        }
      ]
    },
    {
      id: uuidv7(),
      name: 'Incident Management System',
      serviceType: 'web-service',
      ownerId: uuidv7(),
      endpoints: [
        {
          url: 'https://incidents.sec.digitalminion.internal',
          protocol: 'https',
          port: 443,
          version: 'v3'
        }
      ],
      monitoring: {
        healthCheckUrl: 'https://incidents.sec.digitalminion.internal/api/health',
        healthStatus: 'healthy',
        lastHealthCheck: '2025-10-11T23:58:00Z',
        uptime: 99.99,
        responseTime: 75
      },
      deployment: {
        environment: 'production',
        platform: 'Kubernetes',
        containerImage: 'digitalminion/incident-mgmt:v3.1.0',
        version: '3.1.0',
        lastDeployed: '2025-10-08T12:00:00Z',
        deployedBy: uuidv7()
      },
      dependencies: [
        {
          serviceId: uuidv7(),
          type: 'required',
          purpose: 'Create incidents from alerts'
        },
        {
          serviceId: uuidv7(),
          type: 'optional',
          purpose: 'Link endpoint data to incidents'
        }
      ],
      description: 'Central incident tracking and case management system',
      tags: ['incident-response', 'case-management', 'workflow'],
      attributes: [
        {
          name: 'Case Management',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2024-03-01T00:00:00Z'
        },
        {
          name: 'Workflow Automation',
          type: 'skill',
          proficiency: 5,
          acquired_at: '2024-03-01T00:00:00Z'
        }
      ]
    }
  ];

  for (const serviceInput of services) {
    await manager.createService(serviceInput);
  }

  console.log(`✓ Created ${services.length} service entities`);
}

/**
 * Main setup function
 */
async function setupEntities() {
  console.log('Setting up Global Threat Management team entities...\n');

  const manager = new EntityManager(config);

  // Generate all entities
  await generatePersons(manager);
  await generateAgents(manager);
  await generateDevices(manager);
  await generateServices(manager);

  // Discover and save manifest
  console.log('\nGenerating entity manifest...');
  const manifest = await manager.discoverEntities();
  await manager.saveManifest(manifest);
  console.log('✓ Created entity.manifest.json');

  console.log('\n✅ Entity setup complete!');
  console.log(`\nSummary:`);
  console.log(`  - ${manifest.stats.totalPersons} persons (security team members)`);
  console.log(`  - ${manifest.stats.totalAgents} agents (AI security bots)`);
  console.log(`  - ${manifest.stats.totalDevices} devices (SOC workstations, servers, appliances)`);
  console.log(`  - ${manifest.stats.totalServices} services (SIEM, EDR, threat intel, etc.)`);
}

// Run setup
setupEntities().catch(console.error);
