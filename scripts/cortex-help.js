
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

console.log(`
${BLUE}${BOLD}🧠 Cortex Command Center${RESET}
========================

${GREEN}npm run cortex:wakeup${RESET}
  🚀 Starts the full application stack (App + Database) in Docker.
  Use this for the "download & run" experience.

${YELLOW}npm run cortex:wakeup:dev${RESET}
  🛠️  Starts the stack in Development Mode (with hot-reloading).
  Mounts local source code volume.

${CYAN}npm run cortex:sleep${RESET}
  💤 Stops all running Cortex containers.

${BLUE}npm run cortex:remember${RESET} ${RESET}[-- tag]${RESET}
  💾 Backs up the database to ${BOLD}./backups${RESET}.
  ${RESET}Example: ${BOLD}npm run cortex:remember -- pre-demo${RESET}

${GREEN}npm run cortex:health${RESET}
  🏥 Checks the status of the Brain (running containers).

${CYAN}npm run cortex:logs${RESET}
  📜 Streams the thoughts (logs) of the Cortex.

${RESET}
For more details, see ${BOLD}README.md${RESET} or ${BOLD}LOCAL_DB_SETUP.md${RESET}.
`);
