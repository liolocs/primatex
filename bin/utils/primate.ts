import { spawn } from "bun";

// Run bunx --bun primate with arguments
export async function runPrimate(
  projectRoot: string,
  args: string[],
  checkForErrors: boolean = true
): Promise<{ code: number; stdout: string; stderr: string; shouldContinue: boolean }> {
  const proc = spawn({
    cmd: ["bunx", "--bun", "primate", ...args],
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });

  let stdout = "";
  let stderr = "";
  let hasErrors = false;
  let processKilled = false;

  // Stream stdout in real-time
  const stdoutReader = proc.stdout.getReader();
  const stderrReader = proc.stderr.getReader();
  
  const decoder = new TextDecoder();

  // Read stdout and stderr concurrently
  const readStreams = Promise.all([
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stdout += text;
        process.stdout.write(text);
        
        // Check for errors in real-time and kill process if found
        if (checkForErrors && !processKilled && /Could not resolve\s+["']/i.test(text)) {
          hasErrors = true;
          processKilled = true;
          // Kill the process immediately
          proc.kill();
          break;
        }
      }
    })(),
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        const text = decoder.decode(value);
        stderr += text;
        process.stderr.write(text);
        
        // Check for errors in real-time and kill process if found
        if (checkForErrors && !processKilled && /Could not resolve\s+["']/i.test(text)) {
          hasErrors = true;
          processKilled = true;
          // Kill the process immediately
          proc.kill();
          break;
        }
      }
    })(),
  ]);

  await readStreams;
  
  // Wait for process to exit (will be quick if we killed it)
  await proc.exited;
  
  return {
    code: proc.exitCode ?? (processKilled ? 1 : 0),
    stdout,
    stderr,
    shouldContinue: false, // Not used anymore
  };
}

