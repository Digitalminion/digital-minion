import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { addMetadataHelp } from '../../utils/command-help';
import * as fs from 'fs';

/**
 * Module for batch operations on tasks.
 *
 * Accepts JSON payloads defining multiple operations to execute in sequence.
 * Designed for agent-friendly programmatic task management.
 */
export class BatchModule implements Module {
  name = 'batch';
  description = 'Execute batch operations via JSON payloads (agent-friendly)';

  metadata: CommandMetadata = {
    name: 'batch',
    alias: 'ba',
    summary: 'Execute batch operations via JSON payloads (agent-friendly)',
    description: `Batch operations allow agents to perform multiple task operations in a single
command by providing a JSON payload. Each operation is executed sequentially,
and detailed results are returned for each operation and task.

Supported Operations:
  • assign        - Assign tasks to an agent
  • unassign      - Remove agent assignments
  • complete      - Mark tasks as complete
  • move-section  - Move tasks to a section
  • add-tag       - Add a tag to tasks
  • remove-tag    - Remove a tag from tasks
  • update-task   - Update task properties`,
    subcommands: [
      {
        name: 'execute',
        summary: 'Execute batch operations from JSON payload',
        description: 'Reads JSON from stdin or a file and executes the batch operations. Always outputs JSON results for programmatic consumption.',
        options: [
          {
            short: '-f',
            long: '--file',
            description: 'Read JSON from file instead of stdin',
            takesValue: true,
            valueType: 'string',
            valueName: '<path>'
          }
        ],
        examples: [
          {
            description: 'Execute batch from stdin',
            command: 'echo \'{"operations": [...]}\' | dm batch execute'
          },
          {
            description: 'Execute batch from file',
            command: 'dm batch execute -f batch.json'
          },
          {
            description: 'Process results with jq',
            command: 'dm batch execute -f ops.json | jq \'.results[] | select(.success == false)\''
          }
        ]
      },
      {
        name: 'examples',
        summary: 'Show batch operation examples',
        description: 'Displays detailed examples of batch operation JSON payloads for common workflows and use cases.',
        subcommands: [
          {
            name: 'all',
            summary: 'Show all batch operation examples'
          },
          {
            name: 'assign',
            summary: 'Show examples for assigning tasks to agents'
          },
          {
            name: 'workflow',
            summary: 'Show examples for moving tasks through workflow stages'
          },
          {
            name: 'complete',
            summary: 'Show examples for completing tasks'
          },
          {
            name: 'tags',
            summary: 'Show examples for adding/removing tags'
          },
          {
            name: 'update',
            summary: 'Show examples for updating task properties'
          },
          {
            name: 'complex',
            summary: 'Show complex multi-operation workflow examples'
          }
        ]
      },
      {
        name: 'schema',
        summary: 'Show JSON schema documentation',
        description: 'Displays the complete JSON schema for batch operations including all operation types, required fields, and parameter options.'
      }
    ],
    examples: [
      {
        description: 'Assign multiple tasks to an agent',
        command: 'echo \'{"operations": [{"type": "assign", "taskIds": ["123", "456"], "params": {"agentName": "claude"}}]}\' | dm batch execute'
      },
      {
        description: 'Move tasks to section and complete them',
        command: 'dm batch execute -f workflow.json'
      },
      {
        description: 'Complex multi-operation workflow',
        command: 'dm batch execute -f complex-workflow.json'
      }
    ],
    notes: [
      'Operations execute sequentially in the order specified',
      'Each operation returns detailed per-task results',
      'Output is always JSON for programmatic consumption',
      'Failed operations do not stop execution of subsequent operations',
      'Use "dm batch examples" for detailed payload examples',
      'Use "dm batch schema" for complete JSON schema documentation'
    ]
  };

  register(program: Command): void {
    const batchCmd = program
      .command('batch')
      .alias('ba')
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(batchCmd, this.metadata);

    batchCmd
      .command('execute')
      .description(`Execute batch operations from JSON payload

Reads JSON from stdin or a file and executes the batch operations.
Always outputs JSON results for programmatic consumption.

Options:
  -f, --file <path>  - Read JSON from file instead of stdin

Examples:
  # From stdin
  echo '{"operations": [...]}' | dm batch execute

  # From file
  dm batch execute -f batch.json

  # Pipe output for processing
  dm batch execute -f ops.json | jq '.results[] | select(.success == false)'`)
      .option('-f, --file <path>', 'Read JSON from file')
      .action(async (options) => {
        await this.executeBatch(options);
      });

    const examplesCmd = batchCmd
      .command('examples')
      .description(`Show batch operation examples

Displays detailed examples of batch operation JSON payloads for common
workflows and use cases.`);

    examplesCmd
      .command('all')
      .description('Show all batch operation examples')
      .action(async () => {
        await this.showAllExamples();
      });

    examplesCmd
      .command('assign')
      .description('Show examples for assigning tasks to agents')
      .action(async () => {
        await this.showAssignExamples();
      });

    examplesCmd
      .command('workflow')
      .description('Show examples for moving tasks through workflow stages')
      .action(async () => {
        await this.showWorkflowExamples();
      });

    examplesCmd
      .command('complete')
      .description('Show examples for completing tasks')
      .action(async () => {
        await this.showCompleteExamples();
      });

    examplesCmd
      .command('tags')
      .description('Show examples for adding/removing tags')
      .action(async () => {
        await this.showTagExamples();
      });

    examplesCmd
      .command('update')
      .description('Show examples for updating task properties')
      .action(async () => {
        await this.showUpdateExamples();
      });

    examplesCmd
      .command('complex')
      .description('Show complex multi-operation workflow examples')
      .action(async () => {
        await this.showComplexExamples();
      });

    batchCmd
      .command('schema')
      .description(`Show JSON schema documentation

Displays the complete JSON schema for batch operations including all
operation types, required fields, and parameter options.`)
      .action(async () => {
        await this.showSchema();
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getBatchBackend();
  }

  private async executeBatch(options: any): Promise<void> {
    try {
      let jsonInput: string;

      // Read from file or stdin
      if (options.file) {
        jsonInput = fs.readFileSync(options.file, 'utf-8');
      } else {
        // Read from stdin
        jsonInput = fs.readFileSync(0, 'utf-8');
      }

      // Parse JSON
      const payload = JSON.parse(jsonInput);

      if (!payload.operations || !Array.isArray(payload.operations)) {
        throw new Error('Invalid JSON: must contain "operations" array');
      }

      const operations: Backends.BatchOperation[] = payload.operations;

      // Validate operations
      for (const op of operations) {
        if (!op.type) {
          throw new Error('Each operation must have a "type" field');
        }
        if (!op.taskIds || !Array.isArray(op.taskIds)) {
          throw new Error('Each operation must have a "taskIds" array');
        }
      }

      // Execute batch
      const backend = this.getBackend();
      const results = await backend.executeBatch(operations);

      // Always output JSON for batch operations
      const output = {
        success: results.every(r => r.success),
        totalOperations: results.length,
        successfulOperations: results.filter(r => r.success).length,
        failedOperations: results.filter(r => !r.success).length,
        results
      };

      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      const errorOutput = {
        success: false,
        error: String(error)
      };
      console.error(JSON.stringify(errorOutput, null, 2));
      process.exit(1);
    }
  }

  private async showSchema(): Promise<void> {
    const schema = `
Batch Operations JSON Schema
=============================

OVERVIEW
--------
Batch operations accept a JSON payload with an "operations" array.
Each operation specifies a type, task IDs, and type-specific parameters.

TOP-LEVEL STRUCTURE
-------------------
{
  "operations": [
    /* Array of operation objects */
  ]
}

OPERATION OBJECT STRUCTURE
--------------------------
{
  "id": "optional-unique-identifier",    // Optional: Used to track results
  "type": "operation-type",              // Required: One of the types below
  "taskIds": ["taskId1", "taskId2"],     // Required: Array of task GIDs
  "params": {                            // Optional: Operation-specific params
    /* See operation types below */
  }
}

OPERATION TYPES
---------------

1. assign
   Purpose: Assign tasks to an agent using agent:name tags
   Required params:
     - agentName: string
   Example:
     {
       "type": "assign",
       "taskIds": ["123", "456"],
       "params": {"agentName": "claude"}
     }

2. unassign
   Purpose: Remove all agent:* tags from tasks
   Required params: None
   Example:
     {
       "type": "unassign",
       "taskIds": ["123", "456"]
     }

3. complete
   Purpose: Mark tasks as completed
   Required params: None
   Example:
     {
       "type": "complete",
       "taskIds": ["123", "456"]
     }

4. move-section
   Purpose: Move tasks to a different section
   Required params:
     - sectionId: string (GID of target section)
   Example:
     {
       "type": "move-section",
       "taskIds": ["123", "456"],
       "params": {"sectionId": "999"}
     }

5. add-tag
   Purpose: Add a tag to tasks (creates tag if it doesn't exist)
   Required params:
     - tagName: string
   Example:
     {
       "type": "add-tag",
       "taskIds": ["123", "456"],
       "params": {"tagName": "priority:high"}
     }

6. remove-tag
   Purpose: Remove a tag from tasks
   Required params:
     - tagName: string
   Example:
     {
       "type": "remove-tag",
       "taskIds": ["123", "456"],
       "params": {"tagName": "priority:high"}
     }

7. update-task
   Purpose: Update task properties
   Required params:
     - updates: object with one or more of:
       - name: string
       - notes: string
       - dueOn: string (YYYY-MM-DD)
       - startOn: string (YYYY-MM-DD)
       - priority: "low" | "medium" | "high"
   Example:
     {
       "type": "update-task",
       "taskIds": ["123"],
       "params": {
         "updates": {
           "name": "New name",
           "dueOn": "2025-12-31",
           "priority": "high"
         }
       }
     }

RESPONSE FORMAT
---------------
{
  "success": boolean,              // True if all operations succeeded
  "totalOperations": number,       // Total number of operations
  "successfulOperations": number,  // Number of successful operations
  "failedOperations": number,      // Number of failed operations
  "results": [                     // Array of operation results
    {
      "operationId": "string",     // ID from request (if provided)
      "type": "string",            // Operation type
      "success": boolean,          // Operation success status
      "tasksProcessed": number,    // Total tasks in operation
      "tasksSucceeded": number,    // Tasks that succeeded
      "tasksFailed": number,       // Tasks that failed
      "error": "string",           // Error message (if failed)
      "taskResults": [             // Per-task results
        {
          "taskId": "string",
          "success": boolean,
          "error": "string"        // Error message (if failed)
        }
      ]
    }
  ]
}

USAGE
-----
# From stdin
echo '{"operations": [...]}' | dm batch execute

# From file
dm batch execute -f operations.json

# Process results
dm batch execute -f ops.json | jq '.results[] | select(.success == false)'

For examples, run: dm batch examples all
`;

    console.log(schema);
  }

  private async showAssignExamples(): Promise<void> {
    const examples = `
Batch Assign Examples
=====================

ASSIGN MULTIPLE TASKS TO ONE AGENT
-----------------------------------
{
  "operations": [
    {
      "id": "assign-to-claude",
      "type": "assign",
      "taskIds": ["1234567890", "9876543210", "5555555555"],
      "params": {
        "agentName": "claude"
      }
    }
  ]
}

Usage:
  echo '{"operations":[{"type":"assign","taskIds":["123","456"],"params":{"agentName":"claude"}}]}' | dm batch execute

REASSIGN TASKS FROM ONE AGENT TO ANOTHER
-----------------------------------------
{
  "operations": [
    {
      "id": "unassign-from-alice",
      "type": "unassign",
      "taskIds": ["1234567890", "9876543210"]
    },
    {
      "id": "assign-to-bob",
      "type": "assign",
      "taskIds": ["1234567890", "9876543210"],
      "params": {
        "agentName": "bob"
      }
    }
  ]
}

ASSIGN TASKS DYNAMICALLY FROM QUERY
------------------------------------
# Get unassigned high priority tasks and assign to agent
dm -o json list --tag "priority:high" -i | jq '{
  operations: [{
    id: "assign-high-priority",
    type: "assign",
    taskIds: [.tasks[].gid],
    params: {agentName: "claude"}
  }]
}' | dm batch execute

DISTRIBUTE TASKS ACROSS MULTIPLE AGENTS
----------------------------------------
# Get first 5 tasks for alice, next 5 for bob
TASKS=$(dm -o json list -i | jq -r '.tasks[].gid')
ALICE_TASKS=$(echo "$TASKS" | head -5 | jq -R . | jq -s .)
BOB_TASKS=$(echo "$TASKS" | tail -5 | jq -R . | jq -s .)

jq -n --argjson alice "$ALICE_TASKS" --argjson bob "$BOB_TASKS" '{
  operations: [
    {id: "assign-alice", type: "assign", taskIds: $alice, params: {agentName: "alice"}},
    {id: "assign-bob", type: "assign", taskIds: $bob, params: {agentName: "bob"}}
  ]
}' | dm batch execute
`;

    console.log(examples);
  }

  private async showWorkflowExamples(): Promise<void> {
    const examples = `
Batch Workflow Examples
=======================

MOVE TASKS TO "IN PROGRESS" AND ASSIGN
---------------------------------------
{
  "operations": [
    {
      "id": "move-to-in-progress",
      "type": "move-section",
      "taskIds": ["1234567890", "9876543210"],
      "params": {
        "sectionId": "111222333"
      }
    },
    {
      "id": "assign-to-agent",
      "type": "assign",
      "taskIds": ["1234567890", "9876543210"],
      "params": {
        "agentName": "alice"
      }
    }
  ]
}

Usage:
  # First, get the section ID
  dm section list

  # Then use it in batch operation
  dm batch execute -f move-and-assign.json

COMPLETE WORKFLOW: START TO FINISH
-----------------------------------
# Move from Backlog -> In Progress -> Done -> Complete

# Step 1: Get section IDs
IN_PROGRESS=$(dm -o json section list | jq -r '.sections[] | select(.name=="In Progress") | .gid')
DONE=$(dm -o json section list | jq -r '.sections[] | select(.name=="Done") | .gid')

# Step 2: Get assigned tasks
TASKS=$(dm -o json list --agent myname -i | jq '[.tasks[].gid]')

# Step 3: Process workflow
jq -n --argjson tasks "$TASKS" --arg inprog "$IN_PROGRESS" '{
  operations: [
    {
      id: "move-to-in-progress",
      type: "move-section",
      taskIds: $tasks,
      params: {sectionId: $inprog}
    }
  ]
}' | dm batch execute

# ... later after work is done ...

jq -n --argjson tasks "$TASKS" --arg done "$DONE" '{
  operations: [
    {
      id: "move-to-done",
      type: "move-section",
      taskIds: $tasks,
      params: {sectionId: $done}
    },
    {
      id: "complete-tasks",
      type: "complete",
      taskIds: $tasks
    }
  ]
}' | dm batch execute

MULTI-STAGE WORKFLOW WITH TAGS
-------------------------------
{
  "operations": [
    {
      "id": "remove-backlog-tag",
      "type": "remove-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "backlog"}
    },
    {
      "id": "add-in-progress-tag",
      "type": "add-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "in-progress"}
    },
    {
      "id": "move-to-section",
      "type": "move-section",
      "taskIds": ["123", "456"],
      "params": {"sectionId": "999"}
    },
    {
      "id": "assign-to-agent",
      "type": "assign",
      "taskIds": ["123", "456"],
      "params": {"agentName": "claude"}
    }
  ]
}
`;

    console.log(examples);
  }

  private async showCompleteExamples(): Promise<void> {
    const examples = `
Batch Complete Examples
=======================

COMPLETE MULTIPLE TASKS
------------------------
{
  "operations": [
    {
      "id": "complete-tasks",
      "type": "complete",
      "taskIds": ["1234567890", "9876543210", "5555555555"]
    }
  ]
}

Usage:
  echo '{"operations":[{"type":"complete","taskIds":["123","456"]}]}' | dm batch execute

COMPLETE AND TAG
----------------
{
  "operations": [
    {
      "id": "complete-tasks",
      "type": "complete",
      "taskIds": ["123", "456", "789"]
    },
    {
      "id": "tag-completed",
      "type": "add-tag",
      "taskIds": ["123", "456", "789"],
      "params": {
        "tagName": "completed-by-bot"
      }
    }
  ]
}

COMPLETE ALL ASSIGNED TASKS
----------------------------
# Get all your incomplete tasks and complete them
dm -o json list --agent myname -i | jq '{
  operations: [
    {
      id: "complete-all-my-tasks",
      type: "complete",
      taskIds: [.tasks[].gid]
    },
    {
      id: "unassign-completed",
      type: "unassign",
      taskIds: [.tasks[].gid]
    }
  ]
}' | dm batch execute

COMPLETE WITH WORKFLOW
----------------------
{
  "operations": [
    {
      "id": "move-to-done-section",
      "type": "move-section",
      "taskIds": ["123", "456"],
      "params": {"sectionId": "999"}
    },
    {
      "id": "mark-complete",
      "type": "complete",
      "taskIds": ["123", "456"]
    },
    {
      "id": "unassign-agent",
      "type": "unassign",
      "taskIds": ["123", "456"]
    },
    {
      "id": "add-completion-tag",
      "type": "add-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "auto-completed"}
    }
  ]
}
`;

    console.log(examples);
  }

  private async showTagExamples(): Promise<void> {
    const examples = `
Batch Tag Examples
==================

ADD TAG TO MULTIPLE TASKS
--------------------------
{
  "operations": [
    {
      "id": "add-priority-tag",
      "type": "add-tag",
      "taskIds": ["1234567890", "9876543210"],
      "params": {
        "tagName": "priority:high"
      }
    }
  ]
}

REMOVE TAG FROM MULTIPLE TASKS
-------------------------------
{
  "operations": [
    {
      "id": "remove-priority-tag",
      "type": "remove-tag",
      "taskIds": ["1234567890", "9876543210"],
      "params": {
        "tagName": "priority:high"
      }
    }
  ]
}

SWAP TAGS (REMOVE ONE, ADD ANOTHER)
------------------------------------
{
  "operations": [
    {
      "id": "remove-low-priority",
      "type": "remove-tag",
      "taskIds": ["123", "456", "789"],
      "params": {"tagName": "priority:low"}
    },
    {
      "id": "add-high-priority",
      "type": "add-tag",
      "taskIds": ["123", "456", "789"],
      "params": {"tagName": "priority:high"}
    }
  ]
}

ADD MULTIPLE TAGS TO TASKS
---------------------------
{
  "operations": [
    {
      "id": "add-bug-tag",
      "type": "add-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "type:bug"}
    },
    {
      "id": "add-urgent-tag",
      "type": "add-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "urgent"}
    },
    {
      "id": "add-customer-tag",
      "type": "add-tag",
      "taskIds": ["123", "456"],
      "params": {"tagName": "customer-reported"}
    }
  ]
}

CATEGORIZE TASKS BASED ON QUERY
--------------------------------
# Find all tasks with "bug" in name and tag them
dm -o json list --search "bug" -i | jq '{
  operations: [{
    id: "tag-bugs",
    type: "add-tag",
    taskIds: [.tasks[].gid],
    params: {tagName: "type:bug"}
  }]
}' | dm batch execute
`;

    console.log(examples);
  }

  private async showUpdateExamples(): Promise<void> {
    const examples = `
Batch Update Examples
=====================

UPDATE TASK NAME AND NOTES
---------------------------
{
  "operations": [
    {
      "id": "update-task-details",
      "type": "update-task",
      "taskIds": ["1234567890"],
      "params": {
        "updates": {
          "name": "Updated task name",
          "notes": "Updated task description with more details"
        }
      }
    }
  ]
}

SET DUE DATES FOR MULTIPLE TASKS
---------------------------------
{
  "operations": [
    {
      "id": "set-due-dates",
      "type": "update-task",
      "taskIds": ["123", "456", "789"],
      "params": {
        "updates": {
          "dueOn": "2025-12-31"
        }
      }
    }
  ]
}

UPDATE PRIORITY LEVELS
----------------------
{
  "operations": [
    {
      "id": "set-high-priority",
      "type": "update-task",
      "taskIds": ["123", "456"],
      "params": {
        "updates": {
          "priority": "high"
        }
      }
    }
  ]
}

COMPREHENSIVE TASK UPDATE
--------------------------
{
  "operations": [
    {
      "id": "full-update",
      "type": "update-task",
      "taskIds": ["1234567890"],
      "params": {
        "updates": {
          "name": "Complete project documentation",
          "notes": "Write comprehensive docs covering all features",
          "startOn": "2025-10-01",
          "dueOn": "2025-10-15",
          "priority": "high"
        }
      }
    }
  ]
}

BULK UPDATE WITH WORKFLOW
--------------------------
# Update multiple tasks and move them to a section
{
  "operations": [
    {
      "id": "update-due-dates",
      "type": "update-task",
      "taskIds": ["123", "456", "789"],
      "params": {
        "updates": {
          "dueOn": "2025-11-30",
          "priority": "medium"
        }
      }
    },
    {
      "id": "move-to-sprint",
      "type": "move-section",
      "taskIds": ["123", "456", "789"],
      "params": {"sectionId": "999"}
    },
    {
      "id": "tag-sprint-2",
      "type": "add-tag",
      "taskIds": ["123", "456", "789"],
      "params": {"tagName": "sprint-2"}
    }
  ]
}
`;

    console.log(examples);
  }

  private async showComplexExamples(): Promise<void> {
    const examples = `
Complex Batch Workflow Examples
================================

FULL AGENT WORKFLOW AUTOMATION
-------------------------------
This example shows an agent:
1. Getting assigned tasks
2. Moving them to "In Progress"
3. Processing them (simulated)
4. Moving to "Done"
5. Completing and unassigning

# Step 1: Get your tasks
AGENT_NAME="myagent"
TASKS=$(dm -o json list --agent "$AGENT_NAME" -i)

# Step 2: Get section IDs
IN_PROGRESS=$(dm -o json section list | jq -r '.sections[] | select(.name=="In Progress") | .gid')
DONE=$(dm -o json section list | jq -r '.sections[] | select(.name=="Done") | .gid')

# Step 3: Start work - move to In Progress
echo "$TASKS" | jq --arg section "$IN_PROGRESS" '{
  operations: [{
    id: "start-work",
    type: "move-section",
    taskIds: [.tasks[].gid],
    params: {sectionId: $section}
  }]
}' | dm batch execute

# Step 4: ... do the actual work ...

# Step 5: Complete workflow - move to Done and complete
echo "$TASKS" | jq --arg section "$DONE" '{
  operations: [
    {
      id: "move-to-done",
      type: "move-section",
      taskIds: [.tasks[].gid],
      params: {sectionId: $section}
    },
    {
      id: "complete-tasks",
      type: "complete",
      taskIds: [.tasks[].gid]
    },
    {
      id: "unassign-agent",
      type: "unassign",
      taskIds: [.tasks[].gid]
    },
    {
      id: "add-completion-tag",
      type: "add-tag",
      taskIds: [.tasks[].gid],
      params: {tagName: "auto-completed"}
    }
  ]
}' | dm batch execute

PRIORITY-BASED TASK ROUTING
----------------------------
# Route tasks to different agents based on priority

# Get high priority tasks
HIGH=$(dm -o json list --priority high -i | jq '[.tasks[].gid]')
# Get medium priority tasks
MEDIUM=$(dm -o json list --priority medium -i | jq '[.tasks[].gid]')
# Get low priority tasks
LOW=$(dm -o json list --priority low -i | jq '[.tasks[].gid]')

# Route to different agents
jq -n --argjson high "$HIGH" --argjson med "$MEDIUM" --argjson low "$LOW" '{
  operations: [
    {
      id: "assign-high-to-senior",
      type: "assign",
      taskIds: $high,
      params: {agentName: "senior-agent"}
    },
    {
      id: "assign-medium-to-mid",
      type: "assign",
      taskIds: $med,
      params: {agentName: "mid-agent"}
    },
    {
      id: "assign-low-to-junior",
      type: "assign",
      taskIds: $low,
      params: {agentName: "junior-agent"}
    }
  ]
}' | dm batch execute

SCHEDULED TASK BATCH PROCESSING
--------------------------------
# Create a complete workflow for daily task processing

#!/bin/bash
# daily-task-processor.sh

AGENT="daily-bot"
DATE=$(date +%Y-%m-%d)

# Get overdue tasks
OVERDUE=$(dm -o json list --agent "$AGENT" -i | \\
  jq --arg today "$DATE" '[.tasks[] | select(.dueOn < $today) | .gid]')

# Get today's tasks
TODAY=$(dm -o json list --agent "$AGENT" -i | \\
  jq --arg today "$DATE" '[.tasks[] | select(.dueOn == $today) | .gid]')

# Process overdue tasks - escalate
if [ "$OVERDUE" != "[]" ]; then
  echo "$OVERDUE" | jq '{
    operations: [
      {
        id: "tag-overdue",
        type: "add-tag",
        taskIds: .,
        params: {tagName: "overdue"}
      },
      {
        id: "escalate-priority",
        type: "update-task",
        taskIds: .,
        params: {updates: {priority: "high"}}
      },
      {
        id: "unassign-for-review",
        type: "unassign",
        taskIds: .
      }
    ]
  }' | dm batch execute
fi

# Process today's tasks - start work
if [ "$TODAY" != "[]" ]; then
  IN_PROGRESS=$(dm -o json section list | jq -r '.sections[] | select(.name=="In Progress") | .gid')

  echo "$TODAY" | jq --arg section "$IN_PROGRESS" '{
    operations: [
      {
        id: "move-to-in-progress",
        type: "move-section",
        taskIds: .,
        params: {sectionId: $section}
      },
      {
        id: "tag-today",
        type: "add-tag",
        taskIds: .,
        params: {tagName: "processing-today"}
      }
    ]
  }' | dm batch execute
fi

CONDITIONAL BATCH PROCESSING WITH ERROR HANDLING
-------------------------------------------------
# Process batch and handle failures

RESULT=$(dm batch execute -f operations.json)

# Check if any operations failed
FAILED=$(echo "$RESULT" | jq '.failedOperations')

if [ "$FAILED" -gt 0 ]; then
  echo "Some operations failed. Retrying failed tasks..."

  # Extract failed task IDs
  FAILED_TASKS=$(echo "$RESULT" | jq '[.results[].taskResults[]? | select(.success == false) | .taskId]')

  # Retry with alternative approach
  echo "$FAILED_TASKS" | jq '{
    operations: [{
      id: "retry-failed",
      type: "add-tag",
      taskIds: .,
      params: {tagName: "needs-manual-review"}
    }]
  }' | dm batch execute
else
  echo "All operations succeeded!"
fi
`;

    console.log(examples);
  }

  private async showAllExamples(): Promise<void> {
    console.log('\n=== BATCH OPERATION EXAMPLES ===\n');
    console.log('For focused examples, use:');
    console.log('  dm batch examples assign   - Assignment examples');
    console.log('  dm batch examples workflow - Workflow examples');
    console.log('  dm batch examples complete - Completion examples');
    console.log('  dm batch examples tags     - Tag management examples');
    console.log('  dm batch examples update   - Update task examples');
    console.log('  dm batch examples complex  - Complex workflow examples');
    console.log('\nFor JSON schema: dm batch schema\n');

    await this.showAssignExamples();
    await this.showWorkflowExamples();
    await this.showCompleteExamples();
    await this.showTagExamples();
    await this.showUpdateExamples();
    await this.showComplexExamples();
  }
}
