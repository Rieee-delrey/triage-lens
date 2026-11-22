// Thin Jira API layer for Triage Lens. All Jira calls go through here and
// nowhere else, so the Forge functions in index.js stay small and the API
// surface is easy to audit. Uses asUser() so every call respects the
// invoking user's own Jira permissions.

import api, { route } from '@forge/api';

const ISSUE_FIELDS = [
  'summary',
  'status',
  'assignee',
  'reporter',
  'created',
  'updated',
  'priority',
  'issuetype',
  'comment',
  'issuelinks',
];

async function requestJson(response, what) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira request failed for ${what}: HTTP ${response.status} ${body.slice(0, 200)}`);
  }
  return response.json();
}

/** Run a JQL search and return the raw issues array. */
export async function searchIssues(jql, maxResults) {
  const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, maxResults, fields: ISSUE_FIELDS }),
  });
  const data = await requestJson(response, `JQL search (${jql})`);
  return Array.isArray(data.issues) ? data.issues : [];
}

/** Fetch one issue by key with the fields the triage logic needs. */
export async function fetchIssue(issueKey) {
  const response = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  );
  if (response.status === 404) {
    return null;
  }
  const data = await requestJson(response, `issue ${issueKey}`);
  return data;
}
