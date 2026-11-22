# Codegeist 2026 submission checklist — Triage Lens

Deadline: **Tue 22 Dec 2026 12:00 PT (Wed 23 Dec 03:00 WIB)**.
Devpost page: https://codegeist2026.devpost.com/

## What to submit on Devpost

- **Category:** Apps for Software Teams
- **Bonus prizes (both):** Best app with Atlassian MCP, Best Agents -
  Rovo/Assignable agents
- **Access:** installation link for the judges (create it from the developer
  console: your app > Distribution > Share, per Atlassian's "Start sharing
  your app" guide). Judges need a working install link, not just the repo.
- **Demo video:** public YouTube, under 5 minutes — see DEMO-SCRIPT.md.
- **Explanation:** how the project meets the technology requirement. Short
  version: a Forge app with a `rovo:mcp` module exposing four read-only
  Jira triage tools, a `rovo:agent` module using those tools, and a
  `jira:issuePanel` UI Kit 2 panel showing the same data in Jira. No Forge
  LLM calls anywhere; triage suggestions are deterministic rules.
- **Repository:** public GitHub repo under `rieee-delrey`, with the MIT
  LICENSE already in this folder. The repo must be public before
  submitting, and the submitted code must be the code that is deployed.

## Farhan's half (in order)

1. [x] Devpost account — done 2026-11-22
2. [x] Atlassian developer account — done 2026-11-22
3. [ ] Push this folder to a new public GitHub repo under `rieee-delrey`
    (the `gh` CLI on this machine is not logged in, so this is yours).
4. [ ] Create a free Atlassian dev site if you do not have one yet
    (developer.atlassian.com > My apps > create a site), with Jira.
5. [ ] `forge login`, then in `triage-lens`: `forge deploy`, `forge install`
    (pick Jira + your dev site). Create a few test issues first, some
    untouched for weeks, one unassigned, one blocked, so the demo has real
    stale work to show.
6. [ ] Test the four tools in Rovo Studio and the issue panel in Jira
    (steps in README.md). Fix anything that fails and redeploy.
7. [ ] Record the demo video (DEMO-SCRIPT.md), upload it public to your
    YouTube channel "Rie".
8. [ ] Create the installation link for judges and fill in the Devpost
    submission form before the deadline. Do not leave it to the last day:
    the install link and the video are the two things that most often go
    wrong late.

## What is already done (agent, 2026-11-22)

- App built: manifest, four MCP tools, Rovo agent, Jira issue panel.
- 17/17 unit tests pass; frontend bundles clean; manifest cross-references
  validated. `forge lint`/`deploy` were NOT run: the Forge CLI requires a
  login, and there are no credentials on this machine.
- No accounts created, no submissions made, no money spent.
