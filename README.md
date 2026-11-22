# Triage Lens — Codegeist 2026 entry

A Forge app that turns Jira triage into tools an AI agent can call.

**What it does.** Teams lose track of issues that go quiet. Triage Lens finds
them, explains them, and suggests the next action, using deterministic rules
only. No language model calls, no Forge LLM usage, no writing to Jira at all:
every tool is read-only.

**Four MCP tools** (exposed through the `rovo:mcp` module, usable in Rovo
Studio and in third-party MCP clients at
`https://mcp.atlassian.com/forge/<appId>`):
- `find-stale-issues` — open issues not updated in the last N days (default
  14), stalest first, optionally filtered by project.
- `get-issue-context` — full context for one issue: status, type, priority,
  assignee, dates, comment count, linked issues, blockers.
- `triage-suggest` — rule-based triage suggestions for one issue: assign an
  owner, unblock, ping, escalate, or close as stale. Same issue, same
  suggestions, every time.
- `list-my-open-issues` — the open issues assigned to the user asking.

**One Rovo agent** (`rovo:agent` module, "Triage Lens Agent") that uses the
same four tools, with conversation starters for stale work, single-issue
triage, and the user's own open issues.

**One Jira issue panel** (`jira:issuePanel`, UI Kit 2) that shows the
staleness, assignee, comments and blockers of the issue it is opened on.

**Target.** Codegeist 2026, category *Apps for Software Teams*, bonus prizes
*Best app with Atlassian MCP* and *Best Agents - Rovo/Assignable agents*.
Submissions close 22 Dec 2026 12:00 PT (23 Dec 03:00 WIB).

## Project layout

- `manifest.yml` — app definition: `rovo:mcp`, `rovo:agent`, `action`,
  `jira:issuePanel`, `function`, `resources`, permissions (`read:jira-work`).
- `src/triage.js` — pure triage logic (JQL building, issue summarising,
  suggestion rules). No Forge imports, fully unit-tested.
- `src/jira.js` — thin Jira API layer (`asUser`, search/jql + issue fetch).
- `src/index.js` — the four action functions and the panel resolver.
- `src/frontend/index.jsx` — the UI Kit 2 issue panel.
- `test/triage.test.js` — 17 unit tests for the pure logic (`npm test`).

## What is tested here, and what is not

Tested locally (this machine, 2026-11-22):
- `npm test` — 17/17 unit tests pass.
- `node --check` on all backend files.
- esbuild bundle of the UI Kit 2 frontend — compiles clean.
- Manifest structure validated: every module cross-reference resolves, one
  `rovo:mcp` module, agent actions reference real actions, panel resolver
  and resource exist, scopes and runtime correct.

NOT tested (needs an Atlassian account and a dev site — Farhan's half):
- `forge deploy` / `forge install` / `forge tunnel` (the Forge CLI here
  refuses to run without a login).
- The tools running against a real Jira site, the Rovo agent in Rovo Studio,
  the external MCP endpoint, and the issue panel rendering in Jira.

## Deploy and test (Farhan, with your own login)

Prerequisites: Node.js 22+, the Forge CLI, your Atlassian developer account
and a free dev site, and this repo pushed to public GitHub under
`rieee-delrey` (see SUBMISSION.md).

```bash
npm install -g @forge/cli@latest
cd triage-lens
npm install
forge login
forge deploy
forge install
# pick Jira, then your dev site URL (example.atlassian.net)
```

Then:
1. In Jira, open any issue, add the Triage Lens panel from the ••• menu,
   and check it shows staleness, assignee, comments and blockers.
2. In Rovo (Ask Rovo), create an agent, add the Triage Lens tools, and ask
   "What work has gone stale in my project?" and "Triage SCRUM-123".
3. To expose the tools to an external MCP client: Atlassian Administration
   > Apps > Sites > your site > Connected apps > Triage Lens, turn on the
   tools, then add `https://mcp.atlassian.com/forge/<appId>` as a remote MCP
   server (appId is the UUID in `manifest.yml`, after `app/`).
4. Record the demo video following DEMO-SCRIPT.md (under 5 minutes,
   public YouTube).

## Notes

- The app never writes to Jira and never calls a language model. All four
  actions use `actionVerb: GET`.
- The Forge CLI on this machine was installed with `--ignore-scripts`
  because the sandbox blocks the `chown` syscalls the `keytar` native
  module build needs. CLI commands that do not need login (`--version`,
  `--help`) work; `lint`/`deploy` need a login and were not run here.
