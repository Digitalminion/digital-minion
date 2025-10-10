# Digital Minion 🤖

> **Task Management CLI for Teams and AI Agents**

A powerful, modular command-line interface for managing tasks in Asana (and Microsoft Planner). Designed for both human users and AI agents with comprehensive JSON output support and agent-friendly workflows.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

---

## ✨ Features

- **🤖 Agent-First Design** - AI agents can manage tasks without Asana accounts
- **📊 Dual Output Modes** - Human-friendly text or machine-readable JSON
- **🎨 Progressive Help System** - Beautiful, contextual help with colors
- **🔍 Powerful Filtering** - Search by agent, tags, status, dates, and more
- **📦 Modular Architecture** - Clean separation between CLI and backend logic
- **🔌 Multiple Backends** - Asana support (built), Planner support (ready)
- **⚡ Fast & Lightweight** - Single compiled binary, minimal dependencies
- **🎯 Comprehensive CRUD** - Full lifecycle management for tasks, tags, sections, and more

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Digitalminion/digital-minion.git
cd digital-minion

# Install dependencies
npm install

# Build the CLI
npm run build

# Link for local development
cd packages/cli
npm link
```

### Initial Setup

```bash
# Initialize your configuration (interactive)
dm config init

# You'll be prompted for:
# - Backend type (asana/planner)
# - Personal Access Token
# - Workspace/Tenant ID
# - Project/Plan ID
```

### Your First Commands

```bash
# Find tasks assigned to you
dm list --agent yourname -i

# Get details about a specific task
dm task get <taskId>

# Mark a task complete
dm task complete <taskId>

# Create a new task
dm task add "Fix authentication bug" --notes "User reported login issues" --due 2025-12-31
```

---

## 📚 Command Overview

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `dm config` | Manage CLI configuration | `dm config show` |
| `dm list` | Search and filter tasks | `dm list --agent alice -i` |
| `dm task` | CRUD operations for tasks | `dm task add "New feature"` |

### Organization

| Command | Description | Example |
|---------|-------------|---------|
| `dm tag` | Manage tags | `dm tag create priority:high` |
| `dm section` | Manage sections/buckets | `dm section list` |
| `dm project` | Project management | `dm project members` |

### Collaboration

| Command | Description | Example |
|---------|-------------|---------|
| `dm comment` | Add/view comments | `dm comment add <taskId> "LGTM"` |
| `dm attachment` | Manage attachments | `dm attachment add <taskId> ./file.pdf` |
| `dm user` | User management | `dm user search alice` |

### Advanced Features

| Command | Description | Example |
|---------|-------------|---------|
| `dm workflow` | Custom field workflows | `dm workflow set <taskId> "In Progress"` |
| `dm batch` | Batch operations via JSON | `dm batch execute operations.json` |
| `dm template` | Reusable task templates | `dm template create "Bug Triage"` |
| `dm time` | Time tracking | `dm time log <taskId> 2h` |

### Utilities

| Command | Description | Example |
|---------|-------------|---------|
| `dm export` | Export to CSV/JSON/Markdown | `dm export --format csv --output tasks.csv` |
| `dm examples` | Usage examples | `dm examples agents` |

---

## 🤖 Agent Workflows

Digital Minion is designed to be agent-friendly. Here's how AI agents typically use it:

### Finding Assigned Work

```bash
# Find all incomplete tasks assigned to me
dm list --agent myname -i

# Get the output as JSON for parsing
dm -o json list --agent myname -i | jq '.tasks[]'
```

### Working on Tasks

```bash
# Get task details
TASK_ID="1234567890"
dm task get $TASK_ID

# Add a comment with progress update
dm comment add $TASK_ID "Started working on this"

# Mark complete when done
dm task complete $TASK_ID
```

### Complete Automation Example

```bash
# Get my next task
NEXT_TASK=$(dm -o json list --agent myname -i | jq -r '.tasks[0].gid')

# Get task details
TASK_INFO=$(dm -o json task get $NEXT_TASK)

# Extract task name
TASK_NAME=$(echo $TASK_INFO | jq -r '.task.name')

# Do the work...
echo "Working on: $TASK_NAME"

# Mark complete
dm task complete $NEXT_TASK

# Log time spent
dm time log $NEXT_TASK "2h30m" -n "Completed successfully"
```

---

## 🎨 Progressive Help System

Digital Minion features a beautiful, contextual help system:

```bash
# Top-level help - shows command categories
dm help

# Module-level help - shows subcommands
dm task help

# Command-level help - shows detailed usage
dm task add --help

# Get machine-readable help as JSON
dm task --help-json
```

Help automatically:
- Uses colors for human readability (when not piping)
- Disables colors for JSON mode or when piping
- Shows only relevant information for current scope
- Provides progressive drilling (main → module → command)

---

## 📦 Architecture

Digital Minion is organized as a monorepo with clean separation of concerns:

```
digital-minion/
├── packages/
│   ├── cli/              # Command-line interface
│   │   ├── src/
│   │   │   ├── modules/  # Command modules (task, tag, etc.)
│   │   │   ├── utils/    # Helpers (progressive help, etc.)
│   │   │   └── index.ts  # Main entry point
│   │   └── package.json
│   └── lib/              # Backend implementations
│       ├── src/
│       │   ├── backends/
│       │   │   ├── core/     # Abstract interfaces
│       │   │   ├── asana/    # Asana implementation
│       │   │   └── planner/  # Microsoft Planner implementation
│       │   └── index.ts
│       └── package.json
└── package.json          # Workspace root
```

### Key Design Principles

1. **Separation of Concerns** - CLI logic separate from backend logic
2. **Interface-Driven** - All backends implement core interfaces
3. **Dependency Injection** - Backends are mockable for testing
4. **Progressive Enhancement** - Rich features where supported, graceful degradation elsewhere

---

## 🔌 Backend Support

### Asana (Built-in)

Full support for:
- ✅ Tasks (CRUD, completion, assignment)
- ✅ Comments
- ✅ Attachments (files via upload)
- ✅ Tags
- ✅ Sections
- ✅ Subtasks
- ✅ Dependencies
- ✅ Custom fields
- ✅ Time tracking (via custom fields)
- ✅ Templates

**Setup:**
```bash
dm config init
# Select: asana
# Provide: Personal Access Token, Workspace GID, Project GID
```

### Microsoft Planner (Ready)

Comprehensive support via Microsoft Graph API:
- ✅ Tasks (via Planner API)
- ✅ Comments (via Groups API)
- ✅ Attachments (via OneDrive integration)
- ✅ Sections (via Buckets)
- ✅ Tags (via Categories, 25 limit)
- ✅ Users (via Groups + Directory)
- ⚠️ Subtasks (via Checklist items - limited)
- ✅ Dependencies (via OneDrive JSON storage)

**Setup:**
```bash
dm config init
# Select: planner
# Provide: Access Token, Tenant ID, Plan ID, Group ID
```

---

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Building from Source

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build specific package
cd packages/cli
npm run build

# Watch mode for development
npm run dev
```

### Project Structure

```
packages/cli/src/
├── modules/           # Command modules
│   ├── task/         # Task CRUD operations
│   ├── list/         # Task search/filtering
│   ├── tag/          # Tag management
│   └── ...
├── utils/            # Utilities
│   ├── progressive-help.ts
│   └── command-help.ts
├── types/            # TypeScript types
└── index.ts          # Main entry

packages/lib/src/backends/
├── core/             # Abstract interfaces
│   ├── task-backend.ts
│   ├── comment-backend.ts
│   └── ...
├── asana/            # Asana implementation
│   ├── asana-task-backend.ts
│   └── ...
└── planner/          # Planner implementation
    ├── planner-task-backend.ts
    ├── services/
    │   ├── onedrive-service.ts
    │   └── groups-service.ts
    └── ...
```

### Adding a New Backend

1. Create directory: `packages/lib/src/backends/yourbackend/`
2. Implement interfaces from `packages/lib/src/backends/core/`
3. Export from `packages/lib/src/backends/yourbackend/index.ts`
4. Add to CLI backend provider in `packages/cli/src/backend-provider.ts`

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Lint
npm run lint
```

---

## 📖 Examples

### Creating a Task with Full Metadata

```bash
dm task add "Implement OAuth2 login" \
  --notes "Replace basic auth with OAuth2 for better security" \
  --due 2025-12-31 \
  --priority high \
  --tags "feature,security,priority:high"
```

### Batch Operations for Agents

```bash
# Create operations.json
cat > operations.json << 'EOF'
{
  "operations": [
    {
      "type": "task.add",
      "data": {
        "name": "Task 1",
        "notes": "First task"
      }
    },
    {
      "type": "task.add",
      "data": {
        "name": "Task 2",
        "notes": "Second task"
      }
    }
  ]
}
EOF

# Execute batch
dm batch execute operations.json
```

### Exporting Tasks

```bash
# Export to CSV
dm export --format csv --output tasks.csv

# Export to JSON
dm export --format json --output tasks.json

# Export to Markdown
dm export --format markdown --output tasks.md
```

### Using Templates

```bash
# Create a template
dm template create "Bug Triage" \
  -n "Steps: 1) Reproduce 2) Investigate 3) Fix 4) Test" \
  -t "bug,triage" \
  -p high

# Use the template
dm template use <templateId> -n "Fix login crash on iOS"
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checking and tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Use conventional commit messages
- Keep changes focused and atomic

---

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Asana** - For the excellent task management platform and API
- **Microsoft** - For Graph API and Planner
- **Commander.js** - For CLI framework
- **Chalk** - For terminal colors

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Digitalminion/digital-minion/issues)
- **Documentation**: [GitHub Wiki](https://github.com/Digitalminion/digital-minion/wiki) (coming soon)
- **Discussions**: [GitHub Discussions](https://github.com/Digitalminion/digital-minion/discussions)

---

## 🗺️ Roadmap

- [ ] Test infrastructure (Jest/Vitest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Additional backend support (Jira, GitHub Projects)
- [ ] Web dashboard for visualization
- [ ] Enhanced agent capabilities
- [ ] Plugin system for extensions
- [ ] Docker container distribution
- [ ] Cloud-hosted API option

---

**Built with ❤️ for humans and AI agents alike**
