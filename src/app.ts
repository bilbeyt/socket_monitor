import { Command } from "commander";

import { MonitorProgram } from "./monitor/program";

export type ProgramOptions = {
  configFile: string;
};

const program = new Command();

program.name("Socket Monitor").description("Monitor facilitates user to verify socket actions");

program
  .command("monitor")
  .description("Monitor seal and proposals and send trips if needed")
  .requiredOption("--config-file <file_path>", "Config file for program")
  .action(async (options: ProgramOptions) => {
    const program = new MonitorProgram(options.configFile);
    await program.init();
    process.on("exit", (code) => {
      console.log("exiting with code ", code);
      program.stop();
    });
    try {
      await program.run();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

process.on("uncaughtException", (error) => {
  console.error(new Date().toUTCString() + " Uncaught Exception:", error.message);
  console.error(error.stack);
  process.exit(1);
});

program.parse(process.argv);
