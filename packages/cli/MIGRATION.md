# CLI Mode Migration Plan

## Overview

Digital Minion CLI will support two operational modes to accommodate different organizational needs and backend capabilities:

### 1. **Standalone Mode** (Current/Simple)
- **Purpose**: Direct task management without organizational hierarchy
- **Backend Support**: ALL (Asana, Local, future Custom API)
- **Use Case**: Individual projects, small teams, direct Asana integration
- **Scope**: Current feature set - tasks, subtasks, sections, tags, etc.
- **Mapping**: Direct 1:1 with backend primitives

### 2. **Program Mode** (New/Complex)
- **Purpose**: Enterprise-grade organizational hierarchy with function-based work management
- **Backend Support**: LOCAL ONLY (and future Custom API)
- **Use Case**: Large organizations with complex structure and multiple function types
- **Scope**: Organizational hierarchy, Matter/Project/Maintenance functions, advanced analytics
- **Mapping**: Semantic translation layer via `@digital-minion/program` package

## Why Two Modes?

**Standalone Mode**: Maintains simplicity and broad compatibility. Users who just need task management with Asana can continue using it without additional complexity.

**Program Mode**: Enables advanced features that require:
- Full control over data structure (not possible with Asana API limitations)
- Organizational hierarchy (AdministrativeUnit → BusinessUnit → Organization → Team)
- Function-specific workflows (Matter/Project/Maintenance with different semantics)
- Advanced analytics and cross-functional reporting
- SLA tracking and automated task generation
- Hive-partitioned data storage for analysis

## Architecture Changes

### Config Structure

#### Current (Standalone Mode)
```typescript
interface MinionConfig {
  defaultBackend: string;
  backends: Record<string, BackendConfiguration>;
}

interface BackendConfiguration {
  type: 'local' | 'asana';
  asana?: AsanaConfig;
  local?: LocalConfig;
}

interface LocalConfig {
  basePath: string;
  teamName: string;
  projectName: string;
  projectId: string;
}
```

#### New (With Mode Support)
```typescript
interface MinionConfig {
  // Mode selection
  mode: 'standalone' | 'program';

  defaultBackend: string;
  backends: Record<string, BackendConfiguration>;

  // Program mode configuration (optional, only when mode='program')
  program?: ProgramModeConfig;
}

interface BackendConfiguration {
  type: 'local' | 'asana';

  // Compatibility flag
  supportsProgramMode: boolean;

  asana?: AsanaConfig;
  local?: LocalConfig;
}

interface ProgramModeConfig {
  // Current organizational context
  context: {
    administrativeUnit: {
      id: string;
      name: string;
    };
    businessUnit: {
      id: string;
      name: string;
    };
    organization: {
      id: string;
      name: string;
      workspaceId?: string;  // Optional Asana workspace mapping
    };
    team: {
      id: string;
      name: string;
      teamId?: string;  // Optional Asana team mapping
    };
  };

  // Default function type for commands
  defaultFunctionType: 'matter' | 'project' | 'maintenance';

  // Storage configuration for program mode
  storage: {
    // Base path for hive-partitioned storage
    basePath: string;  // e.g., ".minion/local"

    // Whether to use Hive partition naming
    useHivePartitions: boolean;  // default: true
  };
}
```

### Command Structure Changes

#### Standalone Mode Commands (Unchanged)
```bash
dm task add "Task name"
dm task list
dm task complete <id>
dm project info
dm section list
dm sync pull
```

#### Program Mode Commands (New)
```bash
# Mode management
dm mode                          # Show current mode
dm mode use standalone          # Switch to standalone mode
dm mode use program             # Switch to program mode
dm mode status                  # Show mode details and compatibility

# Context management (program mode only)
dm context                      # Show current organizational context
dm context set                  # Interactive context selection
dm context list                 # List all available contexts

# Function management (program mode only)
dm function use project         # Switch to project function
dm function use matter          # Switch to matter function
dm function use maintenance     # Switch to maintenance function

# Project function commands
dm project create               # Create new project
dm project feature add          # Add feature to project
dm project feature list         # List features
dm project task add             # Add task to feature/stage
dm project task move <stage>    # Move task to different stage
dm project stats                # Project statistics
dm project burndown <feature>   # Feature burndown

# Matter function commands
dm matter create                # Create new matter (incident/request)
dm matter activity add          # Add activity to matter
dm matter task add              # Add discrete task
dm matter escalate              # Escalate matter
dm matter resolve               # Resolve matter
dm matter sla                   # Check SLA status

# Maintenance function commands
dm maintenance process create   # Create maintenance process
dm maintenance generate         # Generate tasks from process
dm maintenance schedule         # View maintenance schedule
dm maintenance complete <id>    # Complete maintenance task

# Fallback to standalone commands when in program mode
dm task add "Task"              # Still works, creates in current context
```

### Backend Compatibility Matrix

| Backend Type | Standalone Mode | Program Mode | Notes |
|-------------|----------------|--------------|-------|
| **Asana** | ✅ Full | ❌ No | Limited API, no custom hierarchy support |
| **Local** | ✅ Full | ✅ Full | Complete control, Hive partitioning |
| **Custom API** (Future) | ✅ Full | ✅ Full | Will support both modes |

### Mode Detection Flow

```typescript
// In CLI initialization (src/index.ts)

async function determineMode(): Promise<'standalone' | 'program'> {
  const config = await ConfigManager.load();

  // Check config for explicit mode setting
  if (config.mode) {
    return config.mode;
  }

  // Default to standalone for backward compatibility
  return 'standalone';
}

async function validateModeCompatibility(
  mode: 'standalone' | 'program',
  backend: BackendConfiguration
): Promise<void> {
  if (mode === 'program') {
    if (!backend.supportsProgramMode) {
      throw new Error(
        `Backend '${backend.type}' does not support program mode. ` +
        `Program mode requires 'local' or 'custom' backend. ` +
        `Use 'dm mode use standalone' to switch modes or ` +
        `'dm backend use local' to switch backends.`
      );
    }
  }
}
```

### Module Registry Changes

```typescript
// Current: src/registry.ts
export class ModuleRegistry {
  register(module: Module): void;
  applyModules(program: Command): void;
}

// New: Support for conditional module registration
export class ModuleRegistry {
  private mode: 'standalone' | 'program';

  register(module: Module, options?: {
    modes?: ('standalone' | 'program')[];  // Which modes this module works in
    requiresProgramMode?: boolean;          // Only in program mode
  }): void;

  applyModules(program: Command): void;
}

// Example registration in src/index.ts
async function main() {
  const mode = await determineMode();
  const registry = new ModuleRegistry(mode);

  // Standalone modules (work in both modes)
  registry.register(new ConfigModule());
  registry.register(new ListModule());
  registry.register(new TaskModule());

  // Program-mode only modules
  registry.register(new ModeModule(), { requiresProgramMode: false }); // mode mgmt works everywhere
  registry.register(new ContextModule(), { requiresProgramMode: true });
  registry.register(new FunctionModule(), { requiresProgramMode: true });
  registry.register(new ProjectFunctionModule(), { requiresProgramMode: true });
  registry.register(new MatterFunctionModule(), { requiresProgramMode: true });
  registry.register(new MaintenanceFunctionModule(), { requiresProgramMode: true });
}
```

## Migration Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Add mode awareness without breaking existing functionality

- [ ] Update `MinionConfig` type to include `mode` field
- [ ] Add mode detection in CLI initialization
- [ ] Create `ModeModule` with basic commands:
  - `dm mode` - show current mode
  - `dm mode use <mode>` - switch modes
  - `dm mode status` - show mode details
- [ ] Add mode validation for backend compatibility
- [ ] Update `ModuleRegistry` to support conditional registration
- [ ] Add `supportsProgramMode` flag to backend configurations
- [ ] Update config migrations to set `mode: 'standalone'` as default
- [ ] **Testing**: Verify existing commands work unchanged in standalone mode

### Phase 2: Context Management (Weeks 3-4)
**Goal**: Add organizational hierarchy management for program mode

- [ ] Create `ContextModule` for organizational context commands
- [ ] Implement context storage in config
- [ ] Create interactive context selection wizard (`dm context set`)
- [ ] Add context display (`dm context`, `dm context list`)
- [ ] Create context validator (ensure all required fields present)
- [ ] Add context to help output when in program mode
- [ ] **Testing**: Switch to program mode, set context, verify persistence

### Phase 3: Function Type Management (Weeks 5-6)
**Goal**: Enable function type selection and switching

- [ ] Create `FunctionModule` for function type commands
- [ ] Implement function type storage in config (default function)
- [ ] Add function type switching (`dm function use <type>`)
- [ ] Create function-specific command prefixes validation
- [ ] Add function type indicator in CLI prompt/output
- [ ] **Testing**: Switch between function types, verify correct routing

### Phase 4: Project Function Implementation (Weeks 7-9)
**Goal**: Fully implement project function commands using `@digital-minion/program`

- [ ] Create `ProjectFunctionModule`
- [ ] Implement project management commands:
  - `dm project create`
  - `dm project info`
  - `dm project stats`
- [ ] Implement feature management commands:
  - `dm project feature add`
  - `dm project feature list`
  - `dm project feature burndown <id>`
- [ ] Implement task management commands:
  - `dm project task add`
  - `dm project task move <stage>`
  - `dm project task list [stage]`
- [ ] Implement subtask commands
- [ ] Add analytics commands (burndown, velocity, etc.)
- [ ] **Testing**: Create project, add features/tasks, move through stages

### Phase 5: Matter Function Implementation (Weeks 10-12)
**Goal**: Implement incident/request management

- [ ] Create `MatterFunctionModule`
- [ ] Implement matter lifecycle commands:
  - `dm matter create`
  - `dm matter list [type]`
  - `dm matter resolve`
  - `dm matter escalate`
- [ ] Implement activity management commands
- [ ] Implement discrete task commands
- [ ] Add SLA tracking and alerts
- [ ] Add matter type filtering (incident/request/vulnerability/etc.)
- [ ] **Testing**: Create incidents, track SLAs, resolve matters

### Phase 6: Maintenance Function Implementation (Weeks 13-14)
**Goal**: Implement recurring task management

- [ ] Create `MaintenanceFunctionModule`
- [ ] Implement process management commands:
  - `dm maintenance process create`
  - `dm maintenance process list`
- [ ] Implement task generation commands:
  - `dm maintenance generate`
  - `dm maintenance schedule`
- [ ] Implement recurrence configuration
- [ ] Add time-based sections (overdue, due-today, etc.)
- [ ] **Testing**: Create processes, generate tasks, verify scheduling

### Phase 7: Enhanced Sync (Weeks 15-16)
**Goal**: Make sync mode-aware and handle program mode properly

- [ ] Update `SyncModule` to detect mode
- [ ] In standalone mode: use current sync behavior
- [ ] In program mode:
  - Sync within current context only
  - Use program package for transformation
  - Map to backend according to function type
- [ ] Add sync status for program mode contexts
- [ ] **Testing**: Sync project data, verify transformation

### Phase 8: Migration Tooling (Weeks 17-18)
**Goal**: Help users migrate between modes

- [ ] Create migration wizard (`dm migrate to-program`)
- [ ] Implement standalone → program migration:
  - Prompt for organizational hierarchy
  - Create context from existing project
  - Transform existing data to program format
- [ ] Implement program → standalone migration:
  - Flatten hierarchy
  - Export to simple format
- [ ] Add data validation and backup
- [ ] **Testing**: Migrate sample data both directions

### Phase 9: Documentation and Polish (Weeks 19-20)
**Goal**: Comprehensive documentation and user experience improvements

- [ ] Update README with mode explanation
- [ ] Create mode selection guide
- [ ] Add program mode tutorial
- [ ] Update all command help text
- [ ] Add examples for each function type
- [ ] Create troubleshooting guide
- [ ] Add mode-specific help commands
- [ ] **Testing**: Full end-to-end user scenarios

## Implementation Checklist

### Configuration Changes
- [ ] Add `mode` field to `MinionConfig`
- [ ] Add `ProgramModeConfig` interface
- [ ] Add `supportsProgramMode` to `BackendConfiguration`
- [ ] Update `ConfigManager` to handle program mode config
- [ ] Add config validation for program mode requirements
- [ ] Add migration for existing configs (add mode: 'standalone')

### CLI Infrastructure
- [ ] Add mode detection in `main()` function
- [ ] Update `ModuleRegistry` for conditional module registration
- [ ] Add mode validation before command execution
- [ ] Add mode indicator in output/prompt
- [ ] Create error messages for mode/backend incompatibility

### New Modules to Create
- [ ] `src/modules/mode/index.ts` - Mode management
- [ ] `src/modules/context/index.ts` - Context management
- [ ] `src/modules/function/index.ts` - Function type switching
- [ ] `src/modules/project-function/index.ts` - Project commands
- [ ] `src/modules/matter-function/index.ts` - Matter commands
- [ ] `src/modules/maintenance-function/index.ts` - Maintenance commands
- [ ] `src/modules/migrate/index.ts` - Migration tooling

### Integration with @digital-minion/program
- [ ] Add `@digital-minion/program` to CLI dependencies
- [ ] Create `ProgramProvider` service (similar to `BackendProvider`)
- [ ] Implement `ProgramManager` initialization from context
- [ ] Add context → ProgramContext transformation
- [ ] Handle program mode errors gracefully

### Backward Compatibility
- [ ] Ensure all existing commands work in standalone mode
- [ ] Default to standalone mode for existing configs
- [ ] Maintain existing command syntax
- [ ] Provide clear upgrade path in documentation

### Error Handling
- [ ] "Mode not supported for backend" error
- [ ] "Program mode requires context" error
- [ ] "Context incomplete" error
- [ ] "Function type not available" error
- [ ] Helpful error messages with suggestions

### Testing Strategy
- [ ] Unit tests for mode detection
- [ ] Unit tests for mode validation
- [ ] Integration tests for each module
- [ ] End-to-end tests for full workflows
- [ ] Migration tests (both directions)
- [ ] Backward compatibility tests

## Risk Mitigation

### Risk: Breaking Existing Users
**Mitigation**:
- Default to standalone mode for all existing configurations
- All existing commands continue to work unchanged in standalone mode
- Mode is opt-in, requires explicit `dm mode use program`

### Risk: Mode Confusion
**Mitigation**:
- Clear mode indicator in CLI output
- Helpful error messages when commands unavailable
- `dm mode status` shows compatibility and current state
- Documentation clearly explains differences

### Risk: Backend Incompatibility
**Mitigation**:
- Validate mode/backend compatibility on mode switch
- Clear error messages explaining limitations
- Suggest compatible backends when incompatibility detected

### Risk: Complex Migration
**Mitigation**:
- Provide automated migration wizard
- Support partial migration (test with subset of data)
- Include rollback capability
- Comprehensive migration documentation

## Success Criteria

1. **Backward Compatibility**: All existing users can continue using CLI without changes
2. **Clear Mode Separation**: Users understand the difference and when to use each mode
3. **Smooth Migration**: Users can migrate to program mode with guided wizard
4. **Feature Completeness**: Program mode supports all three function types fully
5. **Documentation**: Clear guides for both modes and migration process
6. **Error Handling**: Helpful errors guide users to correct usage
7. **Performance**: No degradation in standalone mode, acceptable performance in program mode

## Timeline Estimate

- **Total Duration**: ~20 weeks (5 months)
- **MVP** (Phases 1-4): ~9 weeks - Standalone + Context + Functions + Project
- **Full Feature Set** (Phases 1-6): ~14 weeks - Add Matter and Maintenance
- **Production Ready** (All Phases): ~20 weeks - Including migration tools and docs

## Open Questions

1. **Should program mode support hybrid backends?**
   - E.g., use program package but sync to Asana with best-effort mapping?
   - Decision: Start with local-only, evaluate hybrid later

2. **How to handle existing local backend data when switching to program mode?**
   - Automatic migration? Manual migration? Keep separate?
   - Decision: Provide migration wizard, keep separate until migrated

3. **Should standalone mode have access to organizational hierarchy?**
   - Lightweight version without full program package?
   - Decision: No, keep standalone truly simple

4. **How to handle multi-project/multi-function scenarios in program mode?**
   - Single context at a time? Support multiple active contexts?
   - Decision: Single context, switch with `dm context set`

5. **Should context be stored in config or in a separate file?**
   - Config: simpler, but config gets large
   - Separate: cleaner separation, but more files
   - Decision: Store in config, it's relatively small

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on immediate needs
3. **Create detailed tickets** for Phase 1 tasks
4. **Set up feature branch** for mode implementation
5. **Begin Phase 1 implementation**
