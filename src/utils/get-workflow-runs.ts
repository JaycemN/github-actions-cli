import { GITHUB_API_BASE } from "../domain/def/url-constants.js";
import { createRequestError } from "./create-request-error.js";
import type { TActionsRunsResponse } from "../domain/meta/responses.js";

async function getWorkflowRuns(
  workflowId: number,
  repoPath: string
): Promise<TActionsRunsResponse> {
  const workflowsRunsUrl =
    workflowId === -1
      ? `${GITHUB_API_BASE}/repos/${repoPath}/actions/runs`
      : `${GITHUB_API_BASE}/repos/${repoPath}/actions/workflows/${workflowId}/runs`;

  const runsResponse = await fetch(workflowsRunsUrl);

  if (!runsResponse.ok) {
    throw await createRequestError(runsResponse);
  }

  const response: TActionsRunsResponse = await runsResponse.json();

  return response;
}

export { getWorkflowRuns };
