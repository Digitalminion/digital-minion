# Control Frameworks

This directory contains definitions and implementations for organizational control frameworks adopted by the entity. Control frameworks provide structured approaches to governance, risk management, compliance, and security.

## Overview

Control frameworks are standardized sets of guidelines, best practices, and requirements that organizations adopt to:
- Establish security and compliance baselines
- Manage risks systematically
- Demonstrate compliance to auditors and stakeholders
- Align operations with industry standards
- Guide policy and procedure development

## Framework Structure

Each framework should be organized with the following structure:

```
packages/program/src/framework/
├── README.md                          # This file
├── {framework-name}/                  # e.g., nist-csf, iso-27001, soc2
│   ├── framework.json                 # Framework metadata and configuration
│   ├── controls/                      # Control definitions
│   │   ├── {category}/                # e.g., identify, protect, detect
│   │   │   └── {control-id}.json      # Individual control definitions
│   ├── mappings/                      # Mappings to organizational elements
│   │   ├── policies.json              # Maps controls to policies
│   │   ├── roles.json                 # Maps controls to roles
│   │   └── methods.json               # Maps controls to methods
│   └── assessments/                   # Assessment and audit records
│       └── {yyyy-mm-dd}-{name}.json   # Assessment results
```

## Framework Definition

### framework.json

The `framework.json` file defines the framework metadata:

```json
{
  "id": "nist-csf",
  "name": "NIST Cybersecurity Framework",
  "version": "2.0",
  "adoptedDate": "2025-01-15",
  "organization": "global-information-security",
  "team": "global-threat-management",
  "description": "NIST Cybersecurity Framework for managing cybersecurity risk",
  "categories": [
    {
      "id": "identify",
      "name": "Identify",
      "description": "Develop organizational understanding to manage cybersecurity risk"
    },
    {
      "id": "protect",
      "name": "Protect",
      "description": "Develop and implement appropriate safeguards"
    },
    {
      "id": "detect",
      "name": "Detect",
      "description": "Develop and implement activities to identify cybersecurity events"
    },
    {
      "id": "respond",
      "name": "Respond",
      "description": "Develop and implement activities to respond to detected events"
    },
    {
      "id": "recover",
      "name": "Recover",
      "description": "Develop and implement activities to maintain resilience"
    }
  ],
  "maturityLevels": [
    {
      "level": 0,
      "name": "Partial",
      "description": "Organizational cybersecurity risk management practices are not formalized"
    },
    {
      "level": 1,
      "name": "Risk Informed",
      "description": "Risk management practices are approved by management but may not be established as organizational-wide policy"
    },
    {
      "level": 2,
      "name": "Repeatable",
      "description": "Risk management practices are formally approved and expressed as policy"
    },
    {
      "level": 3,
      "name": "Adaptive",
      "description": "Organization adapts its cybersecurity practices based on lessons learned and predictive indicators"
    }
  ],
  "scope": {
    "administrativeUnit": "digital-minion",
    "businessUnit": "corp",
    "applicableOrganizations": ["*"],
    "applicableTeams": ["*"]
  }
}
```

### Control Definition

Individual control files in `controls/{category}/{control-id}.json`:

```json
{
  "id": "ID.AM-1",
  "category": "identify",
  "subcategory": "Asset Management",
  "name": "Physical devices and systems within the organization are inventoried",
  "description": "Maintain an accurate inventory of all physical devices and systems",
  "references": [
    "CIS CSC 1",
    "COBIT 5 BAI09.01",
    "ISA 62443-2-1:2009 4.2.3.4"
  ],
  "implementationStatus": "implemented",
  "maturityLevel": 2,
  "assignedTo": {
    "organization": "global-information-security",
    "team": "global-threat-management",
    "roles": ["SecurityAnalyst", "SeniorSecurityAnalyst"]
  },
  "mappedPolicies": [
    "policy-vulnerability-management-1760225042328"
  ],
  "mappedMethods": [],
  "evidenceLocations": [
    "filesystem:///.minion/local/inventory/",
    "service://asset-management-system"
  ],
  "lastAssessed": "2025-09-15",
  "nextAssessment": "2026-03-15",
  "notes": "Asset inventory maintained in internal system with quarterly validation"
}
```

## Integration with Program Structure

Frameworks integrate with the Digital Minion program structure through:

### 1. Administrative Unit Hierarchy

Frameworks are adopted at the administrative unit level and cascade down through:
- **Administrative Unit**: Entity-wide framework adoption
- **Business Unit**: Business-specific compliance requirements
- **Organization**: Organizational implementation scope
- **Team**: Team-specific control responsibilities

### 2. Standards Mapping

Frameworks map to existing standards in `.minion/local`:

**Policies** (`standard=policy`)
- Framework controls reference organizational policies
- Policies implement control requirements
- Stored: `administrative_unit=digital-minion/.../standard=policy/scope={scope}/domain={domain}/`

**Roles** (`standard=role`)
- Framework controls assign responsibilities to roles
- Roles have permissions to execute controls
- Stored: `administrative_unit=digital-minion/.../standard=role/domain={domain}/level={level}/`

**Methods** (`standard=method`)
- Framework controls reference implementation methods
- Methods define how controls are executed
- Stored: `administrative_unit=digital-minion/.../standard=method/construct={construct}/...`

**Positions** (`standard=position`)
- Framework assessments assign to positions
- Positions hold accountability for control domains
- Stored: `administrative_unit=digital-minion/.../standard=position/track={track}/`

### 3. Data Storage Integration

Framework data uses the `@digital-minion/data` package with partitioned storage.

#### Partition Schema for Framework Controls

Framework control data is stored using the following partition hierarchy:

```
.minion/local/
  administrative_unit={unit}/
    business_unit={bu}/
      organization={org}/
        team={team}/
          framework={framework-name}/
            category={category}/
              implementation_status={status}/
                maturity_level={level}/
                  data-{guid}.jsonl
```

**Partition Keys (in order):**

1. **administrative_unit** (string, required)
   - The entity/administrative unit (e.g., `digital-minion`)
   - Inherited from organizational hierarchy

2. **business_unit** (string, required)
   - Business unit within the administrative unit (e.g., `corp`)
   - Inherited from organizational hierarchy

3. **organization** (string, required)
   - Organization responsible for controls (e.g., `global-information-security`)
   - Can be `_` for entity-wide frameworks

4. **team** (string, required)
   - Team responsible for controls (e.g., `global-threat-management`)
   - Can be `_` for organization-wide frameworks

5. **framework** (string, required)
   - Framework identifier (e.g., `nist-csf`, `iso-27001`, `soc2`)
   - Regex: `^[a-z0-9-]+$`

6. **category** (string, required)
   - Control category/function (e.g., `identify`, `protect`, `detect`)
   - Framework-specific categories
   - Can be `_` for uncategorized

7. **implementation_status** (string, required)
   - Control implementation status
   - Values: `implemented`, `partial`, `not-implemented`, `not-applicable`
   - Regex: `^(implemented|partial|not-implemented|not-applicable)$`

8. **maturity_level** (string, required)
   - Maturity level of implementation (0-3 or equivalent)
   - Values: `0`, `1`, `2`, `3`
   - Regex: `^[0-3]$`

#### Example Storage Paths

**NIST CSF Control (Identify category, Implemented, Maturity 2):**
```
.minion/local/
  administrative_unit=digital-minion/
    business_unit=corp/
      organization=global-information-security/
        team=global-threat-management/
          framework=nist-csf/
            category=identify/
              implementation_status=implemented/
                maturity_level=2/
                  data-a3f7b9.jsonl
```

**Entity-wide ISO 27001 Control:**
```
.minion/local/
  administrative_unit=digital-minion/
    business_unit=corp/
      organization=_/
        team=_/
          framework=iso-27001/
            category=access-control/
              implementation_status=implemented/
                maturity_level=3/
                  data-9e2c4d.jsonl
```

#### Namespace Configuration

Create the framework namespace with this partition schema:

```typescript
import { NamespaceMetadataManager } from '@digital-minion/data';

const metadataManager = new NamespaceMetadataManager();

await metadataManager.createNamespace({
  namespace: 'framework-controls',
  basePath: './.minion/local',
  partitionSchema: {
    order: [
      'administrative_unit',
      'business_unit',
      'organization',
      'team',
      'framework',
      'category',
      'implementation_status',
      'maturity_level'
    ],
    partitions: {
      administrative_unit: {
        type: 'string',
        regex: '^[a-z0-9-]+$',
        required: true,
        description: 'Administrative unit identifier'
      },
      business_unit: {
        type: 'string',
        regex: '^[a-z0-9-]+$',
        required: true,
        description: 'Business unit identifier'
      },
      organization: {
        type: 'string',
        regex: '^([a-z0-9-]+|_)$',
        required: true,
        description: 'Organization identifier or _ for entity-wide'
      },
      team: {
        type: 'string',
        regex: '^([a-z0-9-]+|_)$',
        required: true,
        description: 'Team identifier or _ for organization-wide'
      },
      framework: {
        type: 'string',
        regex: '^[a-z0-9-]+$',
        required: true,
        description: 'Framework identifier (e.g., nist-csf, iso-27001)'
      },
      category: {
        type: 'string',
        regex: '^([a-z0-9-]+|_)$',
        required: true,
        description: 'Control category/function or _ for uncategorized'
      },
      implementation_status: {
        type: 'string',
        regex: '^(implemented|partial|not-implemented|not-applicable)$',
        required: true,
        description: 'Control implementation status'
      },
      maturity_level: {
        type: 'string',
        regex: '^[0-3]$',
        required: true,
        description: 'Maturity level (0-3)'
      }
    }
  },
  dataFormat: 'jsonl'
});
```

#### Querying Framework Data

```typescript
import { DataLayer } from '@digital-minion/data';

const dataLayer = new DataLayer({
  basePath: './.minion/local',
  collection: 'framework-controls',
  adapterType: 'jsonl'
});

await dataLayer.initialize();

// Query all implemented NIST CSF controls
const implemented = await dataLayer.query({
  partitionFilter: {
    framework: 'nist-csf',
    implementation_status: 'implemented'
  }
});

// Query all Identify category controls for a specific team
const identifyControls = await dataLayer.query({
  partitionFilter: {
    organization: 'global-information-security',
    team: 'global-threat-management',
    framework: 'nist-csf',
    category: 'identify'
  }
});

// Query all high-maturity controls across all frameworks
const matureControls = await dataLayer.query({
  partitionFilter: {
    maturity_level: '3'
  }
});

// Query specific implementation status across organization
const partialControls = await dataLayer.query({
  partitionFilter: {
    organization: 'global-information-security',
    implementation_status: 'partial'
  }
});
```

## Common Control Frameworks

### NIST Cybersecurity Framework (NIST CSF)
- **Focus**: Cybersecurity risk management
- **Categories**: Identify, Protect, Detect, Respond, Recover
- **Best For**: Organizations seeking flexible, risk-based cybersecurity approach
- **Directory**: `src/framework/nist-csf/`

### ISO 27001
- **Focus**: Information security management systems (ISMS)
- **Controls**: 93 controls across 14 domains
- **Best For**: Organizations requiring international certification
- **Directory**: `src/framework/iso-27001/`

### SOC 2
- **Focus**: Service organization controls for trust services
- **Criteria**: Security, Availability, Processing Integrity, Confidentiality, Privacy
- **Best For**: SaaS and service providers
- **Directory**: `src/framework/soc2/`

### PCI DSS
- **Focus**: Payment card data security
- **Requirements**: 12 requirements across 6 control objectives
- **Best For**: Organizations handling payment card data
- **Directory**: `src/framework/pci-dss/`

### HIPAA
- **Focus**: Healthcare data privacy and security
- **Rules**: Privacy Rule, Security Rule, Breach Notification Rule
- **Best For**: Healthcare organizations and business associates
- **Directory**: `src/framework/hipaa/`

## Usage Patterns

### Implementing a New Framework

1. **Create framework directory**: `src/framework/{framework-name}/`
2. **Define framework metadata**: Create `framework.json`
3. **Import controls**: Add control definitions to `controls/`
4. **Map to standards**: Create mappings in `mappings/`
5. **Document scope**: Update framework.json with applicable scope
6. **Initialize assessments**: Set up assessment schedule

### Assessing Control Compliance

1. **Review control definition**: Check current implementation status
2. **Collect evidence**: Gather evidence from referenced locations
3. **Evaluate maturity**: Assess against maturity model
4. **Document findings**: Record in `assessments/{date}-{name}.json`
5. **Update control status**: Modify implementation status if needed
6. **Assign remediation**: Create maintenance tasks for gaps

### Cross-Framework Mapping

Organizations often need to demonstrate compliance with multiple frameworks:

```json
{
  "controlId": "MULTI-001",
  "name": "Access Control Management",
  "frameworks": {
    "nist-csf": ["PR.AC-1", "PR.AC-4"],
    "iso-27001": ["A.9.1.1", "A.9.2.1"],
    "soc2": ["CC6.1", "CC6.2"]
  },
  "unifiedImplementation": {
    "policy": "policy-filesystem-access-control",
    "method": "method-rbac-implementation",
    "roles": ["SecurityAnalyst", "SystemAdministrator"]
  }
}
```

## Assessment and Reporting

### Assessment Records

Store assessment results in `assessments/`:

```json
{
  "assessmentId": "nist-csf-2025-q1",
  "framework": "nist-csf",
  "assessmentDate": "2025-01-15",
  "assessor": "position-security-team-lead-1760225042530",
  "scope": {
    "organization": "global-information-security",
    "team": "global-threat-management"
  },
  "results": {
    "totalControls": 108,
    "assessed": 108,
    "implemented": 95,
    "partiallyImplemented": 10,
    "notImplemented": 3
  },
  "maturityScore": {
    "overall": 2.1,
    "identify": 2.3,
    "protect": 2.0,
    "detect": 2.2,
    "respond": 1.9,
    "recover": 2.0
  },
  "gaps": [
    {
      "controlId": "RC.RP-1",
      "issue": "Recovery planning not formalized",
      "remediation": "Create and test disaster recovery procedures",
      "dueDate": "2025-06-30",
      "assignedTo": "position-senior-security-analyst-1760225042505"
    }
  ]
}
```

## Best Practices

1. **Version Control**: Track framework versions and update cycles
2. **Evidence Collection**: Maintain clear evidence trails for audits
3. **Regular Assessment**: Schedule periodic control assessments
4. **Gap Remediation**: Track and prioritize control gaps
5. **Cross-Mapping**: Identify overlaps between frameworks to reduce duplication
6. **Automation**: Integrate evidence collection with existing systems
7. **Documentation**: Keep control implementation documentation current
8. **Ownership**: Assign clear ownership for each control domain

## Integration with Program Functions

Frameworks integrate with the three program function types:

### Projects (`function=project`)
- **Gap remediation projects**: Address control implementation gaps
- **Framework adoption projects**: Implement new frameworks
- **Audit preparation projects**: Prepare for framework assessments

### Matters (`function=matter`)
- **Compliance matters**: Handle compliance violations
- **Audit matters**: Manage external audits and assessments
- **Exception matters**: Process control exceptions and waivers

### Maintenance (`function=maintenance`)
- **Control monitoring**: Continuous control effectiveness monitoring
- **Evidence collection**: Automated evidence gathering
- **Assessment execution**: Periodic control assessments
- **Documentation updates**: Keep control documentation current

## Future Enhancements

- Automated control testing and evidence collection
- Real-time compliance dashboards
- AI-powered gap analysis and recommendations
- Integration with GRC platforms
- Automated cross-framework mapping
- Continuous compliance monitoring

## References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO/IEC 27001](https://www.iso.org/isoiec-27001-information-security.html)
- [SOC 2 Trust Services Criteria](https://us.aicpa.org/soc2)
- [@digital-minion/data Documentation](../../../data/README.md)
- [@digital-minion/program Documentation](../../README.md)
