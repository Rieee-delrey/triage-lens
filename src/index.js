// Forge entry point for Triage Lens.
//
// Four action functions back the rovo:mcp tools, and one resolver backs the
// Jira issue panel. All four actions and the panel share the same internal
// helpers, so the panel and the MCP tools can never disagree about an issue.
//
// No Forge LLM calls anywhere in this app. Triage suggestions are computed
// by deterministic rules in triage.js.

import Resolver from '@forge/resolver';
import { fetchIssue, searchIssues } from './jira.js';
import {
  buildMyOpenJql,
  buildStaleJql,
  normaliseDaysStale,
  normaliseMaxResults,
  summarizeIssue,
  triageSuggestions,
  validateIssueKey,
} from './triage.js';

function nowIso() {
  return new Date().toISOString();
}

async function runFindStaleIssues(payload) {
  const daysStale = normaliseDaysStale(payload.daysStale);
  const maxResults = normaliseMaxResults(payload.maxResults);
  const jql = buildStaleJql({ projectKey: payload.projectKey, daysStale });
  const issues = await searchIssues(jql, maxResults);
  const now = nowIso();
  return {
    jql,
    count: issues.length,
    issues: issues.map((issue) => summarizeIssue(issue, now)),
  };
}

async function runGetIssueContext(payload) {
  const issueKey = validateIssueKey(payload.issueKey);
  const issue = await fetchIssue(issueKey);
  if (!issue) {
    return { found: false, issueKey, message: `No issue found with key ${issueKey}.` };
  }
  return { found: true, issue: summarizeIssue(issue, nowIso()) };
}

async function runTriageSuggest(payload) {
  const issueKey = validateIssueKey(payload.issueKey);
  const issue = await fetchIssue(issueKey);
  if (!issue) {
    return { found: false, issueKey, message: `No issue found with key ${issueKey}.` };
  }
  const summary = summarizeIssue(issue, nowIso());
  return { found: true, issue: summary, suggestions: triageSuggestions(summary) };
}

async function runListMyOpenIssues(payload) {
  const maxResults = normaliseMaxResults(payload.maxResults);
  const jql = buildMyOpenJql();
  const issues = await searchIssues(jql, maxResults);
  const now = nowIso();
  return {
    jql,
    count: issues.length,
    issues: issues.map((issue) => summarizeIssue(issue, now)),
  };
}

// Action functions, one per rovo:mcp tool. The payload carries the action
// inputs declared in manifest.yml, plus a context object.
export async function findStaleIssues(payload) {
  return runFindStaleIssues(payload || {});
}

export async function getIssueContext(payload) {
  return runGetIssueContext(payload || {});
}

export async function triageSuggest(payload) {
  return runTriageSuggest(payload || {});
}

export async function listMyOpenIssues(payload) {
  return runListMyOpenIssues(payload || {});
}

// Resolver for the Jira issue panel frontend (invoke('getIssueContext')).
const resolver = new Resolver();

resolver.define('getIssueContext', async (req) => {
  const payload = req.payload || {};
  return runGetIssueContext(payload);
});

export const handler = resolver.getDefinitions();
