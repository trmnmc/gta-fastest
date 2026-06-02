import { spawn } from "node:child_process";
import path from "node:path";
import { config } from "../src/lib/config";

const PYTHON_DIR = path.resolve(process.cwd(), "python");

// Runs a python script in ./python, passing `input` as JSON on stdin and parsing
// a single JSON object from stdout. Script logs/progress go to stderr (streamed
// through so we see ffmpeg/whisper output live). Rejects on non-zero exit.
export function runPython<TOut>(script: string, input: unknown): Promise<TOut> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PYTHON_DIR, script);
    const child = spawn(config.pythonBin, [scriptPath], {
      cwd: PYTHON_DIR,
      env: {
        ...process.env,
        WHISPER_MODEL: config.whisperModel,
        WHISPER_DEVICE: config.whisperDevice,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(`[python:${script}] ${s}`);
    });

    child.on("error", (err) => reject(new Error(`Failed to spawn ${config.pythonBin}: ${err.message}`)));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`${script} exited ${code}\n${stderr.slice(-2000)}`));
      }
      try {
        // The script prints exactly one JSON object as its final stdout line.
        const lastLine = stdout.trim().split("\n").filter(Boolean).pop() || "{}";
        resolve(JSON.parse(lastLine) as TOut);
      } catch (e) {
        reject(new Error(`Could not parse JSON from ${script}: ${(e as Error).message}\nstdout: ${stdout.slice(-1000)}`));
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
