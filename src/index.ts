import { intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { getColoredStatus } from "./utils/statusColor.js";
import type { Endpoints } from "@octokit/types";

const GITHUB_API_BASE = "https://api.github.com";

function handleCancel() {
  log.warn("Operation cancelled.");
  process.exit(0);
}

type ActionsRunsResponse =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]["data"];

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
  // todo: no casting. if fullRepoUrl is not string. send immediate feedback to user
  const repoPath = (fullRepoUrl as string).split("https://github.com/")[1];
  try {
    const getWorkflows = await fetch(
      `${GITHUB_API_BASE}/repos/${repoPath}/actions/workflows`
    );
    const workflowsResponse = await getWorkflows.json();

    // Handle case with no workflows
    if (workflowsResponse.workflows.length === 0) {
      log.info(`No workflows found on ${repoPath}.`);
      process.exit(0);
    }

    const workflowOptions = [
      // todo: do not use any.
      ...workflowsResponse.workflows?.map((workflow: any) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    ];
    // todo: why unshift when you can just put the object as first element in the array initialization
    workflowOptions.unshift({ value: "all", label: "All Workflows" });

    const workflow = await select({
      message: "Select Workflow:",
      options: workflowOptions,
    });

    if (isCancel(workflow)) {
      handleCancel();
      return;
    }

    // todo: create a function outside of this one that returns the runs response {runs, totalCount}
    const workflowsRunsUrl =
      workflow === "all"
        ? `${GITHUB_API_BASE}/repos/${repoPath}/actions/runs`
        : `${GITHUB_API_BASE}/repos/${repoPath}/actions/workflows/${workflow}/runs`;

    const runsResponse = await fetch(workflowsRunsUrl);

    const response: ActionsRunsResponse = await runsResponse.json();

    const totalCount = response.total_count;
    const runs = response.workflow_runs;

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
  } catch (error: any) {
    // todo: replace any with type check. use typescript type check and/or type assertion
    if (error?.status === 404) {
      log.error(`\n✗ Repository not found: ${repoPath}\n`);
    } else if (error?.status === 403) {
      log.error(`\n✗ API rate limit exceeded. Try again later.\n`);
    } else {
      log.error(`\n✗ Error: ${error.message}\n`);
    }
    process.exit(1);
  }
  outro("Thank you for using the running github actions cli!");
}

// todo: use top level await
getRunningActions();

