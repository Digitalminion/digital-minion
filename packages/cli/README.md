# 🤖 Digital Minion CLI

### *Mechanize Your AI Assistants*

**Digital Minion** is an agentic support system designed to give your AI assistants real-world capabilities. Our first feature brings **powerful task and project management** to AI agents - with much more coming soon!

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/%40digital-minion%2Fcli.svg)](https://www.npmjs.com/package/@digital-minion/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 🚀 What is Digital Minion?

Digital Minion transforms AI assistants from conversational tools into **productive team members** by providing them with structured interfaces to real-world systems.

**Current Feature: Task & Project Management**
- Enable AI agents to manage tasks without Asana accounts
- Full CRUD operations via clean CLI and JSON APIs
- Seamless integration with existing Asana workflows
- Built for both humans and AI agents

**Coming Soon:**
- 📅 Calendar management
- 📧 Email integration
- 📂 Document management
- 🔄 Workflow automation
- And much more...

## ✨ Features

- 🤖 **Zero-Friction Agent Integration**: Tag-based assignment means no Asana accounts needed for AI
- 🔍 **Advanced Filtering**: Multi-criteria search across tasks, tags, sections, agents, and more
- 📊 **JSON-First Design**: Every command outputs clean JSON for programmatic consumption
- ✅ **Complete Task Lifecycle**: Create, assign, update, complete, and organize work
- 🏷️ **Rich Organization**: Tags, sections, subtasks, comments, attachments, and dependencies
- 📦 **Truly Standalone**: Single 830KB bundle with zero external dependencies
- ⚡ **Blazing Fast**: Built with esbuild - optimized for performance
- 🎯 **Batch Operations**: Execute multiple operations atomically via JSON payloads
- 📤 **Export Anywhere**: CSV, JSON, and Markdown export for reporting and analysis

## Installation

```bash
npm install -g @digital-minion/cli
```

Or use with npx:

```bash
npx @digital-minion/cli
```

## ⚡ Quick Start

### 1️⃣ Install

```bash
npm install -g @digital-minion/cli
```

### 2️⃣ Initialize

Set up your environment with the interactive wizard:

```bash
dm init
```

You'll be guided through:
- 🔑 Entering your Asana Personal Access Token ([create one](https://app.asana.com/0/my-apps))
- 🏢 Selecting your workspace
- 👥 Choosing your team
- 📋 Picking your project

### 3️⃣ Start Working!

**For Humans:**
```bash
# List all incomplete tasks
dm list -i

# Create a new task
dm task add "Build the future" --notes "One line of code at a time"

# Assign to an agent
dm assign <taskId> myagent

# Mark complete
dm task complete <taskId>
```

**For AI Agents:**

Digital Minion uses **tag-based assignment** - no Asana accounts needed! AI agents can self-assign and manage their own work:

```bash
# 1. Find your assigned work (JSON output)
dm -o json list --agent myname -i | jq '.tasks[]'

# 2. Get task details
dm -o json task get <taskId> | jq '.task'

# 3. Self-assign available work
dm assign <taskId> myname

# 4. Complete your task
dm task complete <taskId>
```

> 💡 **Pro Tip**: Use the `-o json` flag on any command for clean JSON output - perfect for programmatic parsing!

## Available Commands

### Configuration & Setup
- `dm config init` - Initialize CLI configuration
- `dm config show` - Display current configuration
- `dm config workspace` - Switch workspace
- `dm config team` - Switch team
- `dm config project` - Switch project

### Task Management
- `dm list [options]` - Search and filter tasks
- `dm task add <name>` - Create a new task
- `dm task get <taskId>` - Get task details
- `dm task update <taskId>` - Update a task
- `dm task complete <taskId>` - Mark task as complete
- `dm task delete <taskId>` - Delete a task

### Agent Assignment
- `dm assign <taskId> <agentName>` - Assign task to agent
- `dm unassign <taskId>` - Unassign task from agent
- `dm reassign <taskId> <agentName>` - Reassign to different agent

### Organization
- `dm tag [options]` - Manage tags
- `dm section [options]` - Manage sections
- `dm subtask [options]` - Manage subtasks

### Collaboration
- `dm comment [options]` - Manage comments
- `dm attachment [options]` - Manage attachments
- `dm dependency [options]` - Manage dependencies

### Advanced
- `dm batch execute` - Execute batch operations via JSON
- `dm export <format> <file>` - Export tasks (CSV, JSON, Markdown)
- `dm workflow [options]` - Manage custom field workflows
- `dm status [options]` - Manage project status updates

### Help & Examples
- `dm examples` - Show usage examples
- `dm examples agents` - Agent-specific examples
- `dm help [command]` - Get help for any command

## Filtering & Search

Combine multiple filters for precise results:

```bash
# High priority incomplete tasks
dm list --priority high -i

# Tasks due this week
dm list --due-to 2025-12-31 -i

# Search for specific keywords
dm list --search "bug" -i

# Tasks in a specific section
dm list --section "In Progress" -i

# Tasks with specific tag
dm list --tag "priority:high" -i

# Agent's incomplete tasks
dm list --agent becky -i
```

## JSON Output for Automation

Every command supports JSON output with the `-o json` flag:

```bash
# Get JSON output
dm -o json list -i

# Parse with jq
dm -o json list --agent myname -i | jq '.tasks[] | {id: .gid, name: .name}'

# Use in scripts
TASKS=$(dm -o json list -i)
echo $TASKS | jq -r '.tasks[].gid'
```

## Batch Operations

Execute multiple operations in a single command:

```bash
# From stdin
echo '{
  "operations": [
    {
      "type": "assign",
      "taskIds": ["123", "456"],
      "params": {"agentName": "claude"}
    },
    {
      "type": "complete",
      "taskIds": ["123", "456"]
    }
  ]
}' | dm batch execute

# From file
dm batch execute -f operations.json
```

Supported operations:
- `assign` - Assign tasks to agent
- `unassign` - Remove agent assignment
- `complete` - Mark tasks complete
- `move-section` - Move to section
- `add-tag` - Add tag
- `remove-tag` - Remove tag
- `update-task` - Update properties

## Export Formats

Export tasks to various formats:

```bash
# CSV for spreadsheets
dm export csv tasks.csv -i

# JSON for processing
dm export json backup.json

# Markdown for documentation
dm export markdown report.md --agent becky -i
```

## Configuration

Configuration is stored in `.minion/asana.config.json`:

```json
{
  "accessToken": "your-token",
  "workspaceId": "workspace-gid",
  "teamId": "team-gid",
  "projectId": "project-gid"
}
```

You can switch context at any time:

```bash
dm config workspace  # Switch workspace (also updates team & project)
dm config team       # Switch team (also updates project)
dm config project    # Switch project only
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build (minified)
npm run build:prod

# Build TypeScript types
npm run build:types

# Clean build artifacts
npm run clean
```

### Project Structure

```
packages/cli/
├── src/
│   ├── modules/        # Command modules
│   ├── config/         # Configuration management
│   ├── output/         # Output formatting
│   ├── registry.ts     # Module registry
│   └── index.ts        # Entry point
├── dist/              # Built output (830KB standalone)
├── build.js           # esbuild configuration
└── package.json
```

## Architecture

Digital Minion CLI follows a clean separation of concerns:

- **CLI Layer** (`@digital-minion/cli`): Presentation, command parsing, user interaction
- **Business Logic Layer** (`@digital-minion/lib`): Domain-specific backends, API communication
- **Standalone Bundle**: All dependencies bundled for portability

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- Asana Personal Access Token ([create one](https://app.asana.com/0/my-apps))

## License

Apache-2.0 - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please visit the [GitHub repository](https://github.com/Digitalminion/digital-minion) for:

- 🐛 [Report bugs](https://github.com/Digitalminion/digital-minion/issues)
- 💡 [Request features](https://github.com/Digitalminion/digital-minion/issues)
- 🔧 [Submit pull requests](https://github.com/Digitalminion/digital-minion/pulls)

## Links

- [npm Package](https://www.npmjs.com/package/@digital-minion/cli)
- [GitHub Repository](https://github.com/Digitalminion/digital-minion)
- [Issue Tracker](https://github.com/Digitalminion/digital-minion/issues)
- [Asana Developer Docs](https://developers.asana.com)

## 🆘 Support

For help and questions:

1. Run `dm help [command]` for command-specific help
2. Run `dm examples` for usage examples
3. Check the [GitHub issues](https://github.com/Digitalminion/digital-minion/issues)
4. Review [Asana API documentation](https://developers.asana.com)

---

## 🎯 The Vision

Digital Minion is building the infrastructure layer for agentic AI - enabling AI assistants to interact with the tools and systems that power modern work. Task management is just the beginning.

**Join us in mechanizing the future of AI collaboration.**

---

<div align="center">

**Built with ❤️ for humans and AI agents alike**

[⭐ Star us on GitHub](https://github.com/Digitalminion/digital-minion) • [🐛 Report Bug](https://github.com/Digitalminion/digital-minion/issues) • [💡 Request Feature](https://github.com/Digitalminion/digital-minion/issues)

</div>
