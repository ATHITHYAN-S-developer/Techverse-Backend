#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const REQUIRED_TOOLS = [
  { id: "node", exe: "node", label: "Node.js (server runtime)" },
  { id: "npm", exe: "npm", label: "npm (package manager)" },
  { id: "python3", probes: ["python3", "python"], label: "Python 3 (Coding Arena runner)" },
  { id: "gcc", exe: "gcc", label: "GCC (C compiler)" },
  { id: "gpp", exe: "g++", label: "G++ (C++ compiler)" },
  { id: "javac", exe: "javac", label: "JDK javac (Java compiler)" },
  { id: "java", exe: "java", label: "JRE java (Java runtime)" },
];

const FAMILIES = {
  "ubuntu-debian": {
    label: "Ubuntu / Debian",
    tools: {
      node: "sudo apt-get install -y nodejs npm   # or grab the LTS installer from https://nodejs.org",
      npm: "sudo apt-get install -y npm",
      python3: "sudo apt-get install -y python3",
      gcc: "sudo apt-get install -y gcc",
      gpp: "sudo apt-get install -y g++",
      javac: "sudo apt-get install -y openjdk-17-jdk",
      java: "sudo apt-get install -y openjdk-17-jre",
      mongod: "sudo apt-get install -y mongodb-org   # or point MONGO_URI in .env at MongoDB Atlas",
    },
  },
  "fedora-rhel": {
    label: "Fedora / RHEL / CentOS",
    tools: {
      node: "sudo dnf install -y nodejs npm",
      npm: "sudo dnf install -y npm",
      python3: "sudo dnf install -y python3",
      gcc: "sudo dnf install -y gcc",
      gpp: "sudo dnf install -y gcc-c++",
      javac: "sudo dnf install -y java-17-openjdk-devel",
      java: "sudo dnf install -y java-17-openjdk",
      mongod: "sudo dnf install -y mongodb-org",
    },
  },
  arch: {
    label: "Arch Linux",
    tools: {
      node: "sudo pacman -S --needed nodejs npm",
      npm: "sudo pacman -S --needed npm",
      python3: "sudo pacman -S --needed python",
      gcc: "sudo pacman -S --needed gcc",
      gpp: "sudo pacman -S --needed gcc-libs",
      javac: "sudo pacman -S --needed jdk-openjdk",
      java: "sudo pacman -S --needed jdk-openjdk",
      mongod: "sudo pacman -S --needed mongodb",
    },
  },
  macos: {
    label: "macOS",
    tools: {
      node: "brew install node   # or: https://nodejs.org",
      npm: "brew install node   # npm ships with Node.js",
      python3: "xcode-select --install",
      gcc: "xcode-select --install   # Apple clang provides the 'gcc' command",
      gpp: "xcode-select --install",
      javac:
        "brew install openjdk@17 && sudo ln -sfn $(brew --prefix openjdk@17)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk",
      java: "brew install openjdk@17",
      mongod: "brew tap mongodb/brew && brew install mongodb-community",
    },
  },
  windows: {
    label: "Windows",
    tools: {
      all: "Native Windows is not recommended for the Coding Arena. Install WSL2 + Ubuntu (https://learn.microsoft.com/windows/wsl/install), then run this project inside WSL and follow the Ubuntu/Debian instructions.",
    },
  },
  unknown: {
    label: "Unrecognized OS",
    tools: {
      all: "Install manually: Node.js 18+ (nodejs.org), Python 3 (python.org), GCC/G++ (build-essential or MinGW), and a JDK 17 (openjdk).",
    },
  },
};

function log() {
  console.log(...arguments);
}
function ok(text) {
  log(`  ${GREEN}✓${RESET} ${text}`);
}
function warn(text) {
  log(`  ${YELLOW}⚠${RESET} ${text}`);
}
function fail(text) {
  log(`  ${RED}✗${RESET} ${text}`);
}
function code(text) {
  log(`    ${CYAN}${text}${RESET}`);
}

function detectFamily() {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  if (platform === "linux") {
    try {
      const osRelease = fs.readFileSync("/etc/os-release", "utf8");
      const id = (osRelease.match(/^ID=(.*)$/m) || [])[1]?.replace(/["'\s]/g, "") || "";
      const like = (osRelease.match(/^ID_LIKE=(.*)$/m) || [])[1]?.replace(/["'\s]/g, "") || "";
      const haystack = `${id} ${like}`;
      if (/debian|ubuntu/.test(haystack)) return "ubuntu-debian";
      if (/rhel|fedora|centos/.test(haystack)) return "fedora-rhel";
      if (/arch/.test(haystack)) return "arch";
    } catch (e) {}
    return "unknown";
  }
  return "unknown";
}

function probe(exes) {
  for (const exe of exes) {
    const res = spawnSync(exe, ["--version"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    if (res.error && res.error.code === "ENOENT") continue;
    const text = (res.stdout || res.stderr || "").split("\n")[0].trim();
    if (res.status === null && !text) continue;
    if (res.status !== 0 && !res.stdout && !res.stderr) continue;
    return { found: true, version: text || `${exe} present` };
  }
  return { found: false, version: null };
}

function loadEnvVar(name) {
  try {
    const envFile = path.join(ROOT, ".env");
    if (!fs.existsSync(envFile)) return undefined;
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && match[1] === name) {
        return match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (e) {}
  return undefined;
}

function isLocalMongoUri(uri) {
  if (!uri) return true;
  return /(127\.0\.0\.1|localhost|0\.0\.0\.0)/.test(uri) && !uri.includes("mongodb+srv");
}

function isEnvTrackedInGit() {
  const res = spawnSync("git", ["ls-files", "--error-unmatch", "--", ".env"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return res.status === 0;
}

function printFix(family, toolId) {
  const hints = FAMILIES[family].tools;
  const hint = hints[toolId] || hints.all;
  if (hint) code(hint);
}

export function main() {
  if (process.env.SKIP_REQUIREMENTS === "1") {
    log(`${YELLOW}SKIP_REQUIREMENTS=1 set — skipping requirements check.${RESET}\n`);
    return 0;
  }

  log("");
  log(`${BOLD}TechVerse Backend — Environment Requirements Check${RESET}`);
  log(`${DIM}(Coding Arena needs Node, Python 3, GCC, G++ and a JDK on the host.)${RESET}\n`);

  const family = detectFamily();
  log(`${BOLD}Detected OS:${RESET} ${FAMILIES[family].label}${DIM} (${process.platform})${RESET}\n`);

  const blockers = [];
  const warnings = [];

  log(`${BOLD}Required tools${RESET}`);
  for (const tool of REQUIRED_TOOLS) {
    const exes = tool.probes || [tool.exe];
    const result = probe(exes);
    if (result.found) {
      ok(`[${tool.id}] ${tool.label} — ${result.version}`);
    } else {
      fail(`[${tool.id}] ${tool.label} — NOT FOUND`);
      blockers.push({ id: tool.id, label: tool.label });
    }
  }

  log(`\n${BOLD}Database${RESET}`);
  const mongoUri = loadEnvVar("MONGO_URI");
  const mongo = probe(["mongod"]);
  if (mongo.found) {
    ok(`[mongod] local MongoDB server — ${mongo.version}`);
  } else if (isLocalMongoUri(mongoUri)) {
    fail(`[mongod] local MongoDB server — NOT FOUND`);
    blockers.push({ id: "mongod", label: "MongoDB (mongod) — MONGO_URI points at localhost" });
  } else {
    warn(`[mongod] local MongoDB not installed, but MONGO_URI looks remote (Atlas) — not required.`);
    warnings.push("Local MongoDB is missing but MONGO_URI appears to be a remote/Atlas URI — OK.");
  }

  log(`\n${BOLD}Security${RESET}`);
  if (isEnvTrackedInGit()) {
    fail("[.env] Your .env file is tracked by git — secrets would be committed!");
    blockers.push({
      id: "env",
      label: ".env tracked in git",
      fix: "git rm --cached .env && echo '.env' >> .gitignore && git commit -m 'chore: stop tracking .env'",
    });
  } else {
    ok("[.env] not tracked by git — secrets are safe.");
  }

  if (blockers.length > 0) {
    log(`\n${BOLD}${RED}✘ Blocking requirements missing${RESET}`);
    for (const blocker of blockers) {
      log(`  ${RED}·${RESET} ${blocker.label}`);
    }
    log(`\n${BOLD}Install instructions for ${FAMILIES[family].label}:${RESET}`);
    if (FAMILIES[family].tools.all) {
      code(FAMILIES[family].tools.all);
    } else {
      for (const blocker of blockers) {
        printFix(family, blocker.id);
      }
    }
    log(`\nAfter installing, re-run: ${CYAN}npm run requirements${RESET}`);
    log(`To bypass temporarily: ${CYAN}SKIP_REQUIREMENTS=1 npm run dev${RESET}\n`);
    return 1;
  }

  for (const warning of warnings) {
    warn(warning);
  }
  log(`\n${GREEN}${BOLD}✓ All requirements satisfied.${RESET} You can start the server.${RESET}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}