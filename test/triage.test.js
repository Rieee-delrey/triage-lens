// Unit tests for the pure triage logic in src/triage.js.
// Run with: npm test   (node --test, no dependencies needed)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMyOpenJql,
  buildStaleJql,
  daysBetween,
  normaliseDaysStale,
  normaliseMaxResults,
  summarizeIssue,
  triageSuggestions,
  validateIssueKey,
  validateProjectKey,
} from '../src/triage.js';

const NOW = '2026-11-22T00:00:00.000Z';

function fixtureIssue(overrides = {}) {
  return {
    key: 'SCRUM-123',
    fields: {
      summary: 'Fix the flaky login test',
      status: { name: 'In Progress', statusCategory: { name: 'In Progress' } },
      assignee: { displayName: 'Farhan', accountId: 'account-1' },
      reporter: { displayName: 'Rie' },
      created: '2026-10-01T00:00:00.000Z',
      updated: '2026-11-01T00:00:00.000Z',
      priority: { name: 'Medium' },
      issuetype: { name: 'Bug' },
      comment: { total: 3 },
      issuelinks: [],
      ...overrides,
    },
  };
}

test('validateIssueKey accepts PROJECT-123 and normalises case', () => {
  assert.equal(validateIssueKey('scrum-123'), 'SCRUM-123');
  assert.equal(validateIssueKey('ABC-1'), 'ABC-1');
});

test('validateIssueKey rejects garbage so it never reaches the Jira API', () => {
  assert.throws(() => validateIssueKey('not-a-key'), /Invalid issue key/);
  assert.throws(() => validateIssueKey('SCRUM-123; DROP TABLE'), /Invalid issue key/);
  assert.throws(() => validateIssueKey(''), /Invalid issue key/);
  assert.throws(() => validateIssueKey(123), /must be a string/);
});

test('validateProjectKey returns null for empty, uppercases the rest', () => {
  assert.equal(validateProjectKey(undefined), null);
  assert.equal(validateProjectKey(''), null);
  assert.equal(validateProjectKey('scrum'), 'SCRUM');
  assert.throws(() => validateProjectKey('bad key!'), /Invalid project key/);
});

test('normaliseDaysStale defaults to 14 and clamps to 1..365', () => {
  assert.equal(normaliseDaysStale(undefined), 14);
  assert.equal(normaliseDaysStale(0), 1);
  assert.equal(normaliseDaysStale(999), 365);
  assert.equal(normaliseDaysStale(30), 30);
  assert.throws(() => normaliseDaysStale('soon'), /must be a number/);
});

test('normaliseMaxResults defaults to 10 and clamps to 1..50', () => {
  assert.equal(normaliseMaxResults(undefined), 10);
  assert.equal(normaliseMaxResults(0), 1);
  assert.equal(normaliseMaxResults(500), 50);
});

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween('2026-11-01T00:00:00.000Z', NOW), 21);
  assert.equal(daysBetween('2026-11-22T00:00:00.000Z', NOW), 0);
  assert.equal(daysBetween('not-a-date', NOW), null);
});

test('buildStaleJql composes the right JQL with and without a project', () => {
  assert.equal(
    buildStaleJql({ projectKey: 'scrum', daysStale: 14 }),
    'project = SCRUM AND statusCategory != Done AND updated < -14d ORDER BY updated ASC'
  );
  assert.equal(
    buildStaleJql({ projectKey: undefined, daysStale: 30 }),
    'statusCategory != Done AND updated < -30d ORDER BY updated ASC'
  );
});

test('buildMyOpenJql uses currentUser() and skips resolved issues', () => {
  assert.equal(
    buildMyOpenJql(),
    'assignee = currentUser() AND resolution = Unresolved ORDER BY updated ASC'
  );
});

test('summarizeIssue reduces a raw issue to the stable tool shape', () => {
  const summary = summarizeIssue(fixtureIssue(), NOW);
  assert.equal(summary.key, 'SCRUM-123');
  assert.equal(summary.summary, 'Fix the flaky login test');
  assert.equal(summary.status, 'In Progress');
  assert.equal(summary.assignee, 'Farhan');
  assert.equal(summary.daysStale, 21);
  assert.equal(summary.commentCount, 3);
  assert.equal(summary.linkedIssueCount, 0);
  assert.deepEqual(summary.blockedBy, []);
});

test('summarizeIssue handles missing assignee and missing fields', () => {
  const summary = summarizeIssue(
    fixtureIssue({ assignee: null, comment: { total: 0 } }),
    NOW
  );
  assert.equal(summary.assignee, null);
  assert.equal(summary.commentCount, 0);
});

test('summarizeIssue picks up outward Blocks links as blockers', () => {
  const summary = summarizeIssue(
    fixtureIssue({
      issuelinks: [
        {
          type: { name: 'Blocks' },
          outwardIssue: {
            key: 'SCRUM-99',
            fields: { summary: 'Deploy the new API', status: { name: 'To Do' } },
          },
        },
      ],
    }),
    NOW
  );
  assert.equal(summary.linkedIssueCount, 1);
  assert.deepEqual(summary.blockedBy, [
    { key: 'SCRUM-99', summary: 'Deploy the new API', status: 'To Do' },
  ]);
});

test('triageSuggestions: healthy issue needs no action', () => {
  const summary = summarizeIssue(
    fixtureIssue({ updated: '2026-11-21T00:00:00.000Z' }),
    NOW
  );
  const suggestions = triageSuggestions(summary);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].action, 'No action needed');
});

test('triageSuggestions: unassigned stale issue must get an owner', () => {
  const summary = summarizeIssue(
    fixtureIssue({ assignee: null, updated: '2026-10-01T00:00:00.000Z' }),
    NOW
  );
  const suggestions = triageSuggestions(summary);
  assert.ok(suggestions.some((s) => s.action === 'Assign an owner'));
  assert.equal(suggestions[0].severity, 'high');
});

test('triageSuggestions: 90+ days stale suggests closing', () => {
  const summary = summarizeIssue(
    fixtureIssue({ updated: '2026-08-01T00:00:00.000Z' }),
    NOW
  );
  const suggestions = triageSuggestions(summary);
  assert.ok(suggestions.some((s) => s.action.startsWith('Close as stale')));
});

test('triageSuggestions: high priority going quiet escalates', () => {
  const summary = summarizeIssue(
    fixtureIssue({ priority: { name: 'Highest' }, updated: '2026-11-01T00:00:00.000Z' }),
    NOW
  );
  const suggestions = triageSuggestions(summary);
  assert.ok(suggestions.some((s) => s.action.startsWith('Escalate')));
});

test('triageSuggestions: done issue is a no-op', () => {
  const summary = summarizeIssue(
    fixtureIssue({ status: { name: 'Done', statusCategory: { name: 'Done' } } }),
    NOW
  );
  const suggestions = triageSuggestions(summary);
  assert.deepEqual(suggestions, [
    {
      action: 'Nothing to do',
      reason: 'This issue is already in a Done status category.',
      severity: 'low',
    },
  ]);
});

test('triageSuggestions are deterministic: same input, same output', () => {
  const summary = summarizeIssue(fixtureIssue(), NOW);
  assert.deepEqual(triageSuggestions(summary), triageSuggestions(summary));
});
