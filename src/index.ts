import { intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { getColoredStatus } from "./utils/statusColor.js";
import { handleCancel } from "./utils/handle-cancel.js";
import { getWorkflowRuns } from "./utils/get-workflow-runs.js";
import { createRequestError } from "./utils/create-request-error.js";
import {
  GITHUB_API_BASE,
  GITHUB_BASE_URL,
} from "./domain/def/url-constants.js";
import type { TWorkflowListResponse } from "./domain/meta/responses.js";
import { RequestError } from "@octokit/request-error";

// todo: as a user I want to use env variables to avoid entering repo url every time
// REPO_URL="" node src/index.ts
// if process.env.REPO_URL is set use that value instead of prompting the user

// todo: as a user I want to see tree of workflows with runs if I select all

// todo: as a user I want the script to keep running if there is a workflow that have "running/inprgress" run with loading spinner

async function getRunningActions() {
  intro("Running github actions cli..");

  const fullRepoUrl = await text({
    message: "Enter your Repository URL to get running actions",
    validate(value) {
      if (value.length === 0) return `URL is required!`;
    },
  });
  if (isCancel(fullRepoUrl)) {
    handleCancel();
    return;
  }

  //Check if valid github repo url
  if (
    typeof fullRepoUrl !== "string" ||
    !fullRepoUrl.includes(GITHUB_BASE_URL)
  ) {
    log.error("Invalid repository URL.");
    process.exit(1);
  }

  const repoPath = fullRepoUrl.split(`${GITHUB_BASE_URL}/`)[1];

  try {
    const getWorkflows = await fetch(
      `${GITHUB_API_BASE}/repos/${repoPath}/actions/workflows`
    );
    
    if (!getWorkflows.ok) {
      throw await createRequestError(getWorkflows);
    }
    
    const workflowsResponse =
      (await getWorkflows.json()) as TWorkflowListResponse;

    // Handle case with no workflows
    if (workflowsResponse.workflows.length === 0) {
      log.info(`No workflows found on ${repoPath}.`);
      process.exit(0);
    }

    const workflowOptions = [
      { value: -1, label: "All Workflows" },
      ...workflowsResponse.workflows?.map((workflow) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    ];

    const workflow = await select({
      message: "Select Workflow:",
      options: workflowOptions,
    });

    if (isCancel(workflow)) {
      handleCancel();
      return;
    }

    const { total_count: totalCount, workflow_runs: runs } =
      await getWorkflowRuns(workflow, repoPath);

    // Handle case with no running actions
    if (runs.length === 0) {
      log.info(`No running actions found on ${repoPath}.`);
      process.exit(0);
    }
    log.info(`Found ${totalCount} running actions on ${repoPath}:\n`);
    runs.forEach((run, idx) => {
      const coloredStatus = getColoredStatus(run.status, run.conclusion);
      log.step(`${idx + 1}. ${run.name}`);
      log.message(`   Status: ${coloredStatus}`);
      log.message(`   Branch: ${run.head_branch}`);
      log.message(`   Commit: ${run.head_sha.slice(0, 7)}`);
      log.message(`   Started: ${new Date(run.created_at).toLocaleString()}`);
      log.message(`   URL: ${run.html_url}\n`);
    });
  } catch (error: unknown) {
    if (error instanceof RequestError) {
      if (error.status === 404) {
        log.error(`\n✗ Repository not found: ${repoPath}\n`);
      } else if (error.status === 403) {
        log.error(`\n✗ API rate limit exceeded. Try again later.\n`);
      } else if (error.status === 401) {
        log.error(`\n✗ Authentication required. Please check your credentials.\n`);
      } else {
        log.error(`\n✗ API Error (${error.status}): ${error.message}\n`);
      }
    } else if (error instanceof Error) {
      log.error(`\n✗ Error: ${error.message}\n`);
    } else {
      log.error(`\n✗ Unknown error occurred\n`);
    }
    process.exit(1);
  }
  outro("Thank you for using the running github actions cli!");
}

await getRunningActions();
