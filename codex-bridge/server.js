import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

loadDotEnv();

const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || "127.0.0.1",
  token: process.env.BRIDGE_TOKEN || "",
  codexBin: process.env.CODEX_BIN || "codex",
  projectsFile: process.env.PROJECTS_FILE || "./projects.json",
  jobDataDir: process.env.JOB_DATA_DIR || "./jobs",
  maxConcurrentJobs: Number(process.env.MAX_CONCURRENT_JOBS || 1),
  jobTimeoutMinutes: Number(process.env.JOB_TIMEOUT_MINUTES || 45)
};

const jobs = new Map();
const queue = [];
let activeJobs = 0;

if (!config.token || config.token === "change-me-to-a-long-random-secret") {
  throw new Error("Set BRIDGE_TOKEN to a long random secret before starting the bridge.");
}

await mkdir(config.jobDataDir, { recursive: true });

function loadDotEnv() {
  const envPath = resolve(process.env.ENV_FILE || ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isAuthorized(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token && safeEqual(token, config.token);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

async function loadProjects() {
  const filePath = resolve(config.projectsFile);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function slugify(input) {
  return String(input || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "task";
}

function buildPrompt(job, project) {
  const commitInstruction = job.commit && project.allowCommit
    ? "Maak een git branch als dat nodig is, commit alle relevante wijzigingen, en vermeld de commit hash in je eindbericht."
    : "Maak geen commit, tenzij de taak dat expliciet vraagt.";

  return `Je bent Codex en je voert een taak uit die via n8n is binnengekomen.

Project key: ${job.project}
Taak: ${job.task}

Context vanuit n8n:
${JSON.stringify(job.context || {}, null, 2)}

Werkafspraken:
- Werk alleen in de opgegeven projectmap.
- Houd wijzigingen gericht op de taak.
- Run relevante checks/tests als die beschikbaar zijn.
- ${commitInstruction}
- Geef aan wat je hebt aangepast, welke checks zijn uitgevoerd, en wat eventueel nog aandacht nodig heeft.

Gewenste branchnaam, als je een branch maakt: ${job.branchName}`;
}

function createSignature(body) {
  return createHmac("sha256", config.token).update(body).digest("hex");
}

async function postCallback(job, result) {
  if (!job.callbackUrl) return;

  const body = JSON.stringify({
    jobId: job.id,
    status: job.status,
    project: job.project,
    task: job.task,
    result
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    await fetch(job.callbackUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-codex-bridge-signature": createSignature(body)
      },
      body,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function persistJob(job) {
  const jobFile = resolve(config.jobDataDir, `${job.id}.json`);
  await mkdir(dirname(jobFile), { recursive: true });
  await writeFile(jobFile, JSON.stringify(job, null, 2));
}

async function runJob(job) {
  activeJobs += 1;
  job.status = "running";
  job.startedAt = new Date().toISOString();
  await persistJob(job);

  const projects = await loadProjects();
  const project = projects[job.project];
  const outputFile = resolve(config.jobDataDir, `${job.id}.final.txt`);
  const logFile = resolve(config.jobDataDir, `${job.id}.log`);
  const prompt = buildPrompt(job, project);

  const args = [
    "exec",
    "--cd", project.cwd,
    "--sandbox", project.sandbox || "workspace-write",
    "--ask-for-approval", "never",
    "--output-last-message", outputFile,
    "-m", project.model || "gpt-5",
    prompt
  ];

  if (project.reasoningEffort) {
    args.splice(args.length - 1, 0, "-c", `model_reasoning_effort="${project.reasoningEffort}"`);
  }

  const logStream = createWriteStream(logFile, { flags: "a" });
  const child = spawn(config.codexBin, args, {
    cwd: project.cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
  }, config.jobTimeoutMinutes * 60 * 1000);

  const exitCode = await new Promise((resolveExit) => {
    child.on("close", resolveExit);
    child.on("error", () => resolveExit(1));
  });

  clearTimeout(timeout);

  let finalMessage = "";
  try {
    finalMessage = await readFile(outputFile, "utf8");
  } catch {
    finalMessage = "Codex did not write a final message.";
  }

  job.status = exitCode === 0 ? "completed" : "failed";
  job.finishedAt = new Date().toISOString();
  job.exitCode = exitCode;
  job.finalMessage = finalMessage;
  job.logFile = logFile;
  job.outputFile = outputFile;

  await persistJob(job);

  try {
    await postCallback(job, {
      exitCode,
      finalMessage,
      logFile,
      outputFile
    });
  } catch (error) {
    job.callbackError = error.message;
    await persistJob(job);
  }

  activeJobs -= 1;
  drainQueue();
}

function drainQueue() {
  while (activeJobs < config.maxConcurrentJobs && queue.length > 0) {
    const job = queue.shift();
    runJob(job).catch(async (error) => {
      job.status = "failed";
      job.finishedAt = new Date().toISOString();
      job.error = error.message;
      await persistJob(job);
      activeJobs -= 1;
      drainQueue();
    });
  }
}

async function createTask(req, res) {
  const body = await readJsonBody(req);
  const projects = await loadProjects();
  const project = projects[body.project];

  if (!project) {
    sendJson(res, 400, { error: `Unknown project: ${body.project}` });
    return;
  }

  if (!body.task || typeof body.task !== "string") {
    sendJson(res, 400, { error: "Field 'task' is required and must be a string." });
    return;
  }

  const id = randomUUID();
  const branchName = body.branchName || `${project.branchPrefix || "codex/n8n-"}${slugify(body.task)}-${id.slice(0, 8)}`;
  const job = {
    id,
    status: "queued",
    createdAt: new Date().toISOString(),
    project: body.project,
    task: body.task,
    context: body.context || {},
    callbackUrl: body.callbackUrl || "",
    commit: body.commit !== false,
    branchName
  };

  jobs.set(id, job);
  queue.push(job);
  await persistJob(job);
  drainQueue();

  sendJson(res, 202, {
    jobId: id,
    status: job.status,
    branchName,
    statusUrl: `/tasks/${id}`
  });
}

async function getTask(req, res, id) {
  const memoryJob = jobs.get(id);
  if (memoryJob) {
    sendJson(res, 200, memoryJob);
    return;
  }

  try {
    const job = JSON.parse(await readFile(resolve(config.jobDataDir, `${id}.json`), "utf8"));
    sendJson(res, 200, job);
  } catch {
    sendJson(res, 404, { error: "Job not found" });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!isAuthorized(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (req.method === "POST" && req.url === "/tasks") {
      await createTask(req, res);
      return;
    }

    const taskMatch = req.url.match(/^\/tasks\/([a-f0-9-]+)$/);
    if (req.method === "GET" && taskMatch) {
      await getTask(req, res, taskMatch[1]);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message });
  }
});

server.on("error", (error) => {
  console.error(`Could not start Codex n8n bridge: ${error.message}`);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  console.log(`Codex n8n bridge listening on http://${config.host}:${config.port}`);
});
