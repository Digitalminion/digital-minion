# Risk Registry

This directory contains the design schema for enterprise risk management and the risk registry system. The risk registry provides structured tracking of organizational risks, their assessment, treatment, and monitoring.

## Overview

A risk registry (also called risk register) is a centralized repository for identifying, assessing, tracking, and managing risks across the organization. It serves as the single source of truth for:
- Risk identification and documentation
- Risk assessment (likelihood and impact)
- Risk treatment and mitigation strategies
- Risk ownership and accountability
- Risk monitoring and reporting
- Integration with controls and frameworks

## Risk Registry Structure

Each risk entry should be organized with the following structure:

```
packages/program/src/risk/
├── README.md                          # This file
└── templates/                         # Risk templates by category
    ├── cybersecurity.json             # Cybersecurity risk template
    ├── operational.json               # Operational risk template
    ├── financial.json                 # Financial risk template
    ├── compliance.json                # Compliance/regulatory risk template
    ├── strategic.json                 # Strategic risk template
    └── reputational.json              # Reputational risk template
```

## Risk Schema Definition

### Core Risk Entity

```typescript
interface Risk {
  // Identification
  id: string;                          // Unique risk identifier
  riskNumber: string;                  // Human-readable risk number (e.g., "RISK-2025-001")
  title: string;                       // Short risk title
  description: string;                 // Detailed risk description
  category: RiskCategory;              // Risk category/type
  subcategory?: string;                // More specific categorization

  // Assessment
  inherentRisk: RiskAssessment;        // Risk before controls
  residualRisk: RiskAssessment;        // Risk after controls
  targetRisk: RiskAssessment;          // Desired risk level
  riskScore: number;                   // Calculated risk score (likelihood × impact)
  riskLevel: RiskLevel;                // Overall risk level (Low/Medium/High/Critical)

  // Ownership & Accountability
  owner: RiskOwner;                    // Risk owner (accountable)
  assignedTo: RiskAssignment;          // Who manages the risk

  // Status & Lifecycle
  status: RiskStatus;                  // Current status
  identifiedDate: string;              // When risk was identified
  lastReviewDate: string;              // When last reviewed
  nextReviewDate: string;              // When next review is due
  closedDate?: string;                 // When risk was closed (if applicable)

  // Treatment
  treatmentStrategy: TreatmentStrategy; // How risk is being handled
  treatmentPlan?: TreatmentPlan;       // Detailed treatment actions
  controlsMitigating: string[];        // Controls that mitigate this risk

  // Impact Analysis
  impactAreas: ImpactArea[];           // Areas affected by risk
  potentialImpact: PotentialImpact;    // Detailed impact analysis

  // Context
  context: RiskContext;                // Organizational context

  // Indicators
  keyRiskIndicators?: KeyRiskIndicator[]; // KRIs for monitoring
  triggerEvents?: string[];            // Events that could trigger risk

  // Relationships
  relatedRisks?: string[];             // Related risk IDs
  relatedIncidents?: string[];         // Related incident IDs
  relatedFrameworks?: FrameworkMapping[]; // Related framework controls

  // Documentation
  evidenceLocations?: string[];        // Evidence documentation
  notes?: string;                      // Additional notes
  tags?: string[];                     // Categorization tags

  // Audit trail
  metadata: RiskMetadata;
}
```

### Risk Assessment

```typescript
interface RiskAssessment {
  likelihood: RiskLikelihood;          // Probability of occurrence
  impact: RiskImpact;                  // Severity if occurs
  rationale: string;                   // Justification for assessment
  assessedBy: string;                  // Who performed assessment
  assessedDate: string;                // When assessment was done
  confidenceLevel?: number;            // Assessment confidence (0-100)
}

enum RiskLikelihood {
  RARE = 'rare',                       // < 5% probability
  UNLIKELY = 'unlikely',               // 5-25% probability
  POSSIBLE = 'possible',               // 25-50% probability
  LIKELY = 'likely',                   // 50-75% probability
  ALMOST_CERTAIN = 'almost-certain'    // > 75% probability
}

enum RiskImpact {
  NEGLIGIBLE = 'negligible',           // Minimal impact
  MINOR = 'minor',                     // Limited impact
  MODERATE = 'moderate',               // Noticeable impact
  MAJOR = 'major',                     // Significant impact
  CATASTROPHIC = 'catastrophic'        // Severe/critical impact
}

enum RiskLevel {
  LOW = 'low',                         // Score 1-6
  MEDIUM = 'medium',                   // Score 7-12
  HIGH = 'high',                       // Score 13-20
  CRITICAL = 'critical'                // Score 21-25
}
```

### Risk Categories

```typescript
enum RiskCategory {
  CYBERSECURITY = 'cybersecurity',     // Cyber threats, data breaches
  OPERATIONAL = 'operational',         // Process, system failures
  FINANCIAL = 'financial',             // Financial loss, fraud
  COMPLIANCE = 'compliance',           // Regulatory, legal
  STRATEGIC = 'strategic',             // Business strategy, competition
  REPUTATIONAL = 'reputational',       // Brand, trust, public perception
  THIRD_PARTY = 'third-party',         // Vendor, supplier, partner risks
  HUMAN_RESOURCES = 'human-resources', // Talent, culture, safety
  TECHNOLOGICAL = 'technological',     // Tech obsolescence, disruption
  ENVIRONMENTAL = 'environmental'      // Environmental, climate
}

enum RiskStatus {
  IDENTIFIED = 'identified',           // Newly identified
  ASSESSED = 'assessed',               // Assessment complete
  TREATMENT_PLANNING = 'treatment-planning', // Planning treatment
  TREATMENT_IN_PROGRESS = 'treatment-in-progress', // Implementing treatment
  MONITORING = 'monitoring',           // Active monitoring
  MITIGATED = 'mitigated',            // Successfully reduced
  ACCEPTED = 'accepted',              // Accepted as-is
  TRANSFERRED = 'transferred',        // Transferred (insurance, outsource)
  CLOSED = 'closed'                   // Risk no longer relevant
}
```

### Treatment Strategy

```typescript
enum TreatmentStrategy {
  MITIGATE = 'mitigate',              // Reduce likelihood or impact
  ACCEPT = 'accept',                  // Accept the risk as-is
  TRANSFER = 'transfer',              // Transfer to third party
  AVOID = 'avoid',                    // Eliminate the risk source
  EXPLOIT = 'exploit'                 // For opportunities (positive risks)
}

interface TreatmentPlan {
  strategy: TreatmentStrategy;
  actions: TreatmentAction[];
  estimatedCost?: number;
  currency?: string;
  timeline: {
    startDate?: string;
    targetDate?: string;
    completionDate?: string;
  };
  resources?: string[];               // Resources needed
  dependencies?: string[];            // Dependencies on other items
}

interface TreatmentAction {
  id: string;
  description: string;
  actionType: 'control' | 'policy' | 'process' | 'technology' | 'training' | 'other';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: string;
  completionDate?: string;
  notes?: string;
}
```

### Impact Analysis

```typescript
interface ImpactArea {
  area: 'financial' | 'operational' | 'reputational' | 'compliance' | 'safety' | 'environmental';
  severity: RiskImpact;
  description: string;
}

interface PotentialImpact {
  financial?: {
    estimatedLoss: number;
    currency: string;
    breakdown?: string;
  };
  operational?: {
    downtime?: string;               // e.g., "4 hours"
    affectedSystems?: string[];
    recoveryTime?: string;
  };
  reputational?: {
    customerImpact?: string;
    mediaExposure?: 'low' | 'medium' | 'high';
    trustDamage?: string;
  };
  compliance?: {
    regulations?: string[];          // Affected regulations
    potentialFines?: number;
    legalConsequences?: string;
  };
  safety?: {
    injuryRisk?: 'low' | 'medium' | 'high';
    affectedPersonnel?: number;
    description?: string;
  };
}
```

### Key Risk Indicators

```typescript
interface KeyRiskIndicator {
  id: string;
  name: string;
  description: string;
  metric: string;                     // What is measured
  threshold: {
    green: string;                    // Safe zone
    yellow: string;                   // Warning zone
    red: string;                      // Critical zone
  };
  currentValue?: string;
  lastMeasured?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dataSource?: string;
  status?: 'green' | 'yellow' | 'red';
}
```

## Integration with Program Structure

Risks integrate with the Digital Minion program structure through:

### 1. Administrative Unit Hierarchy

Risks exist within the organizational hierarchy:
- **Administrative Unit**: Entity-wide risk management
- **Business Unit**: Business-specific risks
- **Organization**: Organizational risk portfolio
- **Team**: Team-level operational risks

### 2. Integration with Frameworks

Risks map to framework controls:

```typescript
interface FrameworkMapping {
  frameworkId: string;                // e.g., "nist-csf"
  controlIds: string[];               // Controls that address this risk
  mappingNotes?: string;
  mappedDate: string;
}
```

**Example:**
- Risk: "Inadequate asset inventory management"
- Maps to: NIST CSF ID.AM-1
- Control mitigates the risk

### 3. Integration with Standards

Risks reference organizational standards:

**Policies** (`standard=policy`)
- Policies that address or create risks
- Stored: `administrative_unit=digital-minion/.../standard=policy/`

**Roles** (`standard=role`)
- Risk owners and managers by role
- Stored: `administrative_unit=digital-minion/.../standard=role/`

**Methods** (`standard=method`)
- Risk assessment and treatment methods
- Stored: `administrative_unit=digital-minion/.../standard=method/`

### 4. Integration with Incidents

Risks link to incidents (matters):
- Track when risks materialize into incidents
- Learn from incidents to update risk assessments
- Incident response reduces likelihood/impact

## Partition Schema for Data Storage

Risk data is stored using the `@digital-minion/data` package with partitioned storage.

### Partition Hierarchy

```
.minion/local/
  administrative_unit={unit}/
    business_unit={bu}/
      organization={org}/
        team={team}/
          risk_category={category}/
            risk_level={level}/
              status={status}/
                treatment_strategy={strategy}/
                  data-{guid}.jsonl
```

**Partition Keys (in order):**

1. **administrative_unit** (string, required)
   - The entity/administrative unit (e.g., `digital-minion`)
   - Regex: `^[a-z0-9-]+$`

2. **business_unit** (string, required)
   - Business unit within the administrative unit (e.g., `corp`)
   - Regex: `^[a-z0-9-]+$`

3. **organization** (string, required)
   - Organization that owns/manages the risk
   - Can be `_` for entity-wide risks
   - Regex: `^([a-z0-9-]+|_)$`

4. **team** (string, required)
   - Team that manages the risk
   - Can be `_` for organization-wide risks
   - Regex: `^([a-z0-9-]+|_)$`

5. **risk_category** (string, required)
   - Primary risk category
   - Values: `cybersecurity`, `operational`, `financial`, `compliance`, `strategic`, `reputational`, `third-party`, `human-resources`, `technological`, `environmental`
   - Regex: `^(cybersecurity|operational|financial|compliance|strategic|reputational|third-party|human-resources|technological|environmental)$`

6. **risk_level** (string, required)
   - Current residual risk level
   - Values: `low`, `medium`, `high`, `critical`
   - Regex: `^(low|medium|high|critical)$`

7. **status** (string, required)
   - Current risk status
   - Values: `identified`, `assessed`, `treatment-planning`, `treatment-in-progress`, `monitoring`, `mitigated`, `accepted`, `transferred`, `closed`
   - Regex: `^(identified|assessed|treatment-planning|treatment-in-progress|monitoring|mitigated|accepted|transferred|closed)$`

8. **treatment_strategy** (string, required)
   - Primary treatment approach
   - Values: `mitigate`, `accept`, `transfer`, `avoid`, `exploit`, `none`
   - Regex: `^(mitigate|accept|transfer|avoid|exploit|none)$`

### Example Storage Paths

**High Cybersecurity Risk (Monitoring):**
```
.minion/local/
  administrative_unit=digital-minion/
    business_unit=corp/
      organization=global-information-security/
        team=global-threat-management/
          risk_category=cybersecurity/
            risk_level=high/
              status=monitoring/
                treatment_strategy=mitigate/
                  data-a3f7b9.jsonl
```

**Entity-wide Strategic Risk:**
```
.minion/local/
  administrative_unit=digital-minion/
    business_unit=corp/
      organization=_/
        team=_/
          risk_category=strategic/
            risk_level=medium/
              status=accepted/
                treatment_strategy=accept/
                  data-9e2c4d.jsonl
```

### Namespace Configuration

```typescript
import { NamespaceMetadataManager } from '@digital-minion/data';

const metadataManager = new NamespaceMetadataManager();

await metadataManager.createNamespace({
  namespace: 'risk-registry',
  basePath: './.minion/local',
  partitionSchema: {
    order: [
      'administrative_unit',
      'business_unit',
      'organization',
      'team',
      'risk_category',
      'risk_level',
      'status',
      'treatment_strategy'
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
      risk_category: {
        type: 'string',
        regex: '^(cybersecurity|operational|financial|compliance|strategic|reputational|third-party|human-resources|technological|environmental)$',
        required: true,
        description: 'Risk category'
      },
      risk_level: {
        type: 'string',
        regex: '^(low|medium|high|critical)$',
        required: true,
        description: 'Current residual risk level'
      },
      status: {
        type: 'string',
        regex: '^(identified|assessed|treatment-planning|treatment-in-progress|monitoring|mitigated|accepted|transferred|closed)$',
        required: true,
        description: 'Risk status'
      },
      treatment_strategy: {
        type: 'string',
        regex: '^(mitigate|accept|transfer|avoid|exploit|none)$',
        required: true,
        description: 'Treatment strategy'
      }
    }
  },
  dataFormat: 'jsonl'
});
```

## Querying Risk Data

```typescript
import { DataLayer } from '@digital-minion/data';

const dataLayer = new DataLayer({
  basePath: './.minion/local',
  collection: 'risk-registry',
  adapterType: 'jsonl'
});

await dataLayer.initialize();

// Query all high and critical risks
const criticalRisks = await dataLayer.query({
  partitionFilter: {
    risk_level: ['high', 'critical']
  }
});

// Query cybersecurity risks for a specific team
const teamCyberRisks = await dataLayer.query({
  partitionFilter: {
    organization: 'global-information-security',
    team: 'global-threat-management',
    risk_category: 'cybersecurity'
  }
});

// Query all risks in monitoring status
const monitoringRisks = await dataLayer.query({
  partitionFilter: {
    status: 'monitoring'
  }
});

// Query all accepted risks
const acceptedRisks = await dataLayer.query({
  partitionFilter: {
    treatment_strategy: 'accept'
  }
});

// Query high-risk operational issues
const highOperationalRisks = await dataLayer.query({
  partitionFilter: {
    risk_category: 'operational',
    risk_level: 'high'
  }
});
```

## Risk Assessment Methodology

### Likelihood × Impact Matrix

| Impact →<br>Likelihood ↓ | Negligible (1) | Minor (2) | Moderate (3) | Major (4) | Catastrophic (5) |
|--------------------------|----------------|-----------|--------------|-----------|------------------|
| **Rare (1)**             | 1 - Low        | 2 - Low   | 3 - Low      | 4 - Low   | 5 - Medium       |
| **Unlikely (2)**         | 2 - Low        | 4 - Low   | 6 - Low      | 8 - Medium| 10 - Medium      |
| **Possible (3)**         | 3 - Low        | 6 - Low   | 9 - Medium   | 12 - Medium| 15 - High       |
| **Likely (4)**           | 4 - Low        | 8 - Medium| 12 - Medium  | 16 - High | 20 - High        |
| **Almost Certain (5)**   | 5 - Medium     | 10 - Medium| 15 - High   | 20 - High | 25 - Critical    |

**Risk Scoring:**
- **Low (1-6)**: Acceptable risk, standard monitoring
- **Medium (7-12)**: Moderate concern, enhanced monitoring
- **High (13-20)**: Serious concern, active treatment required
- **Critical (21-25)**: Unacceptable risk, immediate action required

### Risk Treatment Decision Tree

```
Is the risk level acceptable?
├─ Yes → Accept (with monitoring)
└─ No → Can we eliminate the source?
    ├─ Yes → Avoid
    └─ No → Can we reduce likelihood/impact?
        ├─ Yes → Mitigate
        └─ No → Can we transfer to third party?
            ├─ Yes → Transfer
            └─ No → Accept (with justification)
```

## Risk Reporting & Analytics

### Risk Dashboard Data

```typescript
interface RiskDashboard {
  // Summary statistics
  summary: {
    totalRisks: number;
    byLevel: Record<RiskLevel, number>;
    byCategory: Record<RiskCategory, number>;
    byStatus: Record<RiskStatus, number>;
    overdue: number;                   // Past review date
  };

  // Top risks
  topRisks: Risk[];                    // Highest risk score

  // Treatment effectiveness
  treatmentMetrics: {
    risksWithTreatment: number;
    treatmentInProgress: number;
    mitigatedRisks: number;
    acceptedRisks: number;
  };

  // Trending
  riskTrend: RiskTrendData[];

  // Heat map data
  heatMap: RiskHeatMapData;

  // KRI status
  krisAtRisk: KeyRiskIndicator[];      // KRIs in yellow/red
}

interface RiskTrendData {
  date: string;
  totalRisks: number;
  averageScore: number;
  byLevel: Record<RiskLevel, number>;
}

interface RiskHeatMapData {
  matrix: Array<{
    likelihood: RiskLikelihood;
    impact: RiskImpact;
    count: number;
    riskIds: string[];
  }>;
}
```

### Risk Reports

**Executive Risk Report:**
- Top 10 risks by score
- Risk distribution by category
- Treatment status overview
- Trending analysis
- Key risk indicators at threshold

**Detailed Risk Report:**
- Complete risk inventory
- Assessment details
- Treatment plans and progress
- Control effectiveness
- Historical changes

**Control Effectiveness Report:**
- Risks by associated controls
- Control coverage analysis
- Gaps in control coverage
- Residual risk after controls

## Risk Review Cycle

### Periodic Reviews

```typescript
interface RiskReviewSchedule {
  riskLevel: RiskLevel;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  daysUntilOverdue: number;
}

const reviewSchedule: RiskReviewSchedule[] = [
  { riskLevel: 'critical', frequency: 'weekly', daysUntilOverdue: 7 },
  { riskLevel: 'high', frequency: 'monthly', daysUntilOverdue: 30 },
  { riskLevel: 'medium', frequency: 'quarterly', daysUntilOverdue: 90 },
  { riskLevel: 'low', frequency: 'annually', daysUntilOverdue: 365 }
];
```

### Review Process

1. **Review Notification**: System notifies risk owner
2. **Current Assessment**: Review current likelihood/impact
3. **Control Evaluation**: Assess control effectiveness
4. **Treatment Progress**: Check treatment plan progress
5. **Update Risk**: Update assessment, status, notes
6. **Next Review**: Set next review date
7. **Escalation**: Escalate if risk level increased

## Integration with Program Functions

**The risk registry is a reference data system.** Risks are documented, assessed entities that the three function types reference and act upon. The risk registry does NOT manage work itself - that's what Projects, Matters, and Maintenance are for.

### Architectural Principle

```
Risk Registry (Reference Data)
    ↓
    ├─→ Projects (Mitigate risks, mature security posture)
    ├─→ Matters (Remediate when risks materialize)
    └─→ Maintenance (Review risks, monitor KRIs, test controls)
```

### How Functions Use Risks

#### Projects (`function=project`) - Mature Security Posture

**Purpose**: Planned work to REDUCE risks by implementing controls and maturing the security program.

**When a risk requires mitigation:**
1. Identify the risk in the registry (e.g., "Inadequate access controls")
2. Create a **Project** to address it
3. Project scope: Design and implement controls to reduce likelihood/impact
4. Project success criteria: Move risk from "high" to "medium" or "low"
5. Upon project completion: Update risk assessment in registry

**Examples:**
```typescript
// Risk: "Inadequate asset inventory"
// Creates → Project: "Implement automated asset discovery system"
// Outcome → Risk residual level reduced from "high" to "medium"

// Risk: "Weak authentication mechanisms"
// Creates → Project: "Deploy MFA across enterprise"
// Outcome → Risk residual level reduced from "critical" to "low"
```

**Project Types:**
- **Control Implementation**: Deploy new controls to mitigate risks
- **Security Program Maturity**: Elevate security practices (e.g., achieve NIST CSF Tier 2)
- **Remediation Projects**: Fix identified gaps from assessments
- **Technology Deployment**: Implement security tooling

**Risk Registry Integration:**
- Project linked to risk ID(s) it addresses
- Risk `treatmentPlan` references project ID
- Project completion triggers risk reassessment
- Risk status moves from "treatment-planning" → "treatment-in-progress" → "monitoring"

#### Matters (`function=matter`) - Remediate When Risks Materialize

**Purpose**: Reactive work when risks BECOME REALITY (incidents, issues, requests).

**When a risk materializes:**
1. Risk event occurs (breach, outage, compliance violation)
2. Create a **Matter** to handle the incident
3. Matter scope: Contain, investigate, remediate, restore
4. After resolution: Update risk assessment based on learnings

**Examples:**
```typescript
// Risk: "Ransomware infection" → Materializes
// Creates → Matter: "Ransomware Incident #2025-042"
// Activities: Containment, forensics, recovery, remediation
// Outcome → Update risk assessment with lessons learned

// Risk: "Third-party vendor data breach" → Materializes
// Creates → Matter: "Vendor Breach Investigation #2025-019"
// Activities: Assess exposure, notify affected parties, legal review
// Outcome → Add new risk: "Inadequate vendor security requirements"
```

**Matter Types:**
- **Security Incidents**: Data breaches, compromises, attacks
- **Compliance Violations**: Audit findings, regulatory violations
- **Service Disruptions**: Outages, availability issues
- **Vulnerability Disclosures**: Critical vulns requiring immediate action

**Risk Registry Integration:**
- Matter linked to risk ID(s) that materialized
- Risk `relatedIncidents` array includes matter IDs
- Matter resolution updates risk likelihood/impact assessment
- New risks may be identified during incident investigation
- Risk status may change to "mitigated" if properly addressed

#### Maintenance (`function=maintenance`) - Review, Monitor, Control

**Purpose**: Recurring scheduled tasks for risk reviews, KRI monitoring, and control testing.

**Maintenance handles all periodic risk activities:**

**1. Risk Review Cycles** (Scheduled MaintenanceProcess)
```typescript
// MaintenanceProcess: "Quarterly High-Risk Reviews"
// Recurrence: Every 3 months
// Generated Tasks:
//   - Review Risk: "Inadequate access controls" (due: 2025-04-15)
//   - Review Risk: "Unpatched vulnerabilities" (due: 2025-04-15)
//   - Review Risk: "Weak encryption" (due: 2025-04-15)
//
// Each task:
//   1. Assess current likelihood and impact
//   2. Review control effectiveness
//   3. Update risk registry
//   4. Set next review date
```

**2. KRI Monitoring** (Scheduled MaintenanceProcess)
```typescript
// MaintenanceProcess: "Weekly KRI Monitoring"
// Recurrence: Every Monday
// Generated Tasks:
//   - Check KRI: "Failed login attempts" (threshold: >100/day)
//   - Check KRI: "Unpatched systems count" (threshold: >50)
//   - Check KRI: "Days since last vulnerability scan" (threshold: >7)
//
// Each task:
//   1. Collect current metric value
//   2. Compare against thresholds (green/yellow/red)
//   3. Update risk if threshold breached
//   4. Escalate if in red zone
```

**3. Control Testing** (Scheduled MaintenanceProcess)
```typescript
// MaintenanceProcess: "Monthly Control Effectiveness Testing"
// Recurrence: Monthly
// Generated Tasks:
//   - Test Control: "MFA enforcement" (linked to Risk: "Weak authentication")
//   - Test Control: "Backup validation" (linked to Risk: "Data loss")
//   - Test Control: "Firewall rules review" (linked to Risk: "Network intrusion")
//
// Each task:
//   1. Execute control test procedure
//   2. Document test results
//   3. Update control effectiveness rating
//   4. Update associated risk assessment if control failing
```

**4. Framework Control Assessments** (Scheduled MaintenanceProcess)
```typescript
// MaintenanceProcess: "Semi-Annual NIST CSF Assessment"
// Recurrence: Every 6 months
// Generated Tasks:
//   - Assess Control: "ID.AM-1" (linked to Risk: "Unknown asset inventory")
//   - Assess Control: "PR.AC-1" (linked to Risk: "Unauthorized access")
//   - Collect evidence, update maturity level, update risk assessment
```

**Risk Registry Integration:**
- MaintenanceProcess defined for each risk review frequency
- Task generation based on risk `nextReviewDate`
- Task completion updates risk `lastReviewDate` and `nextReviewDate`
- KRI breaches automatically update risk status or trigger Matter creation
- Control test failures trigger risk reassessment or create Matter for remediation

### Work Flow Example

**Risk Lifecycle Using Functions:**

```
1. [Risk Registry] Identify risk: "Inadequate access controls" (High)
   ├─ Assessment: Likelihood=Likely, Impact=Major, Score=16
   ├─ Treatment Strategy: Mitigate
   └─ Status: identified

2. [Project] Create: "Implement RBAC System"
   ├─ Goal: Deploy role-based access controls
   ├─ Timeline: 3 months
   ├─ Link to Risk: "Inadequate access controls"
   └─ Status: active

3. [Maintenance] Schedule: "Monthly Access Control Review"
   ├─ Recurrence: Monthly
   ├─ Tasks: Test RBAC effectiveness, review permissions
   └─ Link to Risk: "Inadequate access controls"

4. [Risk Registry] Update: After project completion
   ├─ Residual Risk: Likelihood=Unlikely, Impact=Moderate, Score=6
   ├─ Status: monitoring
   └─ Controls: ["RBAC-SYSTEM", "LEAST-PRIVILEGE-POLICY"]

5. [Matter] IF risk materializes: "Unauthorized Access Incident"
   ├─ Investigation: How did access control fail?
   ├─ Remediation: Fix gap in RBAC implementation
   └─ Learning: Update risk assessment, create new Project if needed

6. [Maintenance] Ongoing: Risk review task generated quarterly
   ├─ Reassess likelihood/impact
   ├─ Verify controls still effective
   └─ Update risk registry
```

### Critical Distinctions

| Activity | Risk Registry | Project | Matter | Maintenance |
|----------|---------------|---------|---------|-------------|
| **Purpose** | Document & assess | Mature posture | Remediate incidents | Review & monitor |
| **Nature** | Reference data | Planned work | Reactive work | Recurring tasks |
| **Creates Work?** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Work Duration** | Ongoing | Temporary | Temporary | Recurring |
| **Trigger** | Manual identification | Strategic decision | Event occurs | Schedule |
| **Example** | "Risk: Data breach" | "Deploy DLP tools" | "Breach incident #042" | "Quarterly risk review" |

### Integration Fields

Risks should include these fields to link to functions:

```typescript
interface Risk {
  // ... other fields ...

  // Links to work items
  mitigationProjects: string[];      // Project IDs addressing this risk
  relatedIncidents: string[];        // Matter IDs when risk materialized
  maintenanceProcesses: string[];    // MaintenanceProcess IDs for reviews/monitoring

  // Treatment plan creates project
  treatmentPlan?: {
    strategy: TreatmentStrategy;
    projectId?: string;              // Project implementing treatment
    status: 'planned' | 'in-progress' | 'completed';
  };
}
```

### Summary

**The risk registry is NOT a work management system.** It's a catalog of organizational risks that serves as:
- **Input** to Projects (what needs to be mitigated)
- **Context** for Matters (what risk materialized)
- **Target** of Maintenance (what needs periodic review)

Work is managed by Projects, Matters, and Maintenance. Risks are referenced data that these functions act upon.

## Risk Registry Templates

### Cybersecurity Risk Template

```json
{
  "category": "cybersecurity",
  "subcategory": "data-breach",
  "commonRisks": [
    {
      "title": "Inadequate access controls",
      "description": "Insufficient access controls could allow unauthorized access to sensitive data",
      "typicalLikelihood": "possible",
      "typicalImpact": "major"
    },
    {
      "title": "Unpatched vulnerabilities",
      "description": "Known vulnerabilities in systems remain unpatched",
      "typicalLikelihood": "likely",
      "typicalImpact": "major"
    }
  ]
}
```

### Operational Risk Template

```json
{
  "category": "operational",
  "subcategory": "process-failure",
  "commonRisks": [
    {
      "title": "Key personnel departure",
      "description": "Loss of critical personnel with unique knowledge",
      "typicalLikelihood": "possible",
      "typicalImpact": "moderate"
    },
    {
      "title": "System outage",
      "description": "Critical system failure causing service disruption",
      "typicalLikelihood": "unlikely",
      "typicalImpact": "major"
    }
  ]
}
```

## Best Practices

1. **Regular Reviews**: Establish and maintain review schedules
2. **Ownership**: Assign clear risk owners at appropriate levels
3. **Integration**: Link risks to controls, frameworks, and incidents
4. **Evidence**: Maintain evidence of assessments and treatments
5. **KRIs**: Define and monitor key risk indicators
6. **Treatment**: Develop concrete treatment plans with timelines
7. **Learning**: Update risks based on incidents and near-misses
8. **Communication**: Regular risk reporting to stakeholders
9. **Culture**: Foster risk awareness throughout organization
10. **Continuous Improvement**: Regularly refine assessment methodology

## Risk Appetite & Tolerance

### Risk Appetite Statement

```typescript
interface RiskAppetite {
  category: RiskCategory;
  maxAcceptableLevel: RiskLevel;
  conditions?: string[];
  approvedBy: string;
  approvedDate: string;
  reviewDate: string;
}
```

**Example:**
```typescript
{
  category: 'cybersecurity',
  maxAcceptableLevel: 'medium',
  conditions: [
    'Controls must be in place and tested',
    'Incident response plan must be current',
    'Insurance coverage appropriate'
  ],
  approvedBy: 'CISO',
  approvedDate: '2025-01-15',
  reviewDate: '2026-01-15'
}
```

## Future Enhancements

- Automated risk scoring based on KRIs
- Machine learning for risk prediction
- Integration with threat intelligence feeds
- Automated control-to-risk mapping
- Real-time risk dashboards
- Risk simulation and scenario analysis
- Third-party risk assessment integration
- Continuous risk monitoring

## References

- [NIST Risk Management Framework](https://csrc.nist.gov/projects/risk-management)
- [ISO 31000:2018 Risk Management](https://www.iso.org/iso-31000-risk-management.html)
- [COSO Enterprise Risk Management](https://www.coso.org/erm)
- [FAIR Risk Analysis](https://www.fairinstitute.org/)
- [@digital-minion/data Documentation](../../data/README.md)
- [@digital-minion/program Documentation](../README.md)
