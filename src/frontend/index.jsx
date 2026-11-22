import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Heading,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const severityLabel = (severity) => {
  if (severity === 'high') return 'High priority';
  if (severity === 'medium') return 'Medium priority';
  return 'Low priority';
};

const App = () => {
  const context = useProductContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const issueKey = context?.extension?.issue?.key;
    if (!issueKey) {
      return;
    }
    invoke('getIssueContext', { issueKey })
      .then(setData)
      .catch((err) => setError(String(err && err.message ? err.message : err)));
  }, [context]);

  if (error) {
    return (
      <SectionMessage title="Triage Lens could not load this issue" appearance="error">
        <Text>{error}</Text>
      </SectionMessage>
    );
  }

  if (!data) {
    return <Spinner size="medium" label="Loading issue context…" />;
  }

  if (!data.found) {
    return (
      <SectionMessage title="Issue not found" appearance="warning">
        <Text>{data.message}</Text>
      </SectionMessage>
    );
  }

  const issue = data.issue;
  const staleNote =
    issue.daysStale === null
      ? 'Last-updated date unknown.'
      : issue.daysStale === 0
        ? 'Updated today.'
        : `No update in ${issue.daysStale} day${issue.daysStale === 1 ? '' : 's'}.`;

  return (
    <Stack space="space.200">
      <Heading as="h3">
        {issue.key} · {issue.status}
      </Heading>
      <Text>{issue.summary}</Text>
      <Text>
        {issue.type} · Priority {issue.priority} · Assignee{' '}
        {issue.assignee ? issue.assignee : 'unassigned'} · {issue.commentCount} comment
        {issue.commentCount === 1 ? '' : 's'}
      </Text>
      <SectionMessage
        title="Staleness"
        appearance={issue.daysStale !== null && issue.daysStale >= 30 ? 'warning' : 'information'}
      >
        <Text>{staleNote}</Text>
      </SectionMessage>
      {issue.blockedBy.length > 0 && (
        <SectionMessage title="Blocked by" appearance="warning">
          <Text>
            {issue.blockedBy.map((b) => `${b.key} (${b.status})`).join(', ')}
          </Text>
        </SectionMessage>
      )}
      <Text>
        Ask Rovo to triage this issue, or use the Triage Lens MCP tools from any
        connected AI client.
      </Text>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
