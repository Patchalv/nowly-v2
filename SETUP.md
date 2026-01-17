# Agent Configuration Setup Guide

This folder contains agent configuration files for Nowly v2. Follow these steps to set up your development environment for optimal AI-assisted development.

## Quick Start

### 1. Install Vercel React Best Practices Skill (Recommended)

This provides 40+ React/Next.js performance rules that complement the Nowly-specific configuration:

```bash
# Install globally for all projects
npx add-skill vercel-labs/agent-skills --skill react-best-practices -g -a claude-code -a cursor -y
```

### 2. Copy Agent Configuration to Your Project

```bash
# From the root of your new Nowly v2 project
cp -r /path/to/nowly-v2-agent-config/* .
```

Or manually copy these files:

```
your-project/
├── AGENTS.md           # Universal agent instructions
├── CLAUDE.md           # Claude Code compatibility (points to AGENTS.md)
├── .cursor/
│   └── rules/
│       ├── index.mdc           # Always-applied global rules
│       ├── react-components.mdc # Component-specific rules
│       ├── supabase.mdc        # Database/auth rules
│       └── tasks-feature.mdc   # Task feature rules
└── docs/
    ├── DATABASE.md     # Complete schema documentation
    ├── PATTERNS.md     # Code patterns to copy
    └── ARCHITECTURE.md # Why decisions were made
```

### 3. Verify Setup

**For Claude Code:**
```bash
cd your-project
claude  # Start Claude Code
# Type: "What do you know about this project?"
# Claude should reference AGENTS.md content
```

**For Cursor:**
1. Open project in Cursor
2. Check Settings > Rules to verify rules loaded
3. Ask: "Summarize the project rules"

## File Purposes

| File | Purpose | When Loaded |
|------|---------|-------------|
| `AGENTS.md` | Universal agent instructions | Always (by convention) |
| `CLAUDE.md` | Claude Code entry point | Always by Claude Code |
| `.cursor/rules/index.mdc` | Global Cursor rules | Always in Cursor |
| `.cursor/rules/*.mdc` | Context-specific rules | When matching globs |
| `docs/*.md` | Detailed documentation | When agents need deep context |

## How Rules Are Loaded

### Claude Code
1. Reads `CLAUDE.md` from project root
2. `CLAUDE.md` points to `AGENTS.md`
3. Agent follows instructions in `AGENTS.md`
4. References `docs/` files when needed

### Cursor
1. Always applies `.cursor/rules/index.mdc`
2. Auto-attaches rules matching current file's glob patterns
3. Example: Editing `src/components/features/tasks/TaskCard.tsx`
   - Loads `index.mdc` (always)
   - Loads `react-components.mdc` (matches `src/components/**/*.tsx`)
   - Loads `tasks-feature.mdc` (matches `src/components/features/tasks/**/*`)

### Antigravity / Other Agents
Most agents recognize `AGENTS.md` as a standard. If not:
1. Create a tool-specific config that references `AGENTS.md`
2. Or paste `AGENTS.md` content into the tool's rules/instructions

## Customization

### Adding New Rules

**For a new feature (e.g., calendar):**

```bash
# Create Cursor rule
touch .cursor/rules/calendar-feature.mdc
```

```yaml
---
description: Rules for calendar feature
globs:
  - src/components/features/calendar/**/*
  - src/hooks/use*Calendar*.ts
alwaysApply: false
---

# Calendar Feature Rules

## Your rules here...
```

### Updating AGENTS.md

Keep it concise! If adding detailed information:
1. Create a new file in `docs/`
2. Reference it from `AGENTS.md`

```markdown
| Area | File | When to read |
|------|------|--------------|
| Calendar views | `docs/CALENDAR.md` | Working on calendar features |
```

## Vercel Skill + Nowly Config Interaction

The Vercel React Best Practices skill provides **general** React/Next.js performance guidance:
- Eliminate async waterfalls
- Reduce bundle size
- Re-render optimization
- Server-side performance

The Nowly configuration provides **specific** project guidance:
- Scheduled vs due date distinction
- Recurring task architecture
- Supabase patterns
- Component structure

**They complement each other** — no conflict. The Vercel skill catches general React anti-patterns, while Nowly config ensures domain-specific patterns are followed.

## Troubleshooting

### Claude Code ignores CLAUDE.md
- Ensure `CLAUDE.md` is in project root
- Restart Claude Code session
- Check file permissions

### Cursor rules not loading
- Verify `.cursor/rules/` directory exists
- Check glob patterns match your file paths
- Rules only load when editing matching files

### Agent not following instructions
- Instructions may be too verbose — simplify
- Move detailed info to `docs/` files
- Check for conflicting rules

## Best Practices for Agent Instructions

1. **Be concise** — Agents have limited context windows
2. **Use examples** — Show, don't just tell
3. **Prioritize** — Put critical rules first
4. **Reference, don't embed** — Point to detailed docs
5. **Update iteratively** — Add rules as patterns emerge
