import { intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { getColoredStatus } from "./utils/statusColor.js";
import { handleCancel } from "./utils/handle-cancel.js";
import { getWorkflowRuns } from "./utils/get-workflow-runs.js";
import { createRequestError } from "./utils/create-request-error.js";
import {
  GITHUB_API_BASE,
  GITHUB_BASE_URL,
} from "./domain/def/url-constants.js";
import { RequestError } from "@octokit/request-error";
import type { TWorkflowListResponse } from "./domain/meta/responses.js";

import "dotenv/config";

// todo: as a user I want the script to keep running if there is a workflow that have "running/inprgress" run with loading spinner

async function getRunningActions() {
  intro("Running github actions cli..");

  const envRepoUrl = process.env.REPO_URL;

  let fullRepoUrl: string;

  if (envRepoUrl) {
    log.info(`Using REPO_URL from environment: ${envRepoUrl}`);
    fullRepoUrl = envRepoUrl;
  } else {
    const promptResult = await text({
      message: "Enter your Repository URL to get running actions",
      validate(value) {
        if (value.length === 0) return `URL is required!`;
      },
    });

    if (isCancel(promptResult)) {
      handleCancel();
      return;
    }
    fullRepoUrl = promptResult as string;
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

    // If "All Workflows" selected, display as a tree grouped by workflow
    if (workflow === -1) {
      log.info(`Found ${totalCount} running actions on ${repoPath}:\n`);

      // Group runs by workflow name
      const runsByWorkflow = runs.reduce((acc, run) => {
        const workflowName = run.name || "Unknown Workflow";
        if (!acc[workflowName]) {
          acc[workflowName] = [];
        }
        acc[workflowName].push(run);
        return acc;
      }, {} as Record<string, typeof runs>);

      // Display as tree
      Object.entries(runsByWorkflow).forEach(([workflowName, workflowRuns]) => {
        log.step(`📋 ${workflowName} (${workflowRuns.length} runs)`);
        workflowRuns.forEach(run => {
          const coloredStatus = getColoredStatus(run.status, run.conclusion);
          log.message(`   ${"├─"} Run #${run.run_number}`);
          log.message(`   ${"│"} Status: ${coloredStatus}`);
          log.message(`   ${"│"} Branch: ${run.head_branch}`);
          log.message(`   ${"│"} Commit: ${run.head_sha.slice(0, 7)}`);
          log.message(`   ${"│"} Started: ${new Date(run.created_at).toLocaleString()}`);
          log.message(`   ${"│"} URL: ${run.html_url}\n`);
        });
      });
    } else {
      // Single workflow selected - show flat list
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
    }
  } catch (error: unknown) {
    if (error instanceof RequestError) {
      if (error.status === 404) {
        log.error(`\n✗ Repository not found: ${repoPath}\n`);
      } else if (error.status === 403) {
        log.error(`\n✗ API rate limit exceeded. Try again later.\n`);
      } else if (error.status === 401) {
        log.error(
          `\n✗ Authentication required. Please check your credentials.\n`
        );
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
