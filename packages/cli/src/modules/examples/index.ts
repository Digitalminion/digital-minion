import { Command } from 'commander';
import { Module } from '../../types';

/**
 * Module for displaying usage examples and best practices.
 *
 * Provides interactive help with comprehensive examples for JSON output,
 * automation, filtering, and agent workflows. Helps users understand
 * advanced CLI features and scripting patterns.
 */
export class ExamplesModule implements Module {
  name = 'examples';
  description = 'Show usage examples and best practices';

  register(program: Command): void {
    const examplesCmd = program
      .command('examples')
      .description('Show usage examples and best practices');

    examplesCmd
      .command('json')
      .description('Show JSON output examples')
      .action(() => {
        this.showJsonExamples();
      });

    examplesCmd
      .command('automation')
      .description('Show automation and scripting examples')
      .action(() => {
        this.showAutomationExamples();
      });

    examplesCmd
      .command('filtering')
      .description('Show task filtering examples')
      .action(() => {
        this.showFilteringExamples();
      });

    examplesCmd
      .command('agents')
      .description('Show agent assignment and workflow examples')
      .action(() => {
        this.showAgentExamples();
      });

    examplesCmd
      .command('export')
      .description('Show export examples for CSV, JSON, and Markdown')
      .action(() => {
        this.showExportExamples();
      });

    examplesCmd
      .command('all')
      .description('Show all examples')
      .action(() => {
        this.showJsonExamples();
        console.log('\n' + '='.repeat(80) + '\n');
        this.showAutomationExamples();
        console.log('\n' + '='.repeat(80) + '\n');
        this.showFilteringExamples();
        console.log('\n' + '='.repeat(80) + '\n');
        this.showAgentExamples();
        console.log('\n' + '='.repeat(80) + '\n');
        this.showExportExamples();
      });
  }

  private showJsonExamples(): void {
    console.log(`
JSON OUTPUT EXAMPLES
${'='.repeat(80)}

The --output (or -o) flag enables JSON output for programmatic consumption.

Basic Usage:
  tasks -o json list show
  tasks --output json list tag list

Extract Specific Data:
  # Get task count
  tasks -o json list show | jq '.count'

  # Get all task IDs
  tasks -o json list show | jq -r '.tasks[].gid'

  # Get incomplete tasks with specific tag
  tasks -o json list show -i --tag "module:list" | jq '.tasks[]'

Parsing in Scripts:
  # Node.js
  tasks -o json list show | node -e "\\
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); \\
    console.log('Total:', data.count);"

  # Python
  tasks -o json list show | python -c "\\
    import json, sys; \\
    data = json.load(sys.stdin); \\
    print(f'Total: {data[\"count\"]}')"

  # jq
  tasks -o json list --tag "feature" | jq '.tasks | length'

Chain Commands:
  # Create task and immediately add tags
  TASK_ID=$(tasks -o json task add "My task" | jq -r '.task.gid')
  tasks tag add $TASK_ID "module:list"

  # Find and complete multiple tasks
  tasks -o json list --search "bug" | \\
    jq -r '.tasks[].gid' | \\
    xargs -I {} tasks task complete {}
`);
  }

  private showAutomationExamples(): void {
    console.log(`
AUTOMATION & SCRIPTING EXAMPLES
${'='.repeat(80)}

Batch Operations:
  # Complete all tasks with a specific tag
  for id in $(tasks -o json list -i --tag "urgent" | jq -r '.tasks[].gid'); do
    tasks task complete "$id"
  done

  # Add tag to all incomplete tasks in a module
  tasks -o json list -i --tag "module:list" | \\
    jq -r '.tasks[].gid' | \\
    xargs -I {} tasks tag add {} "reviewed"

Data Analysis:
  # Count tasks by module
  tasks -o json list -i | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const byModule = {};
    data.tasks.forEach(t => {
      t.tags.filter(tag => tag.startsWith('module:')).forEach(m => {
        byModule[m] = (byModule[m] || 0) + 1;
      });
    });
    Object.entries(byModule).forEach(([mod, count]) =>
      console.log(mod + ':', count)
    );"

  # Export tasks to CSV
  tasks -o json list | jq -r '
    [\"ID\",\"Name\",\"Completed\",\"Tags\"],
    (.tasks[] | [.gid, .name, .completed, (.tags | join(\";\"))])
    | @csv'

AI Agent Integration:
  # Let AI analyze task backlog
  TASKS=$(tasks -o json list -i --tag "module:list")
  echo "Analyze this backlog: $TASKS" | ai-assistant

  # Programmatic task creation
  cat task-list.json | jq -r '.[] |
    "tasks -o json task add \\"\\(.name)\\" --notes \\"\\(.notes)\\""' |
    bash

Reporting:
  # Daily summary
  echo "=== Daily Task Summary ==="
  echo "Total tasks: $(tasks -o json list | jq '.count')"
  echo "Incomplete: $(tasks -o json list -i | jq '.count')"
  echo "Completed today: $(tasks -o json list -c | jq '.count')"
  echo ""
  echo "By module:"
  tasks -o json list -i | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const modules = {};
    data.tasks.forEach(t => {
      t.tags.filter(tag => tag.startsWith('module:')).forEach(m => {
        modules[m] = (modules[m] || 0) + 1;
      });
    });
    Object.entries(modules).sort((a,b) => b[1] - a[1]).forEach(([m,c]) =>
      console.log('  ' + m + ': ' + c)
    );"
`);
  }

  private showFilteringExamples(): void {
    console.log(`
TASK FILTERING EXAMPLES
${'='.repeat(80)}

Filter by Status:
  tasks list -i                    # Incomplete tasks only
  tasks list -c                    # Completed tasks only

Search by Name/Notes:
  tasks list --search "bug"        # Search in name and notes
  tasks list -s "milestone"        # Short form

Filter by Tags:
  tasks list --tag "module:list"   # Single tag
  tasks list --tag "feature,bug"   # Multiple tags (OR logic)

Filter by Priority:
  tasks list --priority high       # High priority tasks only
  tasks list --priority medium -i  # Incomplete medium priority tasks
  tasks list -p low                # Low priority tasks (short form)

Filter by Assignee:
  tasks list --assignee "john"     # Partial name match
  tasks list -a "jane"             # Short form

Filter by Due Date:
  tasks list --due-from 2025-01-01 --due-to 2025-01-31
  tasks list --due-to 2025-01-15   # Due before date

Combine Filters:
  # Incomplete features in list module
  tasks list -i --tag "feature,module:list"

  # Search for bugs due this week
  tasks list --search "bug" --due-to 2025-01-07

  # High priority tasks assigned to specific person
  tasks list --priority high --assignee "austin"

  # High priority incomplete tasks for agent
  tasks list --priority high --agent becky -i

JSON + Filtering for Advanced Queries:
  # Get IDs of all incomplete tasks with multiple tags
  tasks -o json list -i --tag "module:list" | \\
    jq -r '.tasks[] | select(.tags | contains(["feature"])) | .gid'

  # Count tasks by completion status
  tasks -o json list | \\
    jq '[.tasks[] | .completed] | group_by(.) |
        map({completed: .[0], count: length})'

  # Find overdue tasks (requires custom logic)
  tasks -o json list -i | \\
    jq --arg today "$(date +%Y-%m-%d)" \\
    '.tasks[] | select(.dueOn != null and .dueOn < $today)'
`);
  }

  private showAgentExamples(): void {
    console.log(`
AGENT ASSIGNMENT & WORKFLOW EXAMPLES
${'='.repeat(80)}

Agent assignments use tags with the "agent:" prefix (e.g., "agent:becky").
This allows agents to work without requiring Asana user accounts.

Assign Tasks to Agents:
  tasks assign 1234567890 becky      # Assign task to agent "becky"
  tasks assign 9876543210 claude     # Assign task to agent "claude"

Reassign Tasks:
  tasks reassign 1234567890 alice    # Change assignment from one agent to another
  tasks unassign 1234567890          # Remove agent assignment

Find Agent's Tasks:
  tasks list --agent becky           # Show all tasks for agent "becky"
  tasks list --agent becky -i        # Show incomplete tasks for "becky"
  tasks list --agent claude -o json  # Get "claude's" tasks as JSON

Agent Workflow - Finding Your Work:
  # Agent "becky" checks assigned incomplete tasks
  tasks list --agent becky -i

  # Get task details in JSON for programmatic processing
  tasks -o json list --agent becky -i | jq '.tasks[]'

  # Find your high-priority tasks
  tasks list --agent becky --tag "priority:high" -i

Self-Assignment Pattern:
  # Agent assigns a task to themselves
  AGENT_NAME="becky"
  tasks assign 1234567890 \$AGENT_NAME

  # Or use environment variable
  export MY_AGENT_NAME="becky"
  tasks assign 1234567890 \$MY_AGENT_NAME

Automated Agent Workflows:
  # Daily standup: What am I working on?
  echo "=== My Tasks (becky) ==="
  tasks -o json list --agent becky -i | jq -r '
    "Total: \\(.count)",
    "",
    "Tasks:",
    (.tasks[] | "  [\\(.gid)] \\(.name)")
  '

  # Agent completes a task and finds next one
  tasks task complete 1234567890
  NEXT_TASK=\$(tasks -o json list --agent becky -i | jq -r '.tasks[0].gid')
  echo "Working on task: \$NEXT_TASK"

Multi-Agent Coordination:
  # See all agent assignments
  tasks -o json list -i | jq -r '
    .tasks[] |
    select(.tags | any(startswith("agent:"))) |
    (.tags[] | select(startswith("agent:"))) as \$agent |
    "\\(\$agent): [\\(.gid)] \\(.name)"
  '

  # Count tasks per agent
  tasks -o json list -i | jq '
    [.tasks[] |
     (.tags[] | select(startswith("agent:"))) as \$agent |
     \$agent] |
    group_by(.) |
    map({agent: .[0], count: length})
  '

  # Unassigned tasks (no agent tag)
  tasks -o json list -i | jq -r '
    .tasks[] |
    select(.tags | all(startswith("agent:") | not)) |
    "[\\(.gid)] \\(.name)"
  '

Integration with AI Agents:
  # Agent checks their task list programmatically
  MY_TASKS=\$(tasks -o json list --agent claude -i)
  echo \$MY_TASKS | jq '.tasks[] | {id: .gid, task: .name, notes: .notes}'

  # Agent picks up next unassigned task
  UNASSIGNED=\$(tasks -o json list -i | jq -r '
    .tasks[] |
    select(.tags | all(startswith("agent:") | not)) |
    .gid' | head -1)
  tasks assign \$UNASSIGNED claude

  # Agent creates subtasks and assigns them
  PARENT_TASK="1234567890"
  tasks subtask add \$PARENT_TASK "Implement feature X"
  SUBTASK_ID=\$(tasks -o json subtask list \$PARENT_TASK | jq -r '.subtasks[0].gid')
  tasks assign \$SUBTASK_ID claude

Best Practices:
  - Use lowercase agent names for consistency: "becky", "claude", "alice"
  - Combine --agent with other filters: --agent becky --tag "priority:high"
  - Use JSON output for programmatic agent workflows
  - Agents can self-assign tasks by using their own name
  - Use tags for priority, modules, and other metadata alongside agent assignments
`);
  }

  private showExportExamples(): void {
    console.log(`
EXPORT EXAMPLES
${'='.repeat(80)}

The export command allows you to save task data to various formats for backup,
reporting, and integration with other tools.

Supported Formats:
  - CSV:      Spreadsheet format (Excel, Google Sheets, etc.)
  - JSON:     Machine-readable format for processing
  - Markdown: Human-readable documentation format

CSV Export:
  # Export all tasks
  dm export csv all-tasks.csv

  # Export incomplete tasks only
  dm export csv incomplete.csv -i

  # Export tasks for specific agent
  dm export csv becky-tasks.csv --agent becky -i

  # Export high priority tasks
  dm export csv high-priority.csv --priority high -i

  # Export with multiple filters
  dm export csv sprint-bugs.csv --tag "bug" --due-to 2025-12-31 -i

JSON Export:
  # Full backup of all tasks
  dm export json backup.json

  # Export incomplete tasks as JSON
  dm export json incomplete.json -i

  # Export filtered tasks for processing
  dm export json analysis.json --priority high --tag "feature"

  # Use exported JSON for further processing
  dm export json tasks.json -i
  cat tasks.json | jq '.tasks[] | {name: .name, priority: .priority}'

Markdown Export:
  # Create readable report
  dm export markdown report.md -i

  # Sprint report with specific filters
  dm export md sprint-1.md --due-from 2025-01-01 --due-to 2025-01-31

  # Weekly status report
  dm export markdown weekly-status.md --agent team -i

  # High priority items for stakeholders
  dm export md priorities.md --priority high -i

Filtering with Exports:
  All export commands support the same filters as 'dm list':

  -c, --completed          # Completed tasks only
  -i, --incomplete         # Incomplete tasks only
  -s, --search <query>     # Search in name/notes
  -a, --assignee <name>    # Filter by Asana assignee
  --agent <agentName>      # Filter by agent tag
  --due-from <date>        # Tasks due from date
  --due-to <date>          # Tasks due to/before date
  --tag <tags>             # Filter by tags (comma-separated)
  -p, --priority <level>   # Filter by priority (low/medium/high)

Workflow Examples:
  # Daily backup
  dm export json "backup-\$(date +%Y-%m-%d).json"

  # Weekly team report
  dm export markdown "team-report-week-\$(date +%U).md" -i

  # Export for Excel analysis
  dm export csv tasks.csv
  # Open in Excel, Google Sheets, or Numbers

  # Generate stakeholder report
  dm export md stakeholder-report.md --priority high -i
  # Share the generated Markdown file

  # Archive completed tasks quarterly
  dm export json "completed-Q1-2025.json" -c --due-from 2025-01-01 --due-to 2025-03-31

Integration Examples:
  # Export and analyze with jq
  dm export json tasks.json -i
  cat tasks.json | jq '.tasks | group_by(.priority) |
    map({priority: .[0].priority, count: length})'

  # Import CSV into database
  dm export csv tasks.csv
  # Use CSV import tools in your database system

  # Convert to other formats
  dm export markdown report.md -i
  pandoc report.md -o report.pdf  # Requires pandoc

  # Email report
  dm export markdown daily-tasks.md -i
  mail -s "Daily Task Report" team@example.com < daily-tasks.md

Best Practices:
  - Use descriptive filenames with dates for backups
  - Export regularly for backup purposes
  - Use CSV for spreadsheet analysis
  - Use JSON for programmatic processing
  - Use Markdown for human-readable reports
  - Combine with filters to create focused reports
  - Archive completed tasks periodically
`);
  }
}
