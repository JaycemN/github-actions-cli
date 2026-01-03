import chalk from "chalk";

export function getColoredStatus(
  status: string | null | undefined,
  conclusion: string | null | undefined
): string {
  if (status === "completed") {
    if (conclusion === "success") {
      return chalk.green("Completed Successfully");
    } else if (conclusion === "failure") {
      return chalk.red("Failed");
    } else {
      return chalk.yellow("Canceled/Other");
    }
  } else if (status === "in_progress") {
    return chalk.blue("In Progress");
  } else if (status === "queued") {
    return chalk.cyan("Queued");
  } else {
    return chalk.gray("Unknown");
  }
}
