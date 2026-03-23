---
name: feedback_worktrees_location
description: Git worktrees must be created inside ./worktrees/ within the project root, not a sibling directory
type: feedback
---

Use worktrees/ inside the project root for all parallel task execution, not ../project-worktrees/.

**Why:** User preference for keeping worktrees co-located with the project rather than as sibling directories.

**How to apply:** When creating git worktrees for parallel work, always use `./worktrees/<branch-name>` relative to the project root.
