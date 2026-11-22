// Pure triage logic for Triage Lens. No Forge imports here, so every function
// in this file is unit-testable with plain node. All date math uses the
// caller-supplied "now" so tests are deterministic.

export const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]*-\d+$/;

export const DEFAULT_DAYS_STALE = 14;
export const DEFAULT_MAX_RESULTS = 10;
export const MAX_RESULTS_LIMIT = 50;

/**
 * Validate and normalise a Jira issue key. Throws on anything that is not
 * a plain PROJECT-123 key, so a bad key can never reach the Jira API.
 */
export function validateIssueKey(issueKey) {
  if (typeof issueKey !== 'string') {
    throw new Error('issueKey must be a string like SCRUM-123');
  }
  const key = issueKey.trim().toUpperCase();
  if (!ISSUE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid issue key: ${issueKey}. Expected a key like SCRUM-123.`);
  }
  return key;
}

/** Validate and normalise a project key (letters and digits, uppercased). */
export function validateProjectKey(projectKey) {
  if (projectKey === undefined || projectKey === null || projectKey === '') {
    return null;
  }
  if (typeof projectKey !== 'string') {
    throw new Error('projectKey must be a string');
  }
  const key = projectKey.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*$/.test(key)) {
    throw new Error(`Invalid project key: ${projectKey}. Expected letters and digits only.`);
  }
  return key;
}

/** Clamp daysStale to 1..365, defaulting to DEFAULT_DAYS_STALE. */
export function normaliseDaysStale(daysStale) {
  if (daysStale === undefined || daysStale === null || daysStale === '') {
    return DEFAULT_DAYS_STALE;
  }
  const n = Number(daysStale);
  if (!Number.isFinite(n)) {
    throw new Error(`daysStale must be a number, got: ${daysStale}`);
  }
  return Math.min(365, Math.max(1, Math.floor(n)));
}

/** Clamp maxResults to 1..50, defaulting to DEFAULT_MAX_RESULTS. */
export function normaliseMaxResults(maxResults) {
  if (maxResults === undefined || maxResults === null || maxResults === '') {
    return DEFAULT_MAX_RESULTS;
  }
  const n = Number(maxResults);
  if (!Number.isFinite(n)) {
    throw new Error(`maxResults must be a number, got: ${maxResults}`);
  }
  return Math.min(MAX_RESULTS_LIMIT, Math.max(1, Math.floor(n)));
}

/** Whole days between two ISO date strings (end - start). */
export function daysBetween(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

/** Build the JQL for stale open issues. */
export function buildStaleJql({ projectKey, daysStale }) {
  const project = validateProjectKey(projectKey);
  const days = normaliseDaysStale(daysStale);
  const conditions = [];
  if (project) {
    conditions.push(`project = ${project}`);
  }
  conditions.push('statusCategory != Done');
  conditions.push(`updated < -${days}d`);
  return `${conditions.join(' AND ')} ORDER BY updated ASC`;
}

/** JQL for the current user's open issues, stalest first. */
export function buildMyOpenJql() {
  return 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated ASC';
}

/**
 * Reduce a raw Jira issue (as returned by the search/jql endpoint) to the
 * small, stable shape the tools return. Never passes raw Jira payloads
 * through, so tool output stays small and predictable.
 */
export function summarizeIssue(issue, nowIso) {
  const fields = issue.fields || {};
  const status = fields.status || {};
  const assignee = fields.assignee || null;
  const priority = fields.priority || null;
  const issueType = fields.issuetype || null;
  const updated = fields.updated || null;
  const created = fields.created || null;
  const commentTotal =
    fields.comment && typeof fields.comment.total === 'number' ? fields.comment.total : 0;
  const links = Array.isArray(fields.issuelinks) ? fields.issuelinks : [];

  return {
    key: issue.key,
    summary: fields.summary || '',
    status: status.name || 'Unknown',
    statusCategory: (status.statusCategory && status.statusCategory.name) || 'Unknown',
    type: issueType ? issueType.name : 'Unknown',
    priority: priority ? priority.name : 'None',
    assignee: assignee ? assignee.displayName : null,
    assigneeAccountId: assignee ? assignee.accountId : null,
    reporter: fields.reporter ? fields.reporter.displayName : null,
    created,
    updated,
    daysStale: updated && nowIso ? daysBetween(updated, nowIso) : null,
    commentCount: commentTotal,
    linkedIssueCount: links.length,
    blockedBy: links
      .filter((link) => link.type && link.type.name === 'Blocks' && link.outwardIssue)
      .map((link) => ({
        key: link.outwardIssue.key,
        summary: (link.outwardIssue.fields && link.outwardIssue.fields.summary) || '',
        status:
          (link.outwardIssue.fields &&
            link.outwardIssue.fields.status &&
            link.outwardIssue.fields.status.name) ||
          'Unknown',
      })),
  };
}

/**
 * Deterministic triage suggestions for one summarised issue. Rules only, no
 * language model: the same issue always produces the same suggestions, in
 * the same order, highest severity first.
 *
 * Severity scale: high (act this week), medium (act soon), low (nice to do).
 */
export function triageSuggestions(summary) {
  const suggestions = [];
  const daysStale = summary.daysStale === null ? 0 : summary.daysStale;
  const isDone = summary.statusCategory === 'Done';

  if (isDone) {
    return [
      {
        action: 'Nothing to do',
        reason: 'This issue is already in a Done status category.',
        severity: 'low',
      },
    ];
  }

  if (summary.blockedBy.length > 0) {
    const openBlockers = summary.blockedBy.filter((b) => b.status !== 'Done');
    if (openBlockers.length > 0) {
      suggestions.push({
        action: `Unblock: resolve ${openBlockers.map((b) => b.key).join(', ')} first`,
        reason: `This issue is blocked by ${openBlockers.length} unresolved issue(s). Work on the blocker before this one.`,
        severity: 'high',
      });
    }
  }

  if (!summary.assignee) {
    suggestions.push({
      action: 'Assign an owner',
      reason: 'No one is assigned, so nobody is responsible for moving this forward.',
      severity: daysStale >= 14 ? 'high' : 'medium',
    });
  }

  if (daysStale >= 90) {
    suggestions.push({
      action: 'Close as stale, or re-confirm it still matters',
      reason: `No update in ${daysStale} days. Either the work is dead and should be closed, or someone should confirm it is still wanted.`,
      severity: 'medium',
    });
  } else if (daysStale >= 30) {
    suggestions.push({
      action: 'Ping the assignee for a status update',
      reason: `No update in ${daysStale} days. A short check-in will show whether it is stuck or just deprioritised.`,
      severity: 'medium',
    });
  }

  if (summary.priority === 'Highest' || summary.priority === 'High') {
    if (daysStale >= 7) {
      suggestions.push({
        action: 'Escalate: high priority and going quiet',
        reason: `Priority is ${summary.priority} but there has been no update in ${daysStale} days. Raise it in the next stand-up.`,
        severity: 'high',
      });
    }
  }

  if (summary.commentCount === 0 && daysStale >= 14) {
    suggestions.push({
      action: 'Add a comment with the current state',
      reason: 'No comments at all, so nobody reading this issue can tell what has happened so far.',
      severity: 'low',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      action: 'No action needed',
      reason: `This issue looks healthy: updated ${daysStale} day(s) ago, assigned, and not blocked.`,
      severity: 'low',
    });
  }

  return suggestions;
}
