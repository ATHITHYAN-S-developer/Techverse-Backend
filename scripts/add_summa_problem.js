import mongoose from "mongoose";
import { CodingTest } from "../src/models/CodingTest.js";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/techverse");
  const summa = await CodingTest.findOne({ title: "summa" });
  if (summa && (!summa.problems || summa.problems.length === 0)) {
    summa.problems.push({
      title: "Sum of Two Numbers",
      slug: "sum-of-two-numbers",
      difficulty: "Easy",
      tags: ["Math", "Basics", "Warmup"],
      description: "Write a program that takes two space-separated integers A and B from standard input and prints their sum.",
      inputFormat: "A single line containing two integers A and B separated by space.",
      outputFormat: "Print the sum of A and B.",
      constraints: ["-10^9 <= A, B <= 10^9"],
      sampleInput: "3 5",
      sampleOutput: "8",
      explanation: "3 + 5 = 8",
      starterCode: {
        python: "import sys\n\ndef solution():\n    lines = sys.stdin.read().strip().split()\n    if len(lines) >= 2:\n        a, b = int(lines[0]), int(lines[1])\n        print(a + b)\n\nif __name__ == '__main__':\n    solution()\n",
        javascript: "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
        cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (cin >> a >> b) {\n        cout << a + b << endl;\n    }\n    return 0;\n}\n",
        java: "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long a = sc.nextLong();\n            long b = sc.nextLong();\n            System.out.println(a + b);\n        }\n    }\n}\n",
        c: "#include <stdio.h>\n\nint main() {\n    long long a, b;\n    if (scanf(\"%lld %lld\", &a, &b) == 2) {\n        printf(\"%lld\\n\", a + b);\n    }\n    return 0;\n}\n"
      },
      publicTestCases: [
        { input: "3 5", expectedOutput: "8", explanation: "3 + 5 = 8" },
        { input: "10 20", expectedOutput: "30", explanation: "10 + 20 = 30" }
      ],
      hiddenTestCases: [
        { input: "-5 12", expectedOutput: "7" },
        { input: "0 0", expectedOutput: "0" },
        { input: "1000000 2000000", expectedOutput: "3000000" }
      ]
    });
    await summa.save();
    console.log("Successfully added problem to summa track!");
  } else {
    console.log("summa already has problems or not found");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
