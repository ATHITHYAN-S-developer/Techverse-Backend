import mongoose from "mongoose";
import { CodingTest } from "../models/CodingTest.js";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";

async function seedCodingArena() {
  try {
    await mongoose.connect(ENV.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
    console.log("Connected to MongoDB.");

    let facultyUser = await User.findOne({ role: { $in: ["hod", "faculty", "admin"] } });
    if (!facultyUser) {
      facultyUser = await User.findOne({});
    }

    const creatorId = facultyUser ? facultyUser._id : null;
    const creatorName = facultyUser ? facultyUser.name : "Dr. K. S. Sendhilkumar (HOD / CSE)";

    const existing = await CodingTest.countDocuments({});
    if (existing > 0) {
      console.log(`Coding tests already exist (${existing} found). Updating author fields...`);
      await CodingTest.updateMany(
        {},
        {
          $set: {
            createdBy: creatorId,
            timeLimit: 240, // 4 hours
            "problems.$[].author": creatorName,
            "problems.$[].createdByName": creatorName,
          }
        }
      );
      console.log("Updated existing coding tests with 4-hour limit and author info.");
      process.exit(0);
    }

    const test = await CodingTest.create({
      title: "VCET Institutional Technical Problem Solving Arena 2026",
      slug: "vcet-problem-solving-arena-2026",
      description: "Recruitment and laboratory algorithmic challenge series created by the VCET Engineering Faculty Panel.",
      difficulty: "Medium",
      category: "Placement & Lab",
      timeLimit: 240, // 4 Hours
      memoryLimit: 256,
      languages: ["python", "javascript", "cpp", "java", "c"],
      settings: {
        fullscreenRequired: false,
        antiCopy: true,
        antiPaste: true,
        maxViolations: 1, // immediate auto submit on violation
        autoSubmitOnViolation: true,
      },
      pointsReward: 100,
      bonusPoints: 50,
      isPublished: true,
      createdBy: creatorId,
      problems: [
        {
          title: "Two Sum Target Pair",
          slug: "two-sum",
          difficulty: "Easy",
          author: creatorName || "Dr. K. S. Sendhilkumar (HOD / CSE)",
          createdByName: creatorName || "Dr. K. S. Sendhilkumar (HOD / CSE)",
          tags: ["Array", "Hash Table", "TCS / Zoho"],
          description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
          inputFormat: "First line contains space-separated integers for nums.\nSecond line contains an integer target.",
          outputFormat: "Print space-separated indices sorted in ascending order.",
          constraints: [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Only one valid answer exists."
          ],
          sampleInput: "2 7 11 15\n9",
          sampleOutput: "0 1",
          starterCode: {
            python: "import sys\n\ndef two_sum():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines or len(lines) < 2:\n        return\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    \n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            print(f\"{seen[complement]} {i}\")\n            return\n        seen[num] = i\n\nif __name__ == '__main__':\n    two_sum()",
            javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (input.length >= 2) {\n  const nums = input[0].split(' ').map(Number);\n  const target = Number(input[1]);\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (seen.has(comp)) {\n      console.log(`${seen.get(comp)} ${i}`);\n      break;\n    }\n    seen.set(nums[i], i);\n  }\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    // Solution template\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Solution template\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    // Solution template\n    return 0;\n}"
          },
          publicTestCases: [
            {
              input: "2 7 11 15\n9",
              expectedOutput: "0 1",
              explanation: "nums[0] + nums[1] = 2 + 7 = 9"
            },
            {
              input: "3 2 4\n6",
              expectedOutput: "1 2",
              explanation: "nums[1] + nums[2] = 2 + 4 = 6"
            }
          ],
          hiddenTestCases: [
            { input: "3 3\n6", expectedOutput: "0 1" },
            { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4" }
          ]
        },
        {
          title: "Valid Parentheses Checker",
          slug: "valid-parentheses",
          difficulty: "Medium",
          author: "Prof. M. Jabeen Begum (Associate Professor / CSE)",
          createdByName: "Prof. M. Jabeen Begum (Associate Professor / CSE)",
          tags: ["Stack", "String", "Amazon"],
          description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
          inputFormat: "A single line containing the string s.",
          outputFormat: "Print 'true' if the bracket sequence is valid, otherwise print 'false'.",
          constraints: [
            "1 <= s.length <= 10^4",
            "s consists of parentheses only '()[]{}'."
          ],
          sampleInput: "()[]{}",
          sampleOutput: "true",
          starterCode: {
            python: "import sys\n\ndef is_valid():\n    s = sys.stdin.read().strip()\n    # Write your solution here\n\nif __name__ == '__main__':\n    is_valid()",
            javascript: "const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\n// Write your solution here\n",
            cpp: "#include <iostream>\n#include <stack>\nusing namespace std;\n\nint main() {\n    // Solution template\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Solution template\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    // Solution template\n    return 0;\n}"
          },
          publicTestCases: [
            { input: "()[]{}", expectedOutput: "true", explanation: "All open brackets match properly." },
            { input: "(]", expectedOutput: "false", explanation: "Mismatched bracket types." }
          ],
          hiddenTestCases: [
            { input: "{[]}", expectedOutput: "true" },
            { input: "([)]", expectedOutput: "false" }
          ]
        },
        {
          title: "Longest Palindromic Substring",
          slug: "longest-palindromic-substring",
          difficulty: "Hard",
          author: "Dr. S. K. Gokul (Placement Technical Lead)",
          createdByName: "Dr. S. K. Gokul (Placement Technical Lead)",
          tags: ["String", "Dynamic Programming", "Zoho / Infosys"],
          description: "Given a string s, return the longest palindromic substring in s. If multiple substrings have the same maximum length, return the one that appears first.",
          inputFormat: "A single line containing string s.",
          outputFormat: "Print the longest palindromic substring.",
          constraints: [
            "1 <= s.length <= 1000",
            "s consists of only digits and English letters."
          ],
          sampleInput: "babad",
          sampleOutput: "bab",
          starterCode: {
            python: "import sys\n\ndef longest_palindrome():\n    s = sys.stdin.read().strip()\n    # Write your solution here\n\nif __name__ == '__main__':\n    longest_palindrome()",
            javascript: "const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\n// Write your solution here\n",
            cpp: "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Solution template\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Solution template\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    // Solution template\n    return 0;\n}"
          },
          publicTestCases: [
            { input: "babad", expectedOutput: "bab", explanation: "'aba' is also a valid answer." },
            { input: "cbbd", expectedOutput: "bb", explanation: "'bb' is the longest palindrome." }
          ],
          hiddenTestCases: [
            { input: "a", expectedOutput: "a" },
            { input: "ac", expectedOutput: "a" }
          ]
        }
      ]
    });

    console.log("Successfully created test:", test.title, "with", test.problems.length, "problems.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seedCodingArena();
