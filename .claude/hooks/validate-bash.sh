#!/bin/bash
# Pre-tool hook: Block destructive database commands
# Exit 0 = allow, Exit 2 = block (with message to stderr)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block destructive SQL commands
if echo "$COMMAND" | grep -qiE '(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+|DELETE\s+FROM)'; then
  echo "BLOCKED: Destructive database command detected. Use a migration instead." >&2
  exit 2
fi

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push.*--force.*(main|master)'; then
  echo "BLOCKED: Force push to main/master is not allowed." >&2
  exit 2
fi

exit 0
