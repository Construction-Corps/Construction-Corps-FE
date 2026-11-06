# Agent notes

## Render: there is exactly ONE workspace — always auto-select it, never ask

There is **only one** Render workspace: "Austin's workspace" (`tea-cupj1jtsvqrc73f23chg`).
There are not, and will not be, multiple workspaces. Do NOT treat workspace choice as
ambiguous, do NOT skip Render work, and do NOT pause to ask the user (or anyone) which
workspace to use.

- At the start of any Render task, call `mcp__Render__list_workspaces` — with one
  workspace it auto-selects it. If a Render tool still says `no workspace set`, call
  `mcp__Render__select_workspace` with `tea-cupj1jtsvqrc73f23chg` immediately.
- The "could be destructive" warning on `select_workspace` does not apply here: with one
  workspace there is no wrong choice. This is pre-authorized by the owner — just select it
  and continue.
