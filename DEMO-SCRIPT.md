# Demo video script — Triage Lens (under 5 minutes)

Record after the app is deployed and installed on your dev site, with a few
test issues prepared: one untouched for weeks, one unassigned, one blocked
by another issue, one healthy and recently updated. Screen-record Jira and
Rovo; narrate in your own words. Keep it under 5 minutes, upload public
to YouTube.

## 0:00–0:30 — The problem
"Teams lose track of issues that go quiet. An issue nobody touched in weeks
sits there, nobody owns it, nobody knows it is stuck. Triage Lens finds
that work and tells you what to do with it."

## 0:30–1:30 — The issue panel in Jira
Open a stale test issue in Jira. Add the Triage Lens panel from the •••
menu. Point at what it shows: days since last update, assignee (or
unassigned), comment count, and the blocked-by warning on the blocked
issue. Say: "Same data the agent tools use, right inside the issue."

## 1:30–3:00 — The Rovo agent
Open Ask Rovo, pick the Triage Lens Agent. Ask: "What work has gone stale
in my project?" Show it calling the tool and listing the stalest issues
first with keys and days stale. Then ask: "Triage SCRUM-123" (your blocked
test issue) and show the suggestions: resolve the blocker first, assign an
owner. Then ask: "What are my open issues?" Show your own list.

## 3:00–4:00 — The MCP part (the bonus prize)
Briefly show the external MCP angle: Atlassian Administration > Connected
apps > Triage Lens, tools turned on, and the endpoint
`https://mcp.atlassian.com/forge/<appId>` added as a remote MCP server in
an MCP client (Claude Code or similar). One call to `find-stale-issues`
from the client. Say: "Same four tools, any MCP client, not just Rovo."

## 4:00–4:30 — How it works, honestly
"Everything is read-only, it never changes your issues. The suggestions
are rules, not a language model: unassigned plus stale means assign an
owner, blocked means fix the blocker first, 90 days quiet means close it
or confirm it still matters. Same issue, same answer, every time."

## 4:30–5:00 — Close
"This is Triage Lens, built for Codegeist 2026, Apps for Software Teams,
for the Best app with Atlassian MCP and Best Agents bonus prizes."
Show the repo link on screen.
