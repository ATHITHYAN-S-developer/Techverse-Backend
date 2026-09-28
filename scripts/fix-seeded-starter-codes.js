import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CodingTest } from "../src/models/CodingTest.js";

const SKELETONS = {
  "two-sum": {
    python: "import sys\n\ndef two_sum():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines or len(lines) < 2:\n        return\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    # Write your solution here\n\nif __name__ == '__main__':\n    two_sum()",
    javascript: "const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (input.length >= 2) {\n  const nums = input[0].split(' ').map(Number);\n  const target = Number(input[1]);\n  // Write your solution here\n}",
  },
  "longest-substring-without-repeating": {
    python: "import sys\n\ndef length_of_longest_substring():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0] if lines else ''\n    # Write your solution here\n\nif __name__ == '__main__':\n    length_of_longest_substring()",
    javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n// Write your solution here",
  },
};

async function fixSeededStarterCodes() {
  await connectDB();
  const tests = await CodingTest.find();
  let patchedTests = 0;
  let patchedProblems = 0;

  for (const test of tests) {
    let testChanged = false;
    for (let i = 0; i < test.problems.length; i++) {
      const skeleton = SKELETONS[test.problems[i].slug];
      if (!skeleton) continue;
      let problemChanged = false;
      for (const [lang, code] of Object.entries(skeleton)) {
        const current = test.problems[i].starterCode?.[lang];
        if (current && current !== code) {
          test.problems[i].starterCode[lang] = code;
          problemChanged = true;
        }
      }
      if (problemChanged) {
        patchedProblems++;
        testChanged = true;
      }
    }
    if (testChanged) {
      await test.save();
      patchedTests++;
    }
  }

  console.log(`✅ Patched ${patchedProblems} problem(s) across ${patchedTests} CodingTest doc(s).`);
  await mongoose.disconnect();
}

fixSeededStarterCodes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
  });