import { GITHUB_API_BASE } from "../domain/def/url-constants.js";
import { createRequestError } from "./create-request-error.js";
import { spinner } from "@clack/prompts";
import type { TActionsRunsResponse } from "../domain/meta/responses.js";

async function getWorkflowRuns(
  workflowId: number,
  repoPath: string
): Promise<TActionsRunsResponse> {
  let response: TActionsRunsResponse;

  const s = spinner();

  s.start("Fetching workflow runs...");

  const workflowsRunsUrl =
    workflowId === -1
      ? `${GITHUB_API_BASE}/repos/${repoPath}/actions/runs`
      : `${GITHUB_API_BASE}/repos/${repoPath}/actions/workflows/${workflowId}/runs`;

  while (true) {
    const runsResponse = await fetch(workflowsRunsUrl);
    if (!runsResponse.ok) {
      throw await createRequestError(runsResponse);
    }
    response = await runsResponse.json();
    const inProgressRuns = response.workflow_runs.filter(
      (run) => run.status === "in_progress" || run.status === "queued"
    );
    if (inProgressRuns.length === 0) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(() => {
        s.message(`${inProgressRuns.length} runs in progress...`);
        resolve(null);
      }, 5000)
    );
  }
  s.stop("Fetching workflow runs...");
  return response;
}

export { getWorkflowRuns };
