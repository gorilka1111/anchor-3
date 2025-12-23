# Project Save Points

This document tracks manual save points (Git Commits) created during development. You can revert to any of these points if a critical failure occurs.

## How to Revert
To revert the project to a specific save point, open a terminal in the project directory and run:

```powershell
git reset --hard <COMMIT_HASH>
```

**WARNING:** This will discard all changes made *after* that save point.

## Save History

| Date | Commit Hash | Description |
| :--- | :--- | :--- |
| **Current** | `ce8572c` | **Anchor Grouping & Refinements**<br>Added grouping (Ctrl+G), context menu separators, smart RMB click vs pan, and Undo/Redo. |
| Previous | `5bd7ed4` | **Implemented Individual Anchor Settings**<br>Added right-click context menu, custom radius, and shape overrides. |
| Previous | `9c49389` | **Manual Save Point**<br>Previous working state before anchor settings. |

## Creating New Save Points
To create a new save point manually (if not done by the assistant):

```powershell
git add .
git commit -m "Manual Save Point: <Description>"
```
