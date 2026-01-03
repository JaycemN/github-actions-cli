import { log } from "@clack/prompts";

function handleCancel() {
  log.warn("Operation cancelled.");
  process.exit(0);
}

export { handleCancel };
