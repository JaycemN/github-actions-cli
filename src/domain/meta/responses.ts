import type { Endpoints } from "@octokit/types";

type TActionsRunsResponse =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]["data"];

type TWorkflowListResponse =
  Endpoints["GET /repos/{owner}/{repo}/actions/workflows"]["response"]["data"];

export type { TActionsRunsResponse, TWorkflowListResponse };
