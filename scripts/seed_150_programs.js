/**
 * VCET TechVerse - Coding Program Bank (150 Programs)
 * ---------------------------------------------------
 *  50 Beginner      (Easy)   -> track: beginner-program-bank
 *  50 Intermediate  (Medium) -> track: intermediate-program-bank
 *  50 Advanced      (Hard)   -> track: advanced-program-bank
 *
 * Run:  node scripts/seed_150_programs.js
 * Idempotent: tracks are created if missing; problems already present in a
 * track (matched by slug) are skipped, so re-running is always safe.
 *
 * Program spec format (compact):
 *   { t, s, g, d, i, o, c, f, x }
 *     t = title                s = slug (unique)
 *     g = tags[]               d = problem statement
 *     i = input format         o = output format
 *     c = constraints[]        f = reference solve(inputString) -> output
 *     x = test inputs[] (first 2 become public tests, the rest hidden)
 *
 * Expected outputs are computed from the reference solve at seed time, so
 * every stored test case is guaranteed to match its own problem statement.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { CodingTest } from "../src/models/CodingTest.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse";
const AUTHOR = "VCET Technical Faculty Panel";

/* ---------------- input helpers shared by reference solutions ---------------- */
const linesOf = (s) => s.trim().split(/\r?\n/).map((l) => l.trim());
const intsOf = (s) => s.trim().split(/\s+/).map(Number);
const linInts = (s) => linesOf(s).map((l) => l.split(/\s+/).map(Number));

/* ---------------- starter code templates (5 languages) ---------------- */
const STARTER = {
  python: [
    "import sys",
    "",
    "def solve():",
    "    data = sys.stdin.read().strip()",
    "    if not data:",
    "        return",
    "    # TODO: parse input, compute, and print the required output",
    "",
    "if __name__ == '__main__':",
    "    solve()",
  ].join("\n"),
  javascript: [
    "const fs = require('fs');",
    "const input = fs.readFileSync(0, 'utf-8').trim();",
    "if (!input) process.exit(0);",
    "// TODO: parse input, compute, and print the required output",
  ].join("\n"),
  cpp: [
    "#include <iostream>",
    "#include <vector>",
    "#include <string>",
    "using namespace std;",
    "",
    "int main() {",
    "    // TODO: parse input, compute, and print the required output",
    "    return 0;",
    "}",
  ].join("\n"),
  java: [
    "import java.util.*;",
    "",
    "public class Solution {",
    "    public static void main(String[] args) {",
    "        // TODO: parse input, compute, and print the required output",
    "    }",
    "}",
  ].join("\n"),
  c: [
    "#include <stdio.h>",
    "",
    "int main() {",
    "    // TODO: parse input, compute, and print the required output",
    "    return 0;",
    "}",
  ].join("\n"),
};

/* ---------------- problem factory ---------------- */
const slugSeen = new Set();

function buildProblem({ t, s, g, d, i, o, c, f, x, difficulty }) {
  if (slugSeen.has(s)) throw new Error("Duplicate slug: " + s);
  slugSeen.add(s);
  if (!Array.isArray(x) || x.length < 5) {
    throw new Error("Every problem needs at least 5 test inputs: " + s);
  }
  const outputs = x.map((input) => {
    const r = f(input);
    if (typeof r !== "string" && typeof r !== "number") {
      throw new Error("Reference solve must return a string or number: " + t);
    }
    const out = String(r);
    if (out === "") {
      throw new Error(
        "Empty output produced for '" + input + "' in '" + t + "' - expectedOutput is required (non-empty)."
      );
    }
    return out;
  });
  const publicTestCases = x.slice(0, 2).map((input, idx) => ({
    input,
    expectedOutput: outputs[idx],
    explanation: "Correct output for this input is: " + outputs[idx],
  }));
  const hiddenTestCases = x.slice(2).map((input, idx) => ({
    input,
    expectedOutput: outputs[idx + 2],
  }));
  return {
    title: t,
    slug: s,
    difficulty,
    author: AUTHOR,
    createdByName: AUTHOR,
    tags: g,
    description: d,
    inputFormat: i,
    outputFormat: o,
    constraints: c,
    sampleInput: x[0],
    sampleOutput: outputs[0],
    starterCode: STARTER,
    publicTestCases,
    hiddenTestCases,
  };
}

const E = (spec) => buildProblem({ ...spec, difficulty: "Easy" });
const M = (spec) => buildProblem({ ...spec, difficulty: "Medium" });
const H = (spec) => buildProblem({ ...spec, difficulty: "Hard" });
/* =========================================================================
   BEGINNER - 50 EASY PROGRAMS
   ========================================================================= */
const BEGINNER = [
  E({
    t: "Even or Odd", s: "even-or-odd", g: ["Conditionals", "Basics"],
    d: "Write a program that reads an integer N and prints 'Even' if N is even, otherwise prints 'Odd'.",
    i: "A single integer N.", o: "Print Even if N is even, else print Odd.",
    c: ["-10^9 <= N <= 10^9"],
    f: (s) => (Number(s.trim()) % 2 === 0 ? "Even" : "Odd"),
    x: ["4", "7", "0", "-13", "1000000"],
  }),
  E({
    t: "Sum of Two Numbers", s: "sum-of-two-numbers", g: ["Basics", "Arithmetic"],
    d: "Given two integers A and B, write a program that prints their sum.",
    i: "A single line containing two integers A and B separated by space.", o: "Print the sum of A and B.",
    c: ["-10^9 <= A, B <= 10^9"],
    f: (s) => { const [a, b] = intsOf(s); return a + b; },
    x: ["3 5", "10 20", "-7 2", "0 0", "123456 654321"],
  }),
  E({
    t: "Largest of Three Numbers", s: "largest-of-three", g: ["Conditionals", "Basics"],
    d: "Given three integers, write a program that prints the largest among them.",
    i: "A single line containing three integers A, B and C separated by space.", o: "Print the largest of the three.",
    c: ["-10^9 <= A, B, C <= 10^9"],
    f: (s) => String(Math.max(...intsOf(s))),
    x: ["3 7 5", "10 10 2", "-1 -5 -3", "9 9 9", "5 4 12"],
  }),
  E({
    t: "Swap Two Numbers", s: "swap-two-numbers", g: ["Basics"],
    d: "Given two integers A and B, write a program that swaps them and prints the new values.",
    i: "A single line containing two integers A and B separated by space.", o: "Print B followed by a space followed by A.",
    c: ["-10^9 <= A, B <= 10^9"],
    f: (s) => { const [a, b] = intsOf(s); return `${b} ${a}`; },
    x: ["3 5", "-1 8", "0 0", "100 1", "7 7"],
  }),
  E({
    t: "Leap Year Check", s: "leap-year", g: ["Conditionals"],
    d: "Write a program that checks whether a given year is a leap year. A year is a leap year if it is divisible by 400, or divisible by 4 but not by 100.",
    i: "A single integer Y representing the year.", o: "Print yes if Y is a leap year, otherwise print no.",
    c: ["1900 <= Y <= 9999"],
    f: (s) => {
      const n = Number(s.trim());
      return n % 400 === 0 || (n % 4 === 0 && n % 100 !== 0) ? "yes" : "no";
    },
    x: ["2000", "1900", "2024", "2023", "2400"],
  }),
  E({
    t: "Positive, Negative or Zero", s: "positive-negative-zero", g: ["Conditionals", "Basics"],
    d: "Given an integer N, write a program that classifies it as Positive, Negative or Zero.",
    i: "A single integer N.", o: "Print Positive, Negative or Zero accordingly.",
    c: ["-10^12 <= N <= 10^12"],
    f: (s) => {
      const n = Number(s.trim());
      return n > 0 ? "Positive" : n < 0 ? "Negative" : "Zero";
    },
    x: ["5", "-3", "0", "42", "-999999"],
  }),
  E({
    t: "Sum of First N Natural Numbers", s: "sum-of-natural-numbers", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints the sum of the first N natural numbers (1 + 2 + ... + N).",
    i: "A single integer N (N >= 0).", o: "Print the sum.",
    c: ["0 <= N <= 10^5"],
    f: (s) => { const n = Number(s.trim()); return String((n * (n + 1)) / 2); },
    x: ["5", "10", "1", "100", "12345"],
  }),
  E({
    t: "Factorial of a Number", s: "factorial-of-a-number", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints the factorial of a non-negative integer N (N! = 1 x 2 x ... x N, and 0! = 1).",
    i: "A single integer N.", o: "Print N!.",
    c: ["0 <= N <= 20"],
    f: (s) => {
      let n = BigInt(s.trim());
      let r = 1n;
      for (let i = 2n; i <= n; i++) r *= i;
      return String(r);
    },
    x: ["5", "1", "0", "10", "20"],
  }),
  E({
    t: "Reverse an Integer", s: "reverse-an-integer", g: ["Digits", "Loops"],
    d: "Given a non-negative integer N, write a program that prints N with its digits reversed (leading zeros are dropped).",
    i: "A single non-negative integer N.", o: "Print the reversed number.",
    c: ["0 <= N <= 10^9"],
    f: (s) => String(Number(s.trim().split("").reverse().join(""))),
    x: ["123", "120", "0", "1000", "987654321"],
  }),
  E({
    t: "Palindrome Number", s: "palindrome-number", g: ["Digits", "Strings"],
    d: "Write a program that checks whether a non-negative integer N reads the same forwards and backwards.",
    i: "A single non-negative integer N.", o: "Print yes if N is a palindrome, otherwise print no.",
    c: ["0 <= N <= 10^9"],
    f: (s) => {
      const t = s.trim();
      return t === t.split("").reverse().join("") ? "yes" : "no";
    },
    x: ["121", "123", "1", "1001", "45654"],
  }),
  E({
    t: "Sum of Digits", s: "sum-of-digits", g: ["Digits", "Loops"],
    d: "Given a non-negative integer N, write a program that prints the sum of its digits.",
    i: "A single non-negative integer N.", o: "Print the sum of the digits of N.",
    c: ["0 <= N <= 10^9"],
    f: (s) => String([...s.trim()].reduce((a, d) => a + Number(d), 0)),
    x: ["123", "999", "0", "5", "123456789"],
  }),
  E({
    t: "Count Digits", s: "count-digits", g: ["Digits", "Loops"],
    d: "Write a program that prints the number of digits in a non-negative integer N.",
    i: "A single non-negative integer N.", o: "Print the count of digits.",
    c: ["0 <= N <= 10^12"],
    f: (s) => String(s.trim().length),
    x: ["123", "0", "99999", "1000000", "7"],
  }),
  E({
    t: "Fibonacci Series", s: "fibonacci-series", g: ["Loops", "Series"],
    d: "Write a program that prints the first N terms of the Fibonacci series (0, 1, 1, 2, 3, 5, ...).",
    i: "A single integer N (N >= 1).", o: "Print the first N Fibonacci terms space-separated.",
    c: ["1 <= N <= 30"],
    f: (s) => {
      const n = Number(s.trim());
      const arr = [0n, 1n];
      for (let i = 2; i < n; i++) arr.push(arr[i - 1] + arr[i - 2]);
      return arr.slice(0, n).map(String).join(" ");
    },
    x: ["5", "1", "8", "2", "10"],
  }),
  E({
    t: "Prime Number Check", s: "prime-check", g: ["Number Theory", "Loops"],
    d: "Given an integer N (N >= 2), write a program that checks whether N is prime. A prime number has exactly two factors: 1 and itself.",
    i: "A single integer N.", o: "Print yes if N is prime, otherwise print no.",
    c: ["2 <= N <= 10^9"],
    f: (s) => {
      const n = Number(s.trim());
      if (n < 2) return "no";
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return "no";
      return "yes";
    },
    x: ["2", "3", "4", "97", "100"],
  }),
  E({
    t: "GCD of Two Numbers", s: "gcd-of-two-numbers", g: ["Number Theory", "Loops"],
    d: "Write a program that prints the Greatest Common Divisor (GCD) of two non-negative integers A and B.",
    i: "A single line containing two integers A and B.", o: "Print the GCD of A and B.",
    c: ["0 <= A, B <= 10^9"],
    f: (s) => {
      let [a, b] = intsOf(s);
      while (b) { [a, b] = [b, a % b]; }
      return String(a);
    },
    x: ["12 18", "7 13", "0 5", "100 75", "81 27"],
  }),
  E({
    t: "LCM of Two Numbers", s: "lcm-of-two-numbers", g: ["Number Theory", "Arithmetic"],
    d: "Write a program that prints the Least Common Multiple (LCM) of two positive integers A and B.",
    i: "A single line containing two positive integers A and B.", o: "Print the LCM of A and B.",
    c: ["1 <= A, B <= 10^9"],
    f: (s) => {
      let [a, b] = intsOf(s);
      const orig = [a, b];
      while (b) { [a, b] = [b, a % b]; }
      return String((orig[0] / a) * orig[1]);
    },
    x: ["4 6", "12 18", "7 13", "21 14", "5 5"],
  }),
  E({
    t: "Armstrong Number", s: "armstrong-number", g: ["Digits", "Number Theory"],
    d: "A three-digit number is an Armstrong number if the sum of the cubes of its digits equals the number itself. Write a program to check a three-digit number N.",
    i: "A single three-digit integer N.", o: "Print yes if N is an Armstrong number, otherwise print no.",
    c: ["100 <= N <= 999"],
    f: (s) => {
      const t = s.trim();
      const sum = [...t].reduce((a, d) => a + Number(d) ** 3, 0);
      return sum === Number(t) ? "yes" : "no";
    },
    x: ["153", "370", "407", "371", "123"],
  }),
  E({
    t: "Multiplication Table", s: "multiplication-table", g: ["Loops"],
    d: "Write a program that prints the multiplication table of a number N for the multipliers 1 through 10.",
    i: "A single integer N.", o: "Print 10 lines of the form 'N x i = value' (one line per multiplier).",
    c: ["1 <= N <= 99"],
    f: (s) => {
      const n = Number(s.trim());
      return Array.from({ length: 10 }, (_, i) => i + 1)
        .map((i) => `${n} x ${i} = ${n * i}`).join("\n");
    },
    x: ["2", "5", "7", "12", "99"],
  }),
  E({
    t: "Print 1 to N", s: "print-1-to-n", g: ["Loops", "Basics"],
    d: "Write a program that prints all integers from 1 to N in increasing order.",
    i: "A single integer N (N >= 1).", o: "Print the integers 1 to N space-separated.",
    c: ["1 <= N <= 10^5"],
    f: (s) => {
      const n = Number(s.trim());
      return Array.from({ length: n }, (_, i) => i + 1).join(" ");
    },
    x: ["5", "1", "10", "100", "2"],
  }),
  E({
    t: "Digits of a Number", s: "digits-of-a-number", g: ["Digits", "Strings"],
    d: "Given a non-negative integer N, write a program that prints each of its digits separated by a space, from left to right.",
    i: "A single non-negative integer N.", o: "Print the digits of N separated by single spaces.",
    c: ["0 <= N <= 10^9"],
    f: (s) => s.trim().split("").join(" "),
    x: ["1234", "7", "9001", "0", "13579"],
  }),
  E({
    t: "Sum of Even Numbers up to N", s: "sum-of-even-numbers", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints the sum of all even numbers from 0 to N (both inclusive).",
    i: "A single integer N (N >= 0).", o: "Print the sum of even numbers up to N.",
    c: ["0 <= N <= 10^5"],
    f: (s) => {
      const n = Number(s.trim());
      const k = Math.floor(n / 2);
      return String(k * (k + 1));
    },
    x: ["10", "5", "0", "100", "1"],
  }),
  E({
    t: "Sum of Odd Numbers up to N", s: "sum-of-odd-numbers", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints the sum of all odd numbers from 1 to N (both inclusive).",
    i: "A single integer N (N >= 0).", o: "Print the sum of odd numbers up to N.",
    c: ["0 <= N <= 10^5"],
    f: (s) => {
      const n = Number(s.trim());
      let sum = 0;
      for (let i = 1; i <= n; i += 2) sum += i;
      return String(sum);
    },
    x: ["10", "5", "0", "100", "1"],
  }),
  E({
    t: "Power of a Number", s: "power-of-a-number", g: ["Loops", "Arithmetic"],
    d: "Given a base A and an exponent B, write a program that prints A raised to the power B.",
    i: "A single line containing two integers A and B separated by space.", o: "Print A^B.",
    c: ["-10 <= A <= 10", "0 <= B <= 20"],
    f: (s) => {
      const [a, b] = intsOf(s);
      let r = 1;
      for (let i = 0; i < b; i++) r *= a;
      return String(r);
    },
    x: ["2 10", "3 3", "5 0", "1 99", "7 2"],
  }),
  E({
    t: "Simple Interest", s: "simple-interest", g: ["Arithmetic", "Basics"],
    d: "Given the principal P, annual rate of interest R (in percent) and time T (in years), write a program that prints the simple interest SI = (P x R x T) / 100 rounded to 2 decimal places.",
    i: "A single line containing three numbers P, R and T separated by space.", o: "Print the simple interest with exactly 2 decimal places.",
    c: ["0 <= P <= 10^6", "0 <= R <= 100", "0 <= T <= 100"],
    f: (s) => {
      const [p, r, t] = intsOf(s);
      return ((p * r * t) / 100).toFixed(2);
    },
    x: ["1000 5 3", "2000 7.5 2", "5000 10 1", "100 2 1", "2500 4.5 4"],
  }),
  E({
    t: "Area of a Triangle", s: "area-of-a-triangle", g: ["Arithmetic", "Math"],
    d: "Given the three sides of a triangle, write a program that prints its area using Heron's formula (area = sqrt(s(s-a)(s-b)(s-c)), where s is the semi-perimeter) rounded to 2 decimal places.",
    i: "A single line containing three positive integers a, b and c separated by space.", o: "Print the area rounded to 2 decimal places.",
    c: ["1 <= a, b, c <= 100"],
    f: (s) => {
      const [a, b, c] = intsOf(s);
      const sp = (a + b + c) / 2;
      return Math.sqrt(sp * (sp - a) * (sp - b) * (sp - c)).toFixed(2);
    },
    x: ["3 4 5", "5 5 6", "7 8 9", "2 2 3", "6 6 6"],
  }),
  E({
    t: "Celsius to Fahrenheit", s: "celsius-to-fahrenheit", g: ["Arithmetic", "Basics"],
    d: "Write a program that converts a temperature from Celsius to Fahrenheit using F = (C x 9 / 5) + 32, rounded to 1 decimal place.",
    i: "A single number C (the temperature in Celsius).", o: "Print the Fahrenheit value rounded to 1 decimal place.",
    c: ["-100 <= C <= 100"],
    f: (s) => ((Number(s.trim()) * 9) / 5 + 32).toFixed(1),
    x: ["0", "100", "37", "-40", "25"],
  }),
  E({
    t: "Vowel or Consonant", s: "vowel-or-consonant", g: ["Strings", "Conditionals"],
    d: "Given an English alphabet character, write a program that determines whether it is a vowel (a, e, i, o, u) or a consonant.",
    i: "A single lowercase or uppercase alphabet character.", o: "Print Vowel if it is a vowel, otherwise print Consonant.",
    c: ["The input is always an English alphabet letter"],
    f: (s) => {
      const ch = s.trim().toLowerCase();
      return "aeiou".includes(ch) ? "Vowel" : "Consonant";
    },
    x: ["a", "e", "k", "z", "I"],
  }),
  E({
    t: "ASCII Value of a Character", s: "ascii-value", g: ["Strings", "Basics"],
    d: "Write a program that prints the ASCII code of a given character.",
    i: "A single character (letter, digit or printable symbol).", o: "Print the ASCII code as an integer.",
    c: ["The input is a single printable ASCII character"],
    f: (s) => String(s.trim().charCodeAt(0)),
    x: ["A", "a", "0", "&", "{"],
  }),
  E({
    t: "Sum of Squares of First N Numbers", s: "sum-of-squares", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints 1^2 + 2^2 + ... + N^2 for a given N.",
    i: "A single integer N (N >= 0).", o: "Print the sum of squares.",
    c: ["0 <= N <= 10^5"],
    f: (s) => {
      const n = Number(s.trim());
      return String((n * (n + 1) * (2 * n + 1)) / 6);
    },
    x: ["5", "1", "10", "100", "0"],
  }),
  E({
    t: "Sum of Cubes of First N Numbers", s: "sum-of-cubes", g: ["Loops", "Arithmetic"],
    d: "Write a program that prints 1^3 + 2^3 + ... + N^3 for a given N.",
    i: "A single integer N (N >= 0).", o: "Print the sum of cubes.",
    c: ["0 <= N <= 10^4"],
    f: (s) => {
      const n = Number(s.trim());
      const t = (n * (n + 1)) / 2;
      return String(t * t);
    },
    x: ["5", "1", "10", "20", "0"],
  }),
  E({
    t: "Average of an Array", s: "average-of-array", g: ["Array", "Basics"],
    d: "Given an array of N integers, write a program that prints their average rounded to 2 decimal places.",
    i: "First line contains N. Second line contains N integers separated by space.", o: "Print the average rounded to 2 decimal places.",
    c: ["1 <= N <= 10^5", "-10^6 <= element <= 10^6"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
    },
    x: ["3\n4 5 6", "4\n1 2 3 4", "1\n7", "5\n10 20 30 40 50", "2\n3 8"],
  }),
  E({
    t: "Minimum and Maximum of an Array", s: "min-and-max", g: ["Array", "Basics"],
    d: "Given an array of N integers, write a program that prints the minimum and maximum value present.",
    i: "First line contains N. Second line contains N integers separated by space.", o: "Print the minimum followed by a space and the maximum.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      return `${Math.min(...arr)} ${Math.max(...arr)}`;
    },
    x: ["3\n3 1 2", "1\n9", "5\n5 4 3 2 1", "4\n7 7 7 7", "6\n-1 -5 3 0 2 -9"],
  }),
  E({
    t: "Sum of Array Elements", s: "sum-of-array", g: ["Array", "Basics"],
    d: "Given an array of N integers, write a program that prints the sum of all its elements.",
    i: "First line contains N. Second line contains N integers separated by space.", o: "Print the sum of the array.",
    c: ["1 <= N <= 10^5", "-10^6 <= element <= 10^6"],
    f: (s) => {
      const rows = linInts(s);
      return String(rows[1].reduce((a, b) => a + b, 0));
    },
    x: ["3\n1 2 3", "1\n5", "4\n-1 2 -3 4", "5\n10 20 30 40 50", "2\n0 0"],
  }),
  E({
    t: "Linear Search", s: "linear-search", g: ["Array", "Searching"],
    d: "Given an array of N integers and a target value X, write a program that prints the first index (0-based) where X occurs, or -1 if X is absent.",
    i: "First line contains N. Second line contains N integers. Third line contains X.", o: "Print the 0-based index of the first occurrence of X, or -1.",
    c: ["1 <= N <= 10^5", "-10^9 <= element, X <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      const idx = arr.indexOf(rows[2][0]);
      return String(idx);
    },
    x: ["5\n1 2 3 4 5\n3", "5\n1 2 3 4 5\n9", "4\n10 20 10 30\n10", "3\n7 8 9\n7", "2\n5 5\n5"],
  }),
  E({
    t: "Reverse a String", s: "reverse-string", g: ["Strings", "Basics"],
    d: "Write a program that prints a given string in reverse order.",
    i: "A single line containing the string (no leading/trailing spaces).", o: "Print the reversed string.",
    c: ["1 <= length <= 1000", "Contains letters, digits and spaces"],
    f: (s) => s.split("").reverse().join(""),
    x: ["hello", "a", "racecar", "TechVerse", "123 ab"],
  }),
  E({
    t: "String Palindrome", s: "string-palindrome", g: ["Strings"],
    d: "Write a program that checks whether a given string reads the same forwards and backwards.",
    i: "A single line containing the string.", o: "Print yes if it is a palindrome, otherwise print no.",
    c: ["1 <= length <= 1000", "Only lowercase letters"],
    f: (s) => {
      const t = s;
      return t === t.split("").reverse().join("") ? "yes" : "no";
    },
    x: ["racecar", "madam", "hello", "a", "tattarrattat"],
  }),
  E({
    t: "Count Vowels in a String", s: "count-vowels", g: ["Strings", "Counting"],
    d: "Write a program that counts the number of vowels (a, e, i, o, u) in a given string. Matching is case-insensitive.",
    i: "A single line containing the string.", o: "Print the vowel count.",
    c: ["1 <= length <= 1000"],
    f: (s) => String([...s.toLowerCase()].filter((c) => "aeiou".includes(c)).length),
    x: ["hello", "AEIOU", "sky", "Programming", "xyz"],
  }),
  E({
    t: "Count Words in a String", s: "count-words", g: ["Strings", "Counting"],
    d: "Write a program that counts the number of words in a sentence. Words are separated by single spaces.",
    i: "A single line containing the sentence.", o: "Print the number of words.",
    c: ["1 <= length <= 10^4"],
    f: (s) => String(s.trim().split(/\s+/).length),
    x: ["hello world", "one", "a b c d", "TechVerse is great", "x"],
  }),
  E({
    t: "Decimal to Binary", s: "decimal-to-binary", g: ["Number Systems"],
    d: "Write a program that converts a non-negative decimal integer N to its binary representation.",
    i: "A single non-negative integer N.", o: "Print the binary representation of N.",
    c: ["0 <= N <= 10^6"],
    f: (s) => Number(s.trim()).toString(2),
    x: ["10", "255", "0", "16", "100"],
  }),
  E({
    t: "Binary to Decimal", s: "binary-to-decimal", g: ["Number Systems"],
    d: "Write a program that converts a binary string B to its decimal value.",
    i: "A single binary string B (digits 0 and 1 only).", o: "Print the decimal value.",
    c: ["1 <= length of B <= 20"],
    f: (s) => String(parseInt(s.trim(), 2)),
    x: ["1010", "11111111", "0", "10000", "1100100"],
  }),
  E({
    t: "Number of Divisors", s: "count-divisors", g: ["Number Theory", "Loops"],
    d: "Write a program that counts the number of positive divisors of a positive integer N.",
    i: "A single positive integer N.", o: "Print the number of divisors of N.",
    c: ["1 <= N <= 10^6"],
    f: (s) => {
      const n = Number(s.trim());
      let count = 0;
      for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) count += i * i === n ? 1 : 2;
      }
      return String(count);
    },
    x: ["12", "7", "1", "36", "100"],
  }),
  E({
    t: "Perfect Number", s: "perfect-number", g: ["Number Theory", "Loops"],
    d: "A number is perfect if it equals the sum of its proper divisors (all divisors except itself). Write a program to check a positive integer N.",
    i: "A single positive integer N.", o: "Print yes if N is perfect, otherwise print no.",
    c: ["1 <= N <= 10^6"],
    f: (s) => {
      const n = Number(s.trim());
      let sum = 0;
      for (let i = 1; i <= n / 2; i++) if (n % i === 0) sum += i;
      return sum === n ? "yes" : "no";
    },
    x: ["6", "28", "12", "496", "10"],
  }),
  E({
    t: "Strong Number", s: "strong-number", g: ["Digits", "Loops"],
    d: "A number is strong if the sum of the factorials of its digits equals the number itself (for example 145 = 1! + 4! + 5!). Write a program to check a positive integer N.",
    i: "A single positive integer N.", o: "Print yes if N is a strong number, otherwise print no.",
    c: ["1 <= N <= 10^6"],
    f: (s) => {
      const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
      const sum = [...s.trim()].reduce((a, d) => a + fact(Number(d)), 0);
      return sum === Number(s.trim()) ? "yes" : "no";
    },
    x: ["145", "40585", "123", "2", "24"],
  }),
  E({
    t: "Factors of a Number", s: "factors-of-a-number", g: ["Number Theory", "Loops"],
    d: "Write a program that prints all positive factors of a positive integer N in increasing order.",
    i: "A single positive integer N.", o: "Print the factors of N separated by a single space.",
    c: ["1 <= N <= 10^6"],
    f: (s) => {
      const n = Number(s.trim());
      const factors = [];
      for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i);
      return factors.join(" ");
    },
    x: ["12", "7", "1", "36", "100"],
  }),
  E({
    t: "First and Last Digit", s: "first-and-last-digit", g: ["Digits"],
    d: "Given a non-negative integer N, write a program that prints its first and last digit.",
    i: "A single non-negative integer N.", o: "Print the first digit followed by a space followed by the last digit.",
    c: ["0 <= N <= 10^9"],
    f: (s) => {
      const t = s.trim();
      return t[0] + " " + t[t.length - 1];
    },
    x: ["1234", "5", "9001", "0", "100"],
  }),
  E({
    t: "First N Odd Numbers", s: "first-n-odd-numbers", g: ["Loops", "Series"],
    d: "Write a program that prints the first N odd numbers (1, 3, 5, ...).",
    i: "A single integer N (N >= 1).", o: "Print the first N odd numbers separated by a single space.",
    c: ["1 <= N <= 10^5"],
    f: (s) => {
      const n = Number(s.trim());
      return Array.from({ length: n }, (_, i) => 2 * i + 1).join(" ");
    },
    x: ["5", "1", "10", "3", "2"],
  }),
  E({
    t: "Right-Angled Triangle Pattern", s: "right-triangle-pattern", g: ["Patterns", "Loops"],
    d: "Write a program that prints a right-angled triangle of asterisks with N rows. Row i contains i asterisks.",
    i: "A single integer N (N >= 1).", o: "Print N lines; line i contains i asterisks.",
    c: ["1 <= N <= 50"],
    f: (s) => {
      const n = Number(s.trim());
      return Array.from({ length: n }, (_, i) => "*".repeat(i + 1)).join("\n");
    },
    x: ["3", "1", "5", "2", "4"],
  }),
  E({
    t: "Number Triangle Pattern", s: "number-triangle-pattern", g: ["Patterns", "Loops"],
    d: "Write a program that prints a number triangle with N rows. Row i consists of the digit i repeated i times.",
    i: "A single integer N (N >= 1).", o: "Print N lines; line i contains the digit i repeated i times.",
    c: ["1 <= N <= 9"],
    f: (s) => {
      const n = Number(s.trim());
      return Array.from({ length: n }, (_, i) => String(i + 1).repeat(i + 1)).join("\n");
    },
    x: ["3", "1", "5", "4", "2"],
  }),
  E({
    t: "Grade Calculator", s: "grade-calculator", g: ["Conditionals", "Basics"],
    d: "Given a student's marks out of 100, write a program that prints the grade: 90 or above is A, 80-89 is B, 70-79 is C, 60-69 is D, 50-59 is E, below 50 is F.",
    i: "A single integer marks between 0 and 100.", o: "Print a single grade letter A, B, C, D, E or F.",
    c: ["0 <= marks <= 100"],
    f: (s) => {
      const m = Number(s.trim());
      if (m >= 90) return "A";
      if (m >= 80) return "B";
      if (m >= 70) return "C";
      if (m >= 60) return "D";
      if (m >= 50) return "E";
      return "F";
    },
    x: ["95", "85", "75", "65", "55"],
  }),
  E({
    t: "Simple Calculator", s: "simple-calculator", g: ["Conditionals", "Arithmetic"],
    d: "Write a program that evaluates an expression of the form 'A op B' where op is one of +, -, * or /. For division print the result rounded to 2 decimal places.",
    i: "A single line containing A, op and B separated by single spaces.", o: "Print the result. Division output has exactly 2 decimal places.",
    c: ["-10^9 <= A, B <= 10^9", "B != 0 for division"],
    f: (s) => {
      const p = s.trim().split(/\s+/);
      const a = Number(p[0]);
      const b = Number(p[2]);
      const op = p[1];
      if (op === "+") return a + b;
      if (op === "-") return a - b;
      if (op === "*") return a * b;
      return (a / b).toFixed(2);
    },
    x: ["5 + 3", "9 - 14", "6 * 7", "10 / 4", "7 / 2"],
  }),
];
/* =========================================================================
   INTERMEDIATE - 50 MEDIUM PROGRAMS
   ========================================================================= */
const INTERMEDIATE = [
  M({
    t: "Bubble Sort", s: "bubble-sort", g: ["Sorting", "Array"],
    d: "Write a program that sorts an array of N integers in ascending order using the Bubble Sort technique.",
    i: "First line contains N. Second line contains N integers.", o: "Print the sorted array separated by single spaces.",
    c: ["1 <= N <= 10^4", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1].slice();
      for (let i = 0; i < arr.length; i++)
        for (let j = 0; j < arr.length - i - 1; j++)
          if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      return arr.join(" ");
    },
    x: ["5\n5 4 3 2 1", "3\n3 1 2", "1\n9", "6\n6 5 4 3 2 1", "4\n4 4 4 4"],
  }),
  M({
    t: "Selection Sort", s: "selection-sort", g: ["Sorting", "Array"],
    d: "Write a program that sorts an array of N integers in ascending order using the Selection Sort technique.",
    i: "First line contains N. Second line contains N integers.", o: "Print the sorted array separated by single spaces.",
    c: ["1 <= N <= 10^4", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1].slice();
      for (let i = 0; i < arr.length - 1; i++) {
        let m = i;
        for (let j = i + 1; j < arr.length; j++) if (arr[j] < arr[m]) m = j;
        [arr[i], arr[m]] = [arr[m], arr[i]];
      }
      return arr.join(" ");
    },
    x: ["5\n5 4 3 2 1", "4\n4 3 2 1", "1\n9", "5\n3 1 2 5 4", "6\n1 1 2 2 3 3"],
  }),
  M({
    t: "Insertion Sort", s: "insertion-sort", g: ["Sorting", "Array"],
    d: "Write a program that sorts an array of N integers in ascending order using the Insertion Sort technique.",
    i: "First line contains N. Second line contains N integers.", o: "Print the sorted array separated by single spaces.",
    c: ["1 <= N <= 10^4", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1].slice();
      for (let i = 1; i < arr.length; i++) {
        let key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) { arr[j + 1] = arr[j]; j--; }
        arr[j + 1] = key;
      }
      return arr.join(" ");
    },
    x: ["5\n5 4 3 2 1", "6\n2 5 1 3 4 6", "1\n9", "5\n1 2 3 4 5", "4\n8 3 3 1"],
  }),
  M({
    t: "Binary Search", s: "binary-search", g: ["Searching", "Array"],
    d: "Given a sorted array of N integers and a target X, write a program that prints the index (0-based) where X occurs using Binary Search, or -1 if X is absent.",
    i: "First line contains N. Second line contains N sorted integers. Third line contains X.", o: "Print the 0-based index of X, or -1.",
    c: ["1 <= N <= 10^5", "Array is sorted in ascending order"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      const target = rows[2][0];
      let lo = 0, hi = arr.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return -1;
    },
    x: ["5\n1 2 3 4 5\n3", "5\n1 2 3 4 5\n9", "6\n10 20 30 40 50 60\n50", "4\n2 4 6 8\n2", "3\n5 5 5\n5"],
  }),
  M({
    t: "Matrix Transpose", s: "matrix-transpose", g: ["Matrix", "2D Array"],
    d: "Given a matrix with R rows and C columns, write a program that prints its transpose (a C x R matrix).",
    i: "First line contains R and C. Next R lines contain C integers each.", o: "Print the transposed matrix, one row per line, values separated by single spaces.",
    c: ["1 <= R, C <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [R, C] = rows[0];
      const grid = rows.slice(1, 1 + R);
      const out = [];
      for (let c = 0; c < C; c++) {
        const row = [];
        for (let r = 0; r < R; r++) row.push(grid[r][c]);
        out.push(row.join(" "));
      }
      return out.join("\n");
    },
    x: ["2 3\n1 2 3\n4 5 6", "3 2\n1 2\n3 4\n5 6", "1 1\n7", "2 2\n1 2\n3 4", "3 3\n1 2 3\n4 5 6\n7 8 9"],
  }),
  M({
    t: "Matrix Addition", s: "matrix-addition", g: ["Matrix", "2D Array"],
    d: "Given two matrices A and B of size R x C, write a program that prints their sum.",
    i: "First line contains R and C. Next R lines contain matrix A. Next R lines contain matrix B.", o: "Print A + B, one row per line, values separated by single spaces.",
    c: ["1 <= R, C <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [R, C] = rows[0];
      const A = rows.slice(1, 1 + R);
      const B = rows.slice(1 + R, 1 + 2 * R);
      return A.map((row, r) => row.map((v, c) => v + B[r][c]).join(" ")).join("\n");
    },
    x: ["2 2\n1 2\n3 4\n5 6\n7 8", "1 3\n1 2 3\n4 5 6", "3 1\n1\n1\n1\n1\n1\n1", "2 3\n1 1 1\n1 1 1\n2 2 2\n2 2 2", "1 1\n5\n7"],
  }),
  M({
    t: "Matrix Multiplication", s: "matrix-multiplication", g: ["Matrix", "2D Array"],
    d: "Given a matrix A of size R x K and a matrix B of size K x C, write a program that prints their product A x B.",
    i: "First line contains R, K and C. Next R lines contain matrix A. Next K lines contain matrix B.", o: "Print the product matrix (R x C), one row per line, values separated by single spaces.",
    c: ["1 <= R, K, C <= 50", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [R, K, C] = rows[0];
      const A = rows.slice(1, 1 + R);
      const B = rows.slice(1 + R, 1 + R + K);
      const out = [];
      for (let r = 0; r < R; r++) {
        const line = [];
        for (let c = 0; c < C; c++) {
          let sum = 0;
          for (let k = 0; k < K; k++) sum += A[r][k] * B[k][c];
          line.push(sum);
        }
        out.push(line.join(" "));
      }
      return out.join("\n");
    },
    x: ["2 2 2\n1 2\n3 4\n5 6\n7 8", "1 3 1\n1 2 3\n1\n2\n3", "3 2 3\n1 2\n3 4\n5 6\n7 8 9\n10 11 12", "2 1 2\n1\n2\n3 4", "2 2 1\n1 2\n3 4\n5\n6"],
  }),
  M({
    t: "Sum of Main Diagonal", s: "diagonal-sum", g: ["Matrix", "2D Array"],
    d: "Given a square matrix of size N x N, write a program that prints the sum of the elements on its main diagonal (top-left to bottom-right).",
    i: "First line contains N. Next N lines contain N integers each.", o: "Print the main diagonal sum.",
    c: ["1 <= N <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const grid = rows.slice(1, 1 + n);
      let sum = 0;
      for (let i = 0; i < n; i++) sum += grid[i][i];
      return String(sum);
    },
    x: ["3\n1 2 3\n4 5 6\n7 8 9", "1\n5", "2\n1 2\n3 4", "4\n1 0 0 0\n0 2 0 0\n0 0 3 0\n0 0 0 4", "3\n9 9 9\n9 9 9\n9 9 9"],
  }),
  M({
    t: "Frequency Count", s: "frequency-count", g: ["Hash Map", "Array"],
    d: "Given an array of N integers, write a program that prints each distinct value with its frequency. Pairs must be sorted by value.",
    i: "First line contains N. Second line contains N integers.", o: "Print one line per distinct value in ascending order of value: 'value frequency'.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      const map = new Map();
      for (const v of arr) map.set(v, (map.get(v) || 0) + 1);
      return [...map.keys()].sort((a, b) => a - b)
        .map((k) => `${k} ${map.get(k)}`).join("\n");
    },
    x: ["6\n1 2 2 3 3 3", "4\n5 5 5 5", "5\n1 1 1 1 1", "6\n3 1 2 1 3 2", "2\n9 8"],
  }),
  M({
    t: "Remove Duplicates", s: "remove-duplicates", g: ["Array", "Hash Set"],
    d: "Given an array of N integers, write a program that removes duplicate values while keeping the original order of first occurrences.",
    i: "First line contains N. Second line contains N integers.", o: "Print the array without duplicates, separated by single spaces.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      return [...new Set(rows[1])].join(" ");
    },
    x: ["6\n1 2 2 3 3 3", "5\n5 4 5 4 5", "1\n7", "7\n3 1 2 1 3 2 4", "4\n9 9 9 9"],
  }),
  M({
    t: "Anagram Check", s: "anagram-check", g: ["Strings", "Sorting"],
    d: "Two strings are anagrams if one can be rearranged to form the other. Write a program that checks whether two given strings are anagrams.",
    i: "Two lines. Each line contains one string (lowercase letters only).", o: "Print yes if the strings are anagrams, otherwise print no.",
    c: ["1 <= length <= 10^4"],
    f: (s) => {
      const [a, b] = linesOf(s);
      const key = (t) => [...t].sort().join("");
      return key(a) === key(b) ? "yes" : "no";
    },
    x: ["listen\nsilent", "hello\nworld", "a\na", "anagram\nnagaram", "rat\ncar"],
  }),
  M({
    t: "Longest Word", s: "longest-word", g: ["Strings"],
    d: "Given a sentence, write a program that prints the longest word. If there is a tie, print the word that appears first.",
    i: "A single line containing the sentence (words separated by single spaces).", o: "Print the longest word.",
    c: ["1 <= length <= 10^4"],
    f: (s) => s.split(" ").reduce((a, b) => (b.length > a.length ? b : a)),
    x: ["the quick brown fox", "a", "hello world", "TechVerse coding arena", "one two three four"],
  }),
  M({
    t: "Reverse Words in a Sentence", s: "reverse-words", g: ["Strings"],
    d: "Given a sentence, write a program that prints the words in reverse order (the last word first).",
    i: "A single line containing the sentence (words separated by single spaces).", o: "Print the words in reverse order separated by single spaces.",
    c: ["1 <= length <= 10^4"],
    f: (s) => s.split(" ").reverse().join(" "),
    x: ["hello world", "a b c", "TechVerse is great", "one", "x y"],
  }),
  M({
    t: "Count Vowels and Consonants", s: "count-vowels-consonants", g: ["Strings", "Counting"],
    d: "Given a string of English letters, write a program that prints its number of vowels and its number of consonants.",
    i: "A single line containing the string (letters only).", o: "Print the vowel count followed by a space and the consonant count.",
    c: ["1 <= length <= 10^4"],
    f: (s) => {
      const lower = s.toLowerCase();
      const vowels = [...lower].filter((c) => "aeiou".includes(c)).length;
      return `${vowels} ${lower.length - vowels}`;
    },
    x: ["hello", "AEIOU", "sky", "Programming", "xyz"],
  }),
  M({
    t: "Nth Fibonacci Number", s: "nth-fibonacci", g: ["Series", "Dynamic Programming"],
    d: "Write a program that prints the Nth term of the Fibonacci series where the 1st term is 0 and the 2nd term is 1.",
    i: "A single integer N (N >= 1).", o: "Print the Nth Fibonacci number.",
    c: ["1 <= N <= 90"],
    f: (s) => {
      const n = Number(s.trim());
      if (n <= 1) return "0";
      let a = 0n, b = 1n;
      for (let i = 2; i < n; i++) [a, b] = [b, a + b];
      return String(b);
    },
    x: ["1", "2", "10", "20", "50"],
  }),
  M({
    t: "Digital Root", s: "digital-root", g: ["Digits", "Loops"],
    d: "The digital root of a number is the single-digit value obtained by repeatedly summing its digits. Write a program to find it.",
    i: "A single non-negative integer N.", o: "Print the digital root of N.",
    c: ["0 <= N <= 10^18"],
    f: (s) => {
      let t = s.trim();
      while (t.length > 1) {
        t = String([...t].reduce((a, d) => a + Number(d), 0));
      }
      return t;
    },
    x: ["12345", "999", "5", "987654321", "0"],
  }),
  M({
    t: "nCr Combination", s: "ncr-combination", g: ["Math", "Combinatorics"],
    d: "Write a program that prints the number of ways to choose R items from N items (N choose R).",
    i: "A single line containing two integers N and R separated by space.", o: "Print nCr.",
    c: ["0 <= R <= N <= 30"],
    f: (s) => {
      const [n, r] = intsOf(s);
      const fact = (k) => { let v = 1n; for (let i = 2n; i <= BigInt(k); i++) v *= i; return v; };
      const bn = BigInt(n), br = BigInt(r);
      return String(fact(n) / (fact(r) * fact(n - r)));
    },
    x: ["5 2", "10 3", "20 10", "7 7", "6 0"],
  }),
  M({
    t: "Primes up to N", s: "primes-up-to-n", g: ["Number Theory", "Sieve"],
    d: "Write a program that prints all prime numbers less than or equal to N in ascending order.",
    i: "A single integer N (N >= 1).", o: "Print the primes separated by single spaces.",
    c: ["1 <= N <= 10^6"],
    f: (s) => {
      const n = Number(s.trim());
      const primes = [];
      for (let i = 2; i <= n; i++) {
        let ok = true;
        for (let j = 2; j * j <= i; j++) if (i % j === 0) { ok = false; break; }
        if (ok) primes.push(i);
      }
      return primes.join(" ");
    },
    x: ["10", "2", "3", "30", "50"],
  }),
  M({
    t: "Palindromes in a Range", s: "palindromes-in-range", g: ["Digits", "Loops"],
    d: "Given two integers A and B (A <= B), write a program that prints all numbers between A and B (inclusive) that are palindromes.",
    i: "A single line containing two integers A and B.", o: "Print the palindrome numbers separated by single spaces, in ascending order.",
    c: ["1 <= A <= B <= 10^6"],
    f: (s) => {
      const [a, b] = intsOf(s);
      const out = [];
      for (let n = a; n <= b; n++) {
        const t = String(n);
        if (t === t.split("").reverse().join("")) out.push(n);
      }
      return out.join(" ");
    },
    x: ["1 20", "100 120", "10 99", "1 1", "1000 1001"],
  }),
  E({
    t: "Decimal to Octal", s: "decimal-to-octal", g: ["Number Systems"],
    d: "Write a program that converts a non-negative decimal integer N to its octal representation.",
    i: "A single non-negative integer N.", o: "Print the octal representation of N.",
    c: ["0 <= N <= 10^9"],
    f: (s) => Number(s.trim()).toString(8),
    x: ["10", "255", "0", "64", "100"],
  }),
  M({
    t: "Octal to Decimal", s: "octal-to-decimal", g: ["Number Systems"],
    d: "Write a program that converts an octal string O to its decimal value.",
    i: "A single octal string O (digits 0-7 only).", o: "Print the decimal value.",
    c: ["1 <= length of O <= 12"],
    f: (s) => String(parseInt(s.trim(), 8)),
    x: ["12", "377", "0", "100", "144"],
  }),
  M({
    t: "Hexadecimal to Decimal", s: "hex-to-decimal", g: ["Number Systems"],
    d: "Write a program that converts a hexadecimal string H to its decimal value.",
    i: "A single hexadecimal string H (uppercase letters A-F and digits 0-9).", o: "Print the decimal value.",
    c: ["1 <= length of H <= 8"],
    f: (s) => String(parseInt(s.trim(), 16)),
    x: ["A", "FF", "0", "10", "2A"],
  }),
  M({
    t: "Decimal to Hexadecimal", s: "decimal-to-hex", g: ["Number Systems"],
    d: "Write a program that converts a non-negative decimal integer N to its hexadecimal representation in uppercase.",
    i: "A single non-negative integer N.", o: "Print the hexadecimal representation of N in uppercase.",
    c: ["0 <= N <= 10^9"],
    f: (s) => Number(s.trim()).toString(16).toUpperCase(),
    x: ["10", "255", "0", "16", "42"],
  }),
  M({
    t: "Maximum Subarray Sum", s: "max-subarray-sum", g: ["Array", "Kadane"],
    d: "Given an array of N integers (which may contain negatives), write a program that prints the sum of the contiguous subarray with the largest sum.",
    i: "First line contains N. Second line contains N integers.", o: "Print the maximum subarray sum.",
    c: ["1 <= N <= 10^5", "-10^6 <= element <= 10^6"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      let best = arr[0], cur = arr[0];
      for (let i = 1; i < arr.length; i++) {
        cur = Math.max(arr[i], cur + arr[i]);
        best = Math.max(best, cur);
      }
      return String(best);
    },
    x: ["9\n-2 1 -3 4 -1 2 1 -5 4", "1\n-5", "5\n1 2 3 4 5", "5\n-1 -2 -3 -4 -5", "4\n7 -6 -1 2"],
  }),
  M({
    t: "Two Sum Indices", s: "two-sum-indices", g: ["Array", "Hash Map"],
    d: "Given an array of N integers and a target value T, write a program that prints the indices (0-based, i < j) of the two numbers that add up to T. Exactly one solution is guaranteed.",
    i: "First line contains N. Second line contains N integers. Third line contains T.", o: "Print the 0-based indices 'i j' where nums[i] + nums[j] = T.",
    c: ["2 <= N <= 10^5", "Exactly one valid pair exists"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      const target = rows[2][0];
      const seen = new Map();
      for (let i = 0; i < arr.length; i++) {
        if (seen.has(target - arr[i])) return `${seen.get(target - arr[i])} ${i}`;
        if (!seen.has(arr[i])) seen.set(arr[i], i);
      }
      return "-1 -1";
    },
    x: ["4\n2 7 11 15\n9", "3\n3 2 4\n6", "2\n3 3\n6", "5\n-1 -2 -3 -4 -5\n-8", "4\n1 9 5 4\n10"],
  }),
  M({
    t: "Merge Two Sorted Arrays", s: "merge-sorted-arrays", g: ["Array", "Two Pointers"],
    d: "Given two sorted arrays, write a program that prints the merged sorted array.",
    i: "First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.", o: "Print the merged sorted array separated by single spaces.",
    c: ["1 <= N, M <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      return [...rows[1], ...rows[2]].sort((a, b) => a - b).join(" ");
    },
    x: ["3 4\n1 3 5\n2 4 6 8", "2 2\n1 2\n3 4", "1 1\n5\n5", "1 3\n1\n2 3 4", "3 3\n1 4 7\n2 5 8"],
  }),
  M({
    t: "Missing Number", s: "missing-number", g: ["Array", "Math"],
    d: "You are given N numbers taken from the set {0, 1, 2, ..., N}; exactly one number from that set is missing. Write a program that finds the missing number.",
    i: "First line contains N. Second line contains N integers (all distinct, taken from 0..N).", o: "Print the missing number.",
    c: ["1 <= N <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const present = new Set(rows[1]);
      for (let i = 0; i <= n; i++) if (!present.has(i)) return String(i);
      return "-1";
    },
    x: ["3\n0 1 3", "5\n0 1 2 4 5", "2\n1 2", "4\n0 2 3 4", "1\n0"],
  }),
  M({
    t: "Rotate Array Right by K", s: "rotate-array", g: ["Array", "Two Pointers"],
    d: "Given an array of N integers and an integer K, write a program that rotates the array to the right by K positions.",
    i: "First line contains N and K. Second line contains N integers.", o: "Print the rotated array separated by single spaces.",
    c: ["1 <= N <= 10^5", "0 <= K <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const [n, k] = rows[0];
      const arr = rows[1];
      const r = k % n;
      if (r === 0) return arr.join(" ");
      return [...arr.slice(n - r), ...arr.slice(0, n - r)].join(" ");
    },
    x: ["5 2\n1 2 3 4 5", "5 0\n1 2 3 4 5", "5 7\n1 2 3 4 5", "3 1\n1 2 3", "4 4\n1 2 3 4"],
  }),
  M({
    t: "Find the Duplicate", s: "find-duplicate", g: ["Array", "Hash Set"],
    d: "An array of N integers is given in which exactly one value appears more than once; all other values are distinct. Write a program that prints the duplicate value.",
    i: "First line contains N. Second line contains N integers.", o: "Print the value that appears more than once.",
    c: ["2 <= N <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const seen = new Set();
      for (const v of rows[1]) {
        if (seen.has(v)) return String(v);
        seen.add(v);
      }
      return "-1";
    },
    x: ["5\n1 3 4 2 3", "4\n2 1 3 2", "3\n1 2 1", "6\n4 4 1 2 3 5", "4\n1 1 2 3"],
  }),
  M({
    t: "Common Elements of Two Arrays", s: "common-elements", g: ["Array", "Hash Set"],
    d: "Given two arrays, write a program that prints the values common to both, in the order they first appear in the first array, without duplicates.",
    i: "First line contains N and M. Second line contains N integers. Third line contains M integers.", o: "Print the common values separated by single spaces.",
    c: ["1 <= N, M <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const setB = new Set(rows[2]);
      const out = [];
      for (const v of rows[1]) if (setB.has(v) && !out.includes(v)) out.push(v);
      return out.join(" ");
    },
    x: ["4 5\n1 2 3 4\n2 4 6 8 10", "3 3\n1 2 3\n2 3 4", "2 2\n5 5\n5 5", "4 2\n1 2 3 4\n4 2", "3 4\n7 8 9\n8 9 0 1"],
  }),
  M({
    t: "Recursive Factorial", s: "recursive-factorial", g: ["Recursion", "Arithmetic"],
    d: "Write a program that computes the factorial of N (N!) using recursion.",
    i: "A single integer N (0 <= N <= 20).", o: "Print N!.",
    c: ["0 <= N <= 20"],
    f: (s) => {
      const fact = (n) => (n <= 1n ? 1n : n * fact(n - 1n));
      return String(fact(BigInt(s.trim())));
    },
    x: ["5", "0", "10", "20", "7"],
  }),
  M({
    t: "Recursive Power", s: "recursive-power", g: ["Recursion", "Arithmetic"],
    d: "Write a program that computes A^B using recursion.",
    i: "A single line containing two integers A and B.", o: "Print A^B.",
    c: ["-10 <= A <= 10", "0 <= B <= 20"],
    f: (s) => {
      const [a, b] = intsOf(s);
      const pow = (x, y) => (y === 0 ? 1 : x * pow(x, y - 1));
      return String(pow(a, b));
    },
    x: ["2 10", "3 3", "5 0", "1 100", "10 2"],
  }),
  M({
    t: "Recursive Sum of Digits", s: "recursive-sum-digits", g: ["Recursion", "Digits"],
    d: "Write a program that prints the sum of the digits of a non-negative integer N using recursion.",
    i: "A single non-negative integer N.", o: "Print the sum of digits.",
    c: ["0 <= N <= 10^9"],
    f: (s) => {
      const sum = (t) => (t.length === 0 ? 0 : Number(t[0]) + sum(t.slice(1)));
      return String(sum(s.trim()));
    },
    x: ["123", "0", "999", "1024", "111111"],
  }),
  M({
    t: "Sum of Series x + x^2 + ... + x^n", s: "sum-of-series-powers", g: ["Loops", "Series"],
    d: "Given x and n, write a program that prints x^1 + x^2 + ... + x^n.",
    i: "A single line containing two integers x and n.", o: "Print the sum of the series.",
    c: ["1 <= x <= 3", "1 <= n <= 10"],
    f: (s) => {
      const [x, n] = intsOf(s);
      let sum = 0, term = 1;
      for (let i = 1; i <= n; i++) { term *= x; sum += term; }
      return String(sum);
    },
    x: ["2 3", "3 3", "1 10", "2 10", "5 2"],
  }),
  M({
    t: "Armstrong Numbers in a Range", s: "armstrong-range", g: ["Digits", "Number Theory"],
    d: "An N-digit number is an Armstrong number if the sum of each digit raised to the power N equals the number itself. Given A and B, write a program that prints all Armstrong numbers in the range [A, B].",
    i: "A single line containing two integers A and B.", o: "Print the Armstrong numbers separated by single spaces.",
    c: ["1 <= A <= B <= 10^6"],
    f: (s) => {
      const [a, b] = intsOf(s);
      const out = [];
      for (let n = a; n <= b; n++) {
        const t = String(n);
        const k = t.length;
        const sum = [...t].reduce((s2, d) => s2 + Number(d) ** k, 0);
        if (sum === n) out.push(n);
      }
      return out.join(" ");
    },
    x: ["1 9", "100 999", "10 200", "370 372", "153 153"],
  }),
  M({
    t: "Perfect Numbers in a Range", s: "perfect-range", g: ["Number Theory", "Loops"],
    d: "Given A and B, write a program that prints all perfect numbers in the range [A, B]. A number is perfect if it equals the sum of its proper divisors.",
    i: "A single line containing two integers A and B.", o: "Print the perfect numbers separated by single spaces.",
    c: ["1 <= A <= B <= 10^6"],
    f: (s) => {
      const [a, b] = intsOf(s);
      const perfect = (n) => {
        if (n < 2) return false;
        let sum = 1;
        for (let i = 2; i * i <= n; i++) {
          if (n % i === 0) { sum += i; if (i !== n / i) sum += n / i; }
        }
        return sum === n;
      };
      const out = [];
      for (let n = a; n <= b; n++) if (perfect(n)) out.push(n);
      return out.join(" ");
    },
    x: ["1 30", "1 10000", "28 29", "1 6", "100 500"],
  }),
  M({
    t: "Floyd's Triangle", s: "floyds-triangle", g: ["Patterns", "Loops"],
    d: "Write a program that prints Floyd's triangle with N rows, filled with consecutive natural numbers starting from 1.",
    i: "A single integer N (N >= 1).", o: "Print N rows; row i contains i numbers separated by single spaces.",
    c: ["1 <= N <= 20"],
    f: (s) => {
      const n = Number(s.trim());
      let num = 1;
      const out = [];
      for (let i = 1; i <= n; i++) {
        const row = [];
        for (let j = 0; j < i; j++) row.push(num++);
        out.push(row.join(" "));
      }
      return out.join("\n");
    },
    x: ["3", "1", "4", "5", "2"],
  }),
  M({
    t: "Hollow Square Pattern", s: "hollow-square-pattern", g: ["Patterns", "Loops"],
    d: "Write a program that prints a hollow square of asterisks with side length N (border made of asterisks, interior is empty).",
    i: "A single integer N (N >= 1).", o: "Print N lines forming the hollow square.",
    c: ["1 <= N <= 50"],
    f: (s) => {
      const n = Number(s.trim());
      const out = [];
      for (let i = 0; i < n; i++) {
        if (i === 0 || i === n - 1) out.push("*".repeat(n));
        else out.push("*" + " ".repeat(Math.max(0, n - 2)) + (n > 1 ? "*" : ""));
      }
      return out.join("\n");
    },
    x: ["1", "2", "3", "4", "5"],
  }),
  M({
    t: "Diamond Pattern", s: "diamond-pattern", g: ["Patterns", "Loops"],
    d: "Write a program that prints a diamond of asterisks where the middle row has 2N - 1 asterisks.",
    i: "A single integer N (N >= 1).", o: "Print the diamond pattern. Use spaces for indentation; no trailing spaces.",
    c: ["1 <= N <= 40"],
    f: (s) => {
      const n = Number(s.trim());
      const lines = [];
      for (let i = 0; i < n; i++) lines.push(" ".repeat(n - i - 1) + "*".repeat(2 * i + 1));
      for (let i = n - 2; i >= 0; i--) lines.push(" ".repeat(n - i - 1) + "*".repeat(2 * i + 1));
      return lines.join("\n");
    },
    x: ["1", "2", "3", "4", "2"],
  }),
  M({
    t: "Number Pyramid", s: "number-pyramid", g: ["Patterns", "Loops"],
    d: "Write a program that prints a centered pyramid of numbers with N rows. Row i contains the numbers 1 through i.",
    i: "A single integer N (N >= 1).", o: "Print N centered rows. Row i has (N - i) leading spaces, then '1 2 ... i'.",
    c: ["1 <= N <= 40"],
    f: (s) => {
      const n = Number(s.trim());
      const out = [];
      for (let i = 1; i <= n; i++) {
        const nums = Array.from({ length: i }, (_, k) => k + 1).join(" ");
        out.push(" ".repeat(n - i) + nums);
      }
      return out.join("\n");
    },
    x: ["3", "1", "4", "2", "5"],
  }),
  M({
    t: "Run-Length Encoding", s: "run-length-encode", g: ["Strings", "Compression"],
    d: "Write a program that compresses a string using run-length encoding: consecutive identical characters become the character followed by its count.",
    i: "A single line containing the string (lowercase letters only).", o: "Print the encoded string.",
    c: ["1 <= length <= 10^4"],
    f: (s) => {
      let out = "";
      let i = 0;
      while (i < s.length) {
        let j = i;
        while (j < s.length && s[j] === s[i]) j++;
        out += s[i] + String(j - i);
        i = j;
      }
      return out;
    },
    x: ["aabbbcc", "abc", "zzz", "aabb", "aaabaa"],
  }),
  M({
    t: "First Non-Repeating Character", s: "first-non-repeating", g: ["Strings", "Counting"],
    d: "Given a string, write a program that prints the first character that does not repeat anywhere else in the string, or -1 if every character repeats.",
    i: "A single line containing the string (lowercase letters only).", o: "Print the first non-repeating character, or -1.",
    c: ["1 <= length <= 10^5"],
    f: (s) => {
      for (let i = 0; i < s.length; i++) {
        if (s.indexOf(s[i]) === s.lastIndexOf(s[i])) return s[i];
      }
      return "-1";
    },
    x: ["leetcode", "loveleetcode", "aabb", "abcdab", "aa"],
  }),
  M({
    t: "Remove Vowels", s: "remove-vowels", g: ["Strings"],
    d: "Write a program that removes all vowels (a, e, i, o, u) from a given string. Matching is case-insensitive.",
    i: "A single line containing the string.", o: "Print the string with all vowels removed.",
    c: ["1 <= length <= 10^4"],
    f: (s) => [...s].filter((c) => !"aeiouAEIOU".includes(c)).join(""),
    x: ["hello", "TechVerse", "apple", "banana", "xyz"],
  }),
  M({
    t: "Title Case a Sentence", s: "title-case", g: ["Strings"],
    d: "Write a program that converts a sentence to title case: the first letter of every word is uppercase and the remaining letters are lowercase.",
    i: "A single line containing the sentence (words separated by single spaces).", o: "Print the sentence in title case.",
    c: ["1 <= length <= 10^4"],
    f: (s) =>
      s.split(" ").map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" "),
    x: ["hello world", "a", "the quick brown fox", "tECHVERSE coding arena", "wELCOME TO vcet"],
  }),
  M({
    t: "Balanced Parentheses", s: "balanced-parentheses", g: ["String", "Stack"],
    d: "Given a string containing only the characters '(' and ')', write a program that checks whether the parentheses are properly balanced.",
    i: "A single line containing the bracket string.", o: "Print yes if balanced, otherwise print no.",
    c: ["1 <= length <= 10^5"],
    f: (s) => {
      let bal = 0;
      for (const c of s) {
        if (c === "(") bal++;
        else bal--;
        if (bal < 0) return "no";
      }
      return bal === 0 ? "yes" : "no";
    },
    x: ["()", "(()", "()()", ")((", "((()))"],
  }),
  M({
    t: "Subarray with Given Sum", s: "subarray-with-given-sum", g: ["Array", "Sliding Window"],
    d: "Given an array of N positive integers and a target sum S, write a program that finds a contiguous subarray whose elements add up to S, using 1-based indices.",
    i: "First line contains N and S. Second line contains N positive integers.", o: "Print the 1-based start and end index 'l r' of the subarray, or -1 if none exists.",
    c: ["1 <= N <= 10^5", "At most one such subarray is guaranteed"],
    f: (s) => {
      const rows = linInts(s);
      const [n, target] = rows[0];
      const arr = rows[1];
      let l = 0, sum = 0;
      for (let r = 0; r < n; r++) {
        sum += arr[r];
        while (sum > target) { sum -= arr[l]; l++; }
        if (sum === target) return `${l + 1} ${r + 1}`;
      }
      return "-1";
    },
    x: ["5 12\n1 2 3 7 5", "3 5\n1 3 5", "4 20\n1 2 3 4", "5 15\n1 2 3 4 5", "3 6\n2 2 2"],
  }),
  M({
    t: "Sum of Boundary Elements", s: "boundary-sum", g: ["Matrix", "2D Array"],
    d: "Given a square matrix of size N x N, write a program that prints the sum of the elements on its boundary (first and last rows, first and last columns).",
    i: "First line contains N. Next N lines contain N integers each.", o: "Print the sum of the boundary elements.",
    c: ["1 <= N <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const grid = rows.slice(1, 1 + n);
      if (n === 1) return String(grid[0][0]);
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += grid[0][i] + grid[n - 1][i] + grid[i][0] + grid[i][n - 1];
      }
      sum -= grid[0][0] + grid[0][n - 1] + grid[n - 1][0] + grid[n - 1][n - 1];
      return String(sum);
    },
    x: ["3\n1 2 3\n4 5 6\n7 8 9", "1\n5", "2\n1 2\n3 4", "4\n1 0 0 1\n0 2 2 0\n0 3 3 0\n4 0 0 5", "3\n9 9 9\n9 9 9\n9 9 9"],
  }),
  M({
    t: "Second Largest Element", s: "second-largest", g: ["Array"],
    d: "Given an array of N integers, write a program that prints the second largest distinct value. If there are fewer than two distinct values, print -1.",
    i: "First line contains N. Second line contains N integers.", o: "Print the second largest distinct value, or -1.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const distinct = [...new Set(rows[1])].sort((a, b) => b - a);
      return distinct.length >= 2 ? String(distinct[1]) : "-1";
    },
    x: ["5\n5 3 4 2 3", "3\n1 1 1", "4\n10 20 30 40", "5\n7 7 6 6 5", "2\n9 9"],
  }),
  M({
    t: "Product of Non-Zero Digits", s: "product-of-digits", g: ["Digits", "Loops"],
    d: "Given a positive integer N, write a program that prints the product of its digits, ignoring any zero digits.",
    i: "A single positive integer N.", o: "Print the product of the non-zero digits.",
    c: ["1 <= N <= 10^9"],
    f: (s) => String([...s.trim()].filter((d) => d !== "0").reduce((a, d) => a * Number(d), 1)),
    x: ["123", "0", "205", "999", "1000"],
  }),
  M({
    t: "Count Negatives, Zeros and Positives", s: "count-neg-zero-pos", g: ["Array", "Counting"],
    d: "Given an array of N integers, write a program that prints the count of negative numbers, the count of zeros, and the count of positive numbers.",
    i: "First line contains N. Second line contains N integers.", o: "Print three numbers: negative count, zero count, positive count.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      let neg = 0, zero = 0, pos = 0;
      for (const v of rows[1]) { if (v < 0) neg++; else if (v === 0) zero++; else pos++; }
      return `${neg} ${zero} ${pos}`;
    },
    x: ["5\n-1 0 2 -3 4", "3\n0 0 0", "4\n1 2 3 4", "4\n-1 -2 -3 -4", "1\n0"],
  }),
];
/* =========================================================================
   ADVANCED - 50 HARD PROGRAMS
   ========================================================================= */
const ADVANCED = [
  H({
    t: "Longest Increasing Subsequence", s: "longest-increasing-subsequence", g: ["Dynamic Programming", "Array"],
    d: "Given an array of N integers, write a program that prints the length of the longest strictly increasing subsequence.",
    i: "First line contains N. Second line contains N integers.", o: "Print the length of the LIS.",
    c: ["1 <= N <= 10^4", "-10^6 <= element <= 10^6"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1];
      const tails = [];
      for (const x of arr) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < x) lo = mid + 1; else hi = mid;
        }
        tails[lo] = x;
      }
      return String(tails.length);
    },
    x: ["8\n10 9 2 5 3 7 101 18", "6\n0 1 0 3 2 3", "1\n7", "5\n5 4 3 2 1", "5\n3 10 2 1 20"],
  }),
  H({
    t: "Longest Common Subsequence", s: "longest-common-subsequence", g: ["Dynamic Programming", "Strings"],
    d: "Given two strings, write a program that prints the length of their longest common subsequence.",
    i: "Two lines; each line contains one string (lowercase letters).", o: "Print the length of the LCS.",
    c: ["1 <= length <= 10^3"],
    f: (s) => {
      const [a, b] = linesOf(s);
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      return String(dp[m][n]);
    },
    x: ["abcde\nace", "abc\nabc", "abc\ndef", "AGGTAB\nGXTXAYB", "abcba\nabcbcba"],
  }),
  H({
    t: "0/1 Knapsack", s: "zero-one-knapsack", g: ["Dynamic Programming", "Optimization"],
    d: "Given N items each with a value and a weight, and a knapsack of capacity W, write a program that prints the maximum total value that can be carried.",
    i: "First line contains N and W. Second line contains N values. Third line contains N weights.", o: "Print the maximum value.",
    c: ["1 <= N <= 10^3", "0 <= W <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [n, W] = rows[0];
      const vals = rows[1];
      const wts = rows[2];
      const dp = new Array(W + 1).fill(0);
      for (let i = 0; i < n; i++)
        for (let w = W; w >= wts[i]; w--)
          dp[w] = Math.max(dp[w], dp[w - wts[i]] + vals[i]);
      return String(dp[W]);
    },
    x: ["3 50\n60 100 120\n10 20 30", "4 7\n1 4 5 7\n1 3 4 5", "2 5\n2 3\n1 3", "1 1\n5\n2", "3 10\n10 20 30\n5 6 7"],
  }),
  H({
    t: "Coin Change (Minimum Coins)", s: "coin-change-min-coins", g: ["Dynamic Programming", "Greedy"],
    d: "Given N coin denominations (unlimited supply of each) and an amount A, write a program that prints the fewest number of coins needed to make A, or -1 if it is impossible.",
    i: "First line contains N. Second line contains N coin values. Third line contains A.", o: "Print the minimum number of coins, or -1.",
    c: ["1 <= N <= 20", "0 <= A <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const coins = rows[1];
      const A = rows[2][0];
      const dp = new Array(A + 1).fill(Infinity);
      dp[0] = 0;
      for (let i = 1; i <= A; i++)
        for (const c of coins) if (c <= i) dp[i] = Math.min(dp[i], dp[i - c] + 1);
      return dp[A] === Infinity ? "-1" : String(dp[A]);
    },
    x: ["3\n1 2 5\n11", "2\n1 2\n4", "1\n2\n3", "3\n2 3 6\n8", "3\n1 5 10\n17"],
  }),
  H({
    t: "Edit Distance", s: "edit-distance", g: ["Dynamic Programming", "Strings"],
    d: "Given two strings, write a program that prints the minimum number of operations (insert, delete, or replace a character) required to convert the first string into the second.",
    i: "Two lines; each line contains one string (lowercase letters).", o: "Print the minimum edit distance.",
    c: ["1 <= length <= 10^3"],
    f: (s) => {
      const [a, b] = linesOf(s);
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
          dp[i][j] = a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      return String(dp[m][n]);
    },
    x: ["horse\nros", "intention\nexecution", "abc\nabc", "a\nb", "kitten\nsitting"],
  }),
  H({
    t: "Longest Palindromic Substring", s: "longest-palindromic-substring", g: ["Strings", "Dynamic Programming"],
    d: "Given a string s, write a program that prints the longest palindromic substring. If multiple have the same length, print the one that appears first.",
    i: "A single line containing the string.", o: "Print the longest palindromic substring.",
    c: ["1 <= length <= 10^3"],
    f: (s) => {
      let best = s[0];
      for (let i = 0; i < s.length; i++) {
        for (let j = i; j < s.length; j++) {
          const sub = s.slice(i, j + 1);
          if (sub === sub.split("").reverse().join("") && sub.length > best.length) best = sub;
        }
      }
      return best;
    },
    x: ["babad", "cbbd", "a", "ac", "racecar"],
  }),
  H({
    t: "Nth Fibonacci Number (Fast)", s: "nth-fibonacci-fast", g: ["Dynamic Programming", "Big Numbers"],
    d: "Write a program that prints the Nth term of the Fibonacci series (1st term 0, 2nd term 1) for large N.",
    i: "A single integer N (N >= 1).", o: "Print the Nth Fibonacci number.",
    c: ["1 <= N <= 100"],
    f: (s) => {
      const n = Number(s.trim());
      if (n <= 1) return "0";
      let a = 0n, b = 1n;
      for (let i = 2; i < n; i++) [a, b] = [b, a + b];
      return String(b);
    },
    x: ["50", "90", "100", "1", "20"],
  }),
  H({
    t: "N-Queens Problem", s: "n-queens-count", g: ["Backtracking", "Recursion"],
    d: "Write a program that prints the number of distinct ways to place N queens on an N x N chessboard so that no two queens attack each other.",
    i: "A single integer N.", o: "Print the number of solutions.",
    c: ["1 <= N <= 10"],
    f: (s) => {
      const n = Number(s.trim());
      let count = 0;
      const cols = new Set(), diag1 = new Set(), diag2 = new Set();
      const backtrack = (row) => {
        if (row === n) { count++; return; }
        for (let c = 0; c < n; c++) {
          const d1 = row - c, d2 = row + c;
          if (cols.has(c) || diag1.has(d1) || diag2.has(d2)) continue;
          cols.add(c); diag1.add(d1); diag2.add(d2);
          backtrack(row + 1);
          cols.delete(c); diag1.delete(d1); diag2.delete(d2);
        }
      };
      backtrack(0);
      return String(count);
    },
    x: ["1", "2", "4", "8", "5"],
  }),
  H({
    t: "String Permutations", s: "string-permutations", g: ["Backtracking", "Strings"],
    d: "Given a string of distinct lowercase letters, write a program that prints all its unique permutations in lexicographic order, separated by single spaces.",
    i: "A single line containing the string (distinct characters).", o: "Print all permutations separated by single spaces.",
    c: ["1 <= length <= 5"],
    f: (s) => {
      const chars = [...s].sort();
      const used = new Array(chars.length).fill(false);
      const out = [];
      const rec = (cur) => {
        if (cur.length === chars.length) { out.push(cur.join("")); return; }
        for (let i = 0; i < chars.length; i++) {
          if (used[i]) continue;
          used[i] = true;
          rec([...cur, chars[i]]);
          used[i] = false;
        }
      };
      rec([]);
      return out.join(" ");
    },
    x: ["abc", "ab", "a", "bcd", "lmn"],
  }),
  H({
    t: "Subset Sum", s: "subset-sum", g: ["Dynamic Programming", "Backtracking"],
    d: "Given an array of N positive integers and a target sum S, write a program that checks whether some subset of the array adds up to S.",
    i: "First line contains N and S. Second line contains N positive integers.", o: "Print yes if such a subset exists, otherwise print no.",
    c: ["1 <= N <= 10^3", "1 <= S <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const [n, S] = rows[0];
      const dp = new Array(S + 1).fill(false);
      dp[0] = true;
      for (let i = 0; i < n; i++)
        for (let j = S; j >= rows[1][i]; j--)
          if (dp[j - rows[1][i]]) dp[j] = true;
      return dp[S] ? "yes" : "no";
    },
    x: ["6 9\n3 34 4 12 5 2", "5 30\n5 10 15 20 25", "4 12\n2 4 6 8", "3 100\n1 2 3", "5 1\n2 4 6 8 10"],
  }),
  H({
    t: "Rat in a Maze (Path Count)", s: "rat-in-a-maze", g: ["Dynamic Programming", "Grid"],
    d: "A rat is at the top-left corner of an N x N grid and must reach the bottom-right corner, moving only right or down. 1 means open, 0 means blocked. Write a program that prints the number of valid paths.",
    i: "First line contains N. Next N lines contain N cells each (0 or 1).", o: "Print the number of paths from (0,0) to (N-1,N-1).",
    c: ["1 <= N <= 50", "Cells are 1 (open) or 0 (blocked)"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const grid = rows.slice(1, 1 + n);
      const dp = Array.from({ length: n }, () => new Array(n).fill(0));
      if (grid[0][0] === 1) dp[0][0] = 1;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (r === 0 && c === 0) continue;
          if (grid[r][c] === 0) continue;
          if (r > 0) dp[r][c] += dp[r - 1][c];
          if (c > 0) dp[r][c] += dp[r][c - 1];
        }
      return String(dp[n - 1][n - 1]);
    },
    x: ["3\n1 0 0\n1 1 0\n0 1 1", "3\n1 1 1\n1 1 1\n1 1 1", "2\n1 1\n1 1", "1\n1", "3\n0 1 1\n1 1 1\n1 1 1"],
  }),
  H({
    t: "Sudoku Validator", s: "sudoku-validator", g: ["Matrix", "Validation"],
    d: "Write a program that checks whether a given solved 9 x 9 Sudoku grid is valid (rows, columns and each 3x3 box contain digits 1-9 exactly once).",
    i: "Nine lines; each line contains 9 digits (1-9) with no separators.", o: "Print valid if the grid is valid, otherwise print invalid.",
    c: ["The grid is always 9 x 9"],
    f: (s) => {
      const grid = linesOf(s).map((l) => [...l]);
      const check = (list) => {
        const seen = new Set();
        for (const v of list) {
          if (v === "." || v === "") continue;
          if (seen.has(v)) return false;
          seen.add(v);
        }
        return true;
      };
      for (let r = 0; r < 9; r++) if (!check(grid[r])) return "invalid";
      for (let c = 0; c < 9; c++) if (!check(grid.map((row) => row[c]))) return "invalid";
      for (let br = 0; br < 3; br++)
        for (let bc = 0; bc < 3; bc++) {
          const box = [];
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++) box.push(grid[br * 3 + r][bc * 3 + c]);
          if (!check(box)) return "invalid";
        }
      return "valid";
    },
    x: [
      "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179",
      "123456789\n456789123\n789123456\n234567891\n567891234\n891234567\n345678912\n678912345\n912345678",
      "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286178",
      "111111111\n222222222\n333333333\n444444444\n555555555\n666666666\n777777777\n888888888\n999999999",
      "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179",
    ],
  }),
  H({
    t: "Activity Selection", s: "activity-selection", g: ["Greedy", "Sorting"],
    d: "Given N activities with start and end times, write a program that prints the maximum number of activities a single person can perform, assuming each activity must finish before another can start.",
    i: "First line contains N. Second line contains N start times. Third line contains N end times.", o: "Print the maximum number of activities.",
    c: ["1 <= N <= 10^5", "0 <= start < end <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const acts = rows[1].map((start, i) => [start, rows[2][i]]).sort((a, b) => a[1] - b[1]);
      let count = 0, lastEnd = -Infinity;
      for (const [start, end] of acts) {
        if (start >= lastEnd) { count++; lastEnd = end; }
      }
      return String(count);
    },
    x: ["6\n1 3 0 5 8 5\n2 4 6 7 9 9", "3\n1 2 3\n2 3 4", "1\n5\n9", "4\n1 3 2 0\n5 4 3 6", "5\n1 3 0 5 8\n2 4 6 7 9"],
  }),
  H({
    t: "Minimum Platforms", s: "minimum-platforms", g: ["Greedy", "Sorting"],
    d: "Given the arrival and departure times (in minutes) of N trains, write a program that prints the minimum number of platforms required so that no train has to wait.",
    i: "First line contains N. Second line contains N arrival times. Third line contains N departure times.", o: "Print the minimum number of platforms.",
    c: ["1 <= N <= 10^5", "0 <= time <= 1439"],
    f: (s) => {
      const rows = linInts(s);
      const arr = rows[1].slice().sort((a, b) => a - b);
      const dep = rows[2].slice().sort((a, b) => a - b);
      let platforms = 0, max = 0, i = 0, j = 0;
      while (i < arr.length) {
        if (arr[i] <= dep[j]) { platforms++; max = Math.max(max, platforms); i++; }
        else { platforms--; j++; }
      }
      return String(max);
    },
    x: ["6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000", "3\n900 1100 1235\n1000 1200 1240", "1\n900\n910", "4\n100 200 300 400\n110 210 310 410", "3\n900 930 950\n1000 1000 1000"],
  }),
  H({
    t: "Next Permutation", s: "next-permutation", g: ["Array", "Two Pointers"],
    d: "Given an array of N integers, write a program that prints the next lexicographically greater permutation of the array. If the array is the last permutation, print the sorted (smallest) permutation.",
    i: "First line contains N. Second line contains N integers.", o: "Print the next permutation separated by single spaces.",
    c: ["1 <= N <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const a = rows[1];
      let i = a.length - 2;
      while (i >= 0 && a[i] >= a[i + 1]) i--;
      if (i >= 0) {
        let j = a.length - 1;
        while (a[j] <= a[i]) j--;
        [a[i], a[j]] = [a[j], a[i]];
      }
      let l = i + 1, r = a.length - 1;
      while (l < r) { [a[l], a[r]] = [a[r], a[l]]; l++; r--; }
      return a.join(" ");
    },
    x: ["3\n1 2 3", "3\n3 2 1", "3\n1 1 5", "2\n2 1", "4\n1 3 5 4"],
  }),
  H({
    t: "Trapping Rain Water", s: "trapping-rain-water", g: ["Array", "Two Pointers"],
    d: "Given an array of N non-negative integers representing the height of bars (each of unit width), write a program that prints the total units of water that can be trapped between the bars.",
    i: "First line contains N. Second line contains N non-negative integers.", o: "Print the total trapped water units.",
    c: ["1 <= N <= 10^5", "0 <= height <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const h = rows[1];
      let l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
      while (l <= r) {
        if (leftMax <= rightMax) { leftMax = Math.max(leftMax, h[l]); water += leftMax - h[l]; l++; }
        else { rightMax = Math.max(rightMax, h[r]); water += rightMax - h[r]; r--; }
      }
      return String(water);
    },
    x: ["12\n0 1 0 2 1 0 1 3 2 1 2 1", "6\n4 2 0 3 2 5", "1\n5", "3\n3 0 3", "4\n1 2 3 4"],
  }),
  H({
    t: "Largest Rectangle in Histogram", s: "largest-rectangle-histogram", g: ["Stack", "Array"],
    d: "Given N bars of a histogram (heights array), write a program that prints the area of the largest rectangle that can be formed within the histogram.",
    i: "First line contains N. Second line contains N non-negative heights.", o: "Print the maximum rectangle area.",
    c: ["1 <= N <= 10^5", "0 <= height <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const h = rows[1];
      const stack = [];
      let maxArea = 0;
      for (let i = 0; i <= h.length; i++) {
        const cur = i === h.length ? 0 : h[i];
        while (stack.length && cur < h[stack[stack.length - 1]]) {
          const height = h[stack.pop()];
          const width = stack.length ? i - stack[stack.length - 1] - 1 : i;
          maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
      }
      return String(maxArea);
    },
    x: ["6\n2 1 5 6 2 3", "2\n2 4", "1\n6", "4\n2 1 2 1", "7\n6 2 5 4 5 1 6"],
  }),
  H({
    t: "Sliding Window Maximum", s: "sliding-window-maximum", g: ["Deque", "Array"],
    d: "Given an array of N integers and a window size K, write a program that prints the maximum value in every window of size K.",
    i: "First line contains N and K. Second line contains N integers.", o: "Print the window maximums separated by single spaces.",
    c: ["1 <= K <= N <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const [n, k] = rows[0];
      const a = rows[1];
      const dq = [];
      const out = [];
      for (let i = 0; i < n; i++) {
        while (dq.length && a[dq[dq.length - 1]] <= a[i]) dq.pop();
        dq.push(i);
        while (dq[0] <= i - k) dq.shift();
        if (i >= k - 1) out.push(a[dq[0]]);
      }
      return out.join(" ");
    },
    x: ["8 3\n1 3 -1 -3 5 3 6 7", "5 1\n1 2 3 4 5", "5 5\n1 2 3 4 5", "4 2\n4 3 2 1", "6 2\n1 0 2 9 8 7"],
  }),
  H({
    t: "Median of Two Sorted Arrays", s: "median-of-two-sorted-arrays", g: ["Binary Search", "Array"],
    d: "Given two sorted arrays of sizes N and M, write a program that prints the median of the two combined arrays, rounded to 5 decimal places.",
    i: "First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.", o: "Print the median rounded to exactly 5 decimal places.",
    c: ["0 <= N, M <= 10^5", "Both arrays are sorted"],
    f: (s) => {
      const rows = linInts(s);
      const a = rows[1], b = rows[2];
      const merged = [...a, ...b].sort((x, y) => x - y);
      const mid = merged.length >> 1;
      const med = merged.length % 2 === 1 ? merged[mid] : (merged[mid - 1] + merged[mid]) / 2;
      return med.toFixed(5);
    },
    x: ["2 1\n1 3\n2", "2 2\n1 2\n3 4", "1 1\n0\n0", "3 3\n1 2 3\n4 5 6", "3 3\n1 3 5\n2 4 6"],
  }),
  H({
    t: "Merge Intervals", s: "merge-intervals", g: ["Sorting", "Array"],
    d: "Given N intervals, write a program that merges all overlapping intervals and prints the resulting intervals, sorted by start time.",
    i: "First line contains N. Next N lines each contain two integers 'start end'.", o: "Print one merged interval per line as 'start end'.",
    c: ["1 <= N <= 10^5", "0 <= start <= end <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const intervals = rows.slice(1).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const out = [];
      for (const [a, b] of intervals) {
        if (out.length && a <= out[out.length - 1][1]) {
          out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
        } else out.push([a, b]);
      }
      return out.map(([a, b]) => `${a} ${b}`).join("\n");
    },
    x: ["4\n1 3\n2 6\n8 10\n15 18", "2\n1 4\n4 5", "1\n6 6", "4\n2 3\n1 2\n3 4\n5 6", "3\n1 2\n3 4\n5 6"],
  }),
  H({
    t: "Rotate Matrix 90 Degrees", s: "rotate-matrix-90", g: ["Matrix", "2D Array"],
    d: "Given a square matrix of size N x N, write a program that prints the matrix rotated 90 degrees clockwise.",
    i: "First line contains N. Next N lines contain N integers each.", o: "Print the rotated matrix, one row per line, values separated by single spaces.",
    c: ["1 <= N <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const m = rows.slice(1, 1 + n);
      const out = [];
      for (let c = 0; c < n; c++) {
        const line = [];
        for (let r = n - 1; r >= 0; r--) line.push(m[r][c]);
        out.push(line.join(" "));
      }
      return out.join("\n");
    },
    x: ["3\n1 2 3\n4 5 6\n7 8 9", "1\n5", "2\n1 2\n3 4", "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16", "2\n1 1\n1 1"],
  }),
  H({
    t: "Spiral Matrix", s: "spiral-matrix", g: ["Matrix", "Simulation"],
    d: "Given a matrix with R rows and C columns, write a program that prints its elements in spiral order (right, down, left, up).",
    i: "First line contains R and C. Next R lines contain C integers each.", o: "Print the spiral order separated by single spaces.",
    c: ["1 <= R, C <= 100", "-10^3 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [R, C] = rows[0];
      const m = rows.slice(1, 1 + R);
      const out = [];
      let top = 0, bottom = R - 1, left = 0, right = C - 1;
      while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) out.push(m[top][c]);
        top++;
        for (let r = top; r <= bottom; r++) out.push(m[r][right]);
        right--;
        if (top <= bottom) for (let c = right; c >= left; c--) out.push(m[bottom][c]);
        bottom--;
        if (left <= right) for (let r = bottom; r >= top; r--) out.push(m[r][left]);
        left++;
      }
      return out.join(" ");
    },
    x: ["3 3\n1 2 3\n4 5 6\n7 8 9", "2 2\n1 2\n3 4", "1 4\n1 2 3 4", "4 1\n1\n2\n3\n4", "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12"],
  }),
  H({
    t: "Matrix Chain Multiplication", s: "matrix-chain-multiplication", g: ["Dynamic Programming", "Optimization"],
    d: "Given the dimensions of N matrices (N+1 dimension values), write a program that prints the minimum number of scalar multiplications needed to multiply the chain.",
    i: "A single line containing N+1 integers: the dimensions p0, p1, ..., pN.", o: "Print the minimum number of multiplications.",
    c: ["2 <= N <= 50", "1 <= dimension <= 10^3"],
    f: (s) => {
      const p = intsOf(s);
      const n = p.length - 1;
      const dp = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
          const j = i + len - 1;
          dp[i][j] = Infinity;
          for (let k = i; k < j; k++) {
            const cost = dp[i][k] + dp[k + 1][j] + p[i] * p[k + 1] * p[j + 1];
            if (cost < dp[i][j]) dp[i][j] = cost;
          }
        }
      }
      return String(dp[0][n - 1]);
    },
    x: ["40 20 30 10 30", "10 20 30", "5 10 3 12", "2 3 7 5", "1 1 1"],
  }),
  H({
    t: "Unique Paths in a Grid", s: "unique-paths", g: ["Dynamic Programming", "Combinatorics"],
    d: "A robot starts at the top-left of an m x n grid and can only move right or down. Write a program that prints the number of unique paths to reach the bottom-right cell.",
    i: "A single line containing two integers m and n.", o: "Print the number of unique paths.",
    c: ["1 <= m, n <= 15"],
    f: (s) => {
      const [m, n] = intsOf(s);
      const dp = Array.from({ length: m }, () => new Array(n).fill(1));
      for (let i = 1; i < m; i++)
        for (let j = 1; j < n; j++) dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
      return String(dp[m - 1][n - 1]);
    },
    x: ["3 7", "3 2", "1 1", "7 3", "10 10"],
  }),
  H({
    t: "Minimum Path Sum", s: "minimum-path-sum", g: ["Dynamic Programming", "Grid"],
    d: "Given an R x C grid of non-negative integers, write a program that prints the minimum sum of a path from the top-left to the bottom-right cell, moving only right or down.",
    i: "First line contains R and C. Next R lines contain C integers each.", o: "Print the minimum path sum.",
    c: ["1 <= R, C <= 100", "0 <= element <= 10^3"],
    f: (s) => {
      const rows = linInts(s);
      const [R, C] = rows[0];
      const m = rows.slice(1, 1 + R);
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (r === 0 && c === 0) continue;
          if (r === 0) m[r][c] += m[r][c - 1];
          else if (c === 0) m[r][c] += m[r - 1][c];
          else m[r][c] += Math.min(m[r - 1][c], m[r][c - 1]);
        }
      return String(m[R - 1][C - 1]);
    },
    x: ["3 3\n1 3 1\n1 5 1\n4 2 1", "2 2\n1 2\n1 1", "1 1\n5", "2 3\n1 2 3\n4 5 6", "3 2\n1 3\n7 2\n4 5"],
  }),
  H({
    t: "Number of Islands", s: "number-of-islands", g: ["Graph", "DFS"],
    d: "Given an R x C grid of '0' and '1' characters, write a program that counts the number of islands. An island is a group of adjacent '1's connected horizontally or vertically.",
    i: "First line contains R and C. Next R lines contain C characters (0 or 1, no separators).", o: "Print the number of islands.",
    c: ["1 <= R, C <= 100"],
    f: (s) => {
      const lines = linesOf(s);
      const [R, C] = intsOf(lines[0]);
      const grid = lines.slice(1, 1 + R).map((l) => [...l]);
      let count = 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const dfs = (r, c) => {
        if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] !== "1") return;
        grid[r][c] = "0";
        for (const [dr, dc] of dirs) dfs(r + dr, c + dc);
      };
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++)
          if (grid[r][c] === "1") { count++; dfs(r, c); }
      return String(count);
    },
    x: ["4 5\n11000\n11000\n00100\n00011", "1 1\n1", "1 1\n0", "3 3\n111\n101\n111", "5 5\n10101\n01010\n10101\n01010\n10101"],
  }),
  H({
    t: "Maximum Area of an Island", s: "max-area-of-island", g: ["Graph", "DFS"],
    d: "Given an R x C grid of '0' and '1' characters, write a program that prints the area of the largest island (maximum number of connected '1's).",
    i: "First line contains R and C. Next R lines contain C characters (0 or 1, no separators).", o: "Print the area of the largest island.",
    c: ["1 <= R, C <= 100"],
    f: (s) => {
      const lines = linesOf(s);
      const [R, C] = intsOf(lines[0]);
      const grid = lines.slice(1, 1 + R).map((l) => [...l]);
      let best = 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const dfs = (r, c) => {
        if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] !== "1") return 0;
        grid[r][c] = "0";
        let area = 1;
        for (const [dr, dc] of dirs) area += dfs(r + dr, c + dc);
        return area;
      };
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++)
          if (grid[r][c] === "1") best = Math.max(best, dfs(r, c));
      return String(best);
    },
    x: ["4 5\n11000\n01000\n00100\n00011", "3 3\n111\n000\n111", "1 2\n11", "2 2\n10\n10", "2 2\n00\n00"],
  }),
  H({
    t: "Longest Valid Parentheses", s: "longest-valid-parentheses", g: ["Stack", "Strings"],
    d: "Given a string of '(' and ')' characters, write a program that prints the length of the longest well-formed parentheses substring.",
    i: "A single line containing the bracket string.", o: "Print the length of the longest valid substring.",
    c: ["0 <= length <= 10^5"],
    f: (s) => {
      const stack = [-1];
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "(") stack.push(i);
        else {
          stack.pop();
          if (stack.length === 0) stack.push(i);
          else best = Math.max(best, i - stack[stack.length - 1]);
        }
      }
      return String(best);
    },
    x: ["(()", ")()())", "()(()", ")))(((", "(())"],
  }),
  H({
    t: "Word Break", s: "word-break", g: ["Dynamic Programming", "Strings"],
    d: "Given a dictionary of N words and a target string, write a program that checks whether the target can be segmented into a sequence of dictionary words.",
    i: "First line contains N. Second line contains N dictionary words. Third line contains the target string.", o: "Print yes if the string can be segmented, otherwise print no.",
    c: ["1 <= N <= 100", "1 <= word length, target length <= 10^3"],
    f: (s) => {
      const lines = linesOf(s);
      const words = new Set(lines[1].split(/\s+/));
      const target = lines[2];
      const n = target.length;
      const dp = new Array(n + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= n; i++)
        for (let j = 0; j < i; j++)
          if (dp[j] && words.has(target.slice(j, i))) { dp[i] = true; break; }
      return dp[n] ? "yes" : "no";
    },
    x: ["4\nleet code le leet\nleetcode", "3\napple pen\napplepenapple", "2\ncats dog\ncatsandog", "2\na aa\naaab", "1\ncat\ncat"],
  }),
  H({
    t: "Maximum Product Subarray", s: "max-product-subarray", g: ["Array", "Dynamic Programming"],
    d: "Given an array of N integers, write a program that prints the largest product of any contiguous subarray.",
    i: "First line contains N. Second line contains N integers.", o: "Print the maximum product.",
    c: ["1 <= N <= 10^4", "-10 <= element <= 10"],
    f: (s) => {
      const rows = linInts(s);
      const a = rows[1];
      let best = a[0], curMax = a[0], curMin = a[0];
      for (let i = 1; i < a.length; i++) {
        const x = a[i];
        const nextMax = Math.max(x, curMax * x, curMin * x);
        curMin = Math.min(x, curMax * x, curMin * x);
        curMax = nextMax;
        best = Math.max(best, curMax);
      }
      return String(best);
    },
    x: ["4\n2 3 -2 4", "3\n-2 0 -1", "1\n-2", "5\n2 3 -2 4 -1", "3\n-1 -2 -3"],
  }),
  H({
    t: "Kth Largest Element", s: "kth-largest-element", g: ["Heap", "Array"],
    d: "Given an array of N integers and an integer K, write a program that prints the Kth largest element (duplicates counted separately).",
    i: "First line contains N and K. Second line contains N integers.", o: "Print the Kth largest element.",
    c: ["1 <= K <= N <= 10^5"],
    f: (s) => {
      const rows = linInts(s);
      const k = rows[0][1];
      const a = rows[1].slice().sort((x, y) => y - x);
      return String(a[k - 1]);
    },
    x: ["6 2\n3 2 1 5 6 4", "9 4\n3 2 3 1 2 4 5 5 6", "1 1\n7", "5 5\n1 2 3 4 5", "5 3\n5 5 5 5 5"],
  }),
  H({
    t: "Find Peak Element", s: "find-peak-element", g: ["Binary Search", "Array"],
    d: "Given an array for which no two adjacent elements are equal, write a program that prints the index of any peak element (an element strictly greater than its neighbors). Return the leftmost peak found.",
    i: "First line contains N. Second line contains N integers.", o: "Print the 0-based index of a peak element.",
    c: ["1 <= N <= 10^5", "Adjacent elements are never equal"],
    f: (s) => {
      const rows = linInts(s);
      const a = rows[1];
      for (let i = 0; i < a.length; i++) {
        const leftOk = i === 0 || a[i] > a[i - 1];
        const rightOk = i === a.length - 1 || a[i] > a[i + 1];
        if (leftOk && rightOk) return String(i);
      }
      return "0";
    },
    x: ["4\n1 2 3 1", "1\n5", "3\n1 2 1", "4\n5 4 3 2", "4\n1 2 3 4"],
  }),
  H({
    t: "Longest Common Prefix", s: "longest-common-prefix", g: ["Strings"],
    d: "Given N strings, write a program that prints their longest common prefix, or 'NA' if there is none.",
    i: "First line contains N. Next N lines each contain one string.", o: "Print the longest common prefix, or 'NA'.",
    c: ["1 <= N <= 10^3", "1 <= length <= 10^3"],
    f: (s) => {
      const lines = linesOf(s);
      const words = lines.slice(1);
      let prefix = words[0];
      for (const w of words.slice(1)) {
        while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
        if (prefix === "") return "NA";
      }
      return prefix;
    },
    x: ["3\nflower\nflow\nflight", "3\ndog\nracecar\ncar", "1\nhello", "2\nsame\nsame", "2\nabc\nab"],
  }),
  H({
    t: "KMP String Match", s: "kmp-string-match", g: ["Strings", "Algorithm"],
    d: "Given a text and a pattern, write a program that prints the 0-based index of the first occurrence of the pattern in the text using the KMP algorithm, or -1 if the pattern is absent.",
    i: "Two lines: the text, then the pattern.", o: "Print the first index of the pattern, or -1.",
    c: ["1 <= length <= 10^5", "Lowercase letters only"],
    f: (s) => {
      const [text, pattern] = linesOf(s);
      const lps = new Array(pattern.length).fill(0);
      let j = 0;
      for (let i = 1; i < pattern.length; i++) {
        while (j > 0 && pattern[i] !== pattern[j]) j = lps[j - 1];
        if (pattern[i] === pattern[j]) j++;
        lps[i] = j;
      }
      j = 0;
      for (let i = 0; i < text.length; i++) {
        while (j > 0 && text[i] !== pattern[j]) j = lps[j - 1];
        if (text[i] === pattern[j]) j++;
        if (j === pattern.length) return String(i - pattern.length + 1);
      }
      return "-1";
    },
    x: ["hello\nll", "aaaaa\nbba", "ababcabcabababd\nababd", "abcabc\nabc", "mississippi\nissip"],
  }),
  H({
    t: "Count Primes Up to N", s: "count-primes", g: ["Number Theory", "Sieve"],
    d: "Write a program that prints the count of prime numbers less than or equal to N using an efficient sieve.",
    i: "A single integer N (N >= 1).", o: "Print the number of primes <= N.",
    c: ["1 <= N <= 10^7"],
    f: (s) => {
      const n = Number(s.trim());
      const sieve = new Uint8Array(n + 1).fill(1);
      if (n >= 0) sieve[0] = 0;
      if (n >= 1) sieve[1] = 0;
      for (let i = 2; i * i <= n; i++) if (sieve[i]) for (let j = i * i; j <= n; j += i) sieve[j] = 0;
      let count = 0;
      for (let i = 2; i <= n; i++) if (sieve[i]) count++;
      return String(count);
    },
    x: ["10", "2", "1", "100", "97"],
  }),
  H({
    t: "Modular Exponentiation", s: "modular-exponentiation", g: ["Math", "Big Numbers"],
    d: "Given a, b and m, write a program that prints (a^b) mod m using fast exponentiation.",
    i: "A single line containing three integers a, b and m.", o: "Print (a^b) mod m.",
    c: ["0 <= a <= 10^9", "0 <= b <= 10^18", "1 <= m <= 10^9"],
    f: (s) => {
      const [a, b, m] = intsOf(s);
      let base = BigInt(a) % BigInt(m);
      let exp = BigInt(b);
      const mod = BigInt(m);
      let result = 1n;
      while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
      }
      return String(result);
    },
    x: ["2 10 1000", "3 5 7", "2 0 100", "10 9 13", "123456789 123456789 1000000007"],
  }),
  H({
    t: "Big Integer Addition", s: "big-integer-addition", g: ["Big Numbers", "Strings"],
    d: "Given two very large positive integers (too large for ordinary integer types), write a program that prints their sum as a string.",
    i: "Two lines; each line contains one large positive integer.", o: "Print the exact sum.",
    c: ["1 <= length <= 10^4", "Only digits"],
    f: (s) => {
      const [a, b] = linesOf(s);
      const res = [];
      let i = a.length - 1, j = b.length - 1, carry = 0;
      while (i >= 0 || j >= 0 || carry) {
        const sum = (i >= 0 ? Number(a[i--]) : 0) + (j >= 0 ? Number(b[j--]) : 0) + carry;
        res.push(sum % 10);
        carry = Math.floor(sum / 10);
      }
      return res.reverse().join("");
    },
    x: ["123\n456", "999999999999999999999\n1", "0\n0", "12345678901234567890\n98765432109876543210", "500000000000000000000000\n500000000000000000000000"],
  }),
  H({
    t: "Big Integer Multiplication", s: "big-integer-multiplication", g: ["Big Numbers", "Strings"],
    d: "Given two large positive integers, write a program that prints their exact product.",
    i: "Two lines; each line contains one large positive integer.", o: "Print the exact product.",
    c: ["1 <= length <= 10^3", "Only digits"],
    f: (s) => {
      const [a, b] = linesOf(s).map((x) => [...x].reverse().map(Number));
      const res = new Array(a.length + b.length).fill(0);
      for (let i = 0; i < a.length; i++)
        for (let j = 0; j < b.length; j++)
          res[i + j] += a[i] * b[j];
      for (let i = 0; i < res.length - 1; i++) {
        res[i + 1] += Math.floor(res[i] / 10);
        res[i] %= 10;
      }
      while (res.length > 1 && res[res.length - 1] === 0) res.pop();
      return res.reverse().join("");
    },
    x: ["123\n456", "99\n99", "0\n12345", "123456789\n987654321", "999\n999"],
  }),
  H({
    t: "GCD of an Array", s: "gcd-of-array", g: ["Number Theory"],
    d: "Given an array of N positive integers, write a program that prints the GCD of all the numbers.",
    i: "First line contains N. Second line contains N positive integers.", o: "Print the GCD of the array.",
    c: ["1 <= N <= 10^5", "1 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
      const val = rows[1].reduce((g, v) => gcd(g, v));
      return String(val);
    },
    x: ["3\n12 18 24", "2\n7 13", "1\n100", "3\n8 12 16", "4\n100 50 25 10"],
  }),
  H({
    t: "LCM of an Array", s: "lcm-of-array", g: ["Number Theory"],
    d: "Given an array of N positive integers, write a program that prints the LCM of all the numbers.",
    i: "First line contains N. Second line contains N positive integers.", o: "Print the LCM of the array.",
    c: ["1 <= N <= 10^3", "1 <= element <= 10^6"],
    f: (s) => {
      const rows = linInts(s);
      const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
      const lcm = (x, y) => (x / gcd(x, y)) * y;
      const val = rows[1].reduce((l, v) => lcm(l, v));
      return String(val);
    },
    x: ["3\n2 3 4", "2\n5 7", "1\n9", "3\n6 8 12", "2\n12 18"],
  }),
  H({
    t: "Course Schedule (Can Finish?)", s: "course-schedule", g: ["Graph", "Topological Sort"],
    d: "You have N courses labelled 0 to N-1 and M prerequisite pairs. A pair 'a b' means course a depends on course b. Write a program that checks whether it is possible to finish all courses.",
    i: "First line contains N and M. Next M lines contain one prerequisite pair 'a b'.", o: "Print yes if all courses can be finished, otherwise print no.",
    c: ["1 <= N <= 10^4", "0 <= M <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of rows.slice(1)) { adj[b].push(a); indeg[a]++; }
      const queue = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
      let done = 0;
      while (queue.length) {
        const u = queue.shift();
        done++;
        for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
      }
      return done === n ? "yes" : "no";
    },
    x: ["2 1\n0 1", "2 2\n0 1\n1 0", "3 2\n1 0\n2 1", "4 4\n0 1\n1 2\n2 3\n3 0", "2 0"],
  }),
  H({
    t: "Dijkstra Shortest Paths", s: "dijkstra-shortest-paths", g: ["Graph", "Shortest Path"],
    d: "Given a weighted undirected graph of N nodes (0-based) using an adjacency matrix (0 means no edge), write a program that prints the shortest distance from node 0 to every other node, or -1 for unreachable nodes.",
    i: "First line contains N. Next N lines contain N weights each.", o: "Print the distances to nodes 1 through N-1 separated by single spaces.",
    c: ["2 <= N <= 100", "0 <= weight <= 10^6", "0 means no edge"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const g = rows.slice(1, 1 + n);
      const dist = new Array(n).fill(Infinity);
      const visited = new Array(n).fill(false);
      dist[0] = 0;
      for (let iter = 0; iter < n; iter++) {
        let u = -1, best = Infinity;
        for (let i = 0; i < n; i++) if (!visited[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u === -1) break;
        visited[u] = true;
        for (let v = 0; v < n; v++) {
          if (g[u][v] > 0 && dist[u] + g[u][v] < dist[v]) dist[v] = dist[u] + g[u][v];
        }
      }
      return dist.slice(1).map((d) => (d === Infinity ? -1 : d)).join(" ");
    },
    x: ["4\n0 1 4 0\n1 0 2 0\n4 2 0 3\n0 0 3 0", "3\n0 2 0\n2 0 5\n0 5 0", "4\n0 0 0 0\n0 0 0 0\n0 0 0 0\n0 0 0 0", "5\n0 10 3 0 0\n10 0 1 2 0\n3 1 0 8 2\n0 2 8 0 4\n0 0 2 4 0", "2\n0 7\n7 0"],
  }),
  H({
    t: "BFS Traversal", s: "bfs-traversal", g: ["Graph", "BFS"],
    d: "Given an undirected graph of N nodes (0-based) as an adjacency matrix, write a program that prints the BFS traversal order starting from node 0 (neighbors visited in increasing index order).",
    i: "First line contains N. Next N lines contain N entries (0 or 1) each.", o: "Print the BFS order separated by single spaces.",
    c: ["1 <= N <= 100"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const g = rows.slice(1, 1 + n);
      const visited = new Array(n).fill(false);
      const order = [];
      const queue = [0];
      visited[0] = true;
      while (queue.length) {
        const u = queue.shift();
        order.push(u);
        for (let v = 0; v < n; v++) if (g[u][v] === 1 && !visited[v]) { visited[v] = true; queue.push(v); }
      }
      return order.join(" ");
    },
    x: ["4\n0 1 1 0\n1 0 0 1\n1 0 0 1\n0 1 1 0", "3\n0 1 1\n1 0 0\n1 0 0", "1\n0", "5\n0 1 0 0 1\n1 0 1 0 0\n0 1 0 1 0\n0 0 1 0 1\n1 0 0 1 0", "2\n0 1\n1 0"],
  }),
  H({
    t: "DFS Traversal", s: "dfs-traversal", g: ["Graph", "DFS"],
    d: "Given an undirected graph of N nodes (0-based) as an adjacency matrix, write a program that prints the DFS traversal order starting from node 0 (neighbors visited in increasing index order).",
    i: "First line contains N. Next N lines contain N entries (0 or 1) each.", o: "Print the DFS order separated by single spaces.",
    c: ["1 <= N <= 100"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const g = rows.slice(1, 1 + n);
      const visited = new Array(n).fill(false);
      const order = [];
      const stack = [0];
      while (stack.length) {
        const u = stack.pop();
        if (visited[u]) continue;
        visited[u] = true;
        order.push(u);
        for (let v = n - 1; v >= 0; v--) if (g[u][v] === 1 && !visited[v]) stack.push(v);
      }
      return order.join(" ");
    },
    x: ["4\n0 1 1 0\n1 0 0 1\n1 0 0 1\n0 1 1 0", "3\n0 1 1\n1 0 0\n1 0 0", "1\n0", "5\n0 1 0 0 1\n1 0 1 0 0\n0 1 0 1 0\n0 0 1 0 1\n1 0 0 1 0", "2\n0 1\n1 0"],
  }),
  H({
    t: "Count Connected Components", s: "connected-components", g: ["Graph", "DFS"],
    d: "Given an undirected graph of N nodes (0-based) as an adjacency matrix, write a program that prints the number of connected components.",
    i: "First line contains N. Next N lines contain N entries (0 or 1) each.", o: "Print the number of connected components.",
    c: ["1 <= N <= 100"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const g = rows.slice(1, 1 + n);
      const visited = new Array(n).fill(false);
      let count = 0;
      const dfs = (u) => {
        visited[u] = true;
        for (let v = 0; v < n; v++) if (g[u][v] === 1 && !visited[v]) dfs(v);
      };
      for (let i = 0; i < n; i++) if (!visited[i]) { count++; dfs(i); }
      return String(count);
    },
    x: ["4\n0 1 0 0\n1 0 0 0\n0 0 0 1\n0 0 1 0", "3\n0 1 1\n1 0 0\n1 0 0", "1\n0", "5\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0", "3\n0 0 1\n0 0 0\n1 0 0"],
  }),
  H({
    t: "Detect Cycle in Directed Graph", s: "directed-cycle-detect", g: ["Graph", "DFS"],
    d: "Given a directed graph of N nodes (0-based) and M edges, write a program that checks whether the graph contains a cycle.",
    i: "First line contains N and M. Next M lines contain one edge 'a b' (a -> b).", o: "Print yes if a cycle exists, otherwise print no.",
    c: ["1 <= N <= 10^4", "0 <= M <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const adj = Array.from({ length: n }, () => []);
      for (const [a, b] of rows.slice(1)) adj[a].push(b);
      const state = new Array(n).fill(0);
      const hasCycle = (u) => {
        state[u] = 1;
        for (const v of adj[u]) {
          if (state[v] === 1) return true;
          if (state[v] === 0 && hasCycle(v)) return true;
        }
        state[u] = 2;
        return false;
      };
      for (let i = 0; i < n; i++) if (state[i] === 0 && hasCycle(i)) return "yes";
      return "no";
    },
    x: ["3 3\n0 1\n1 2\n2 0", "3 2\n0 1\n1 2", "4 4\n0 1\n1 2\n2 3\n3 1", "2 1\n0 0", "4 3\n0 1\n1 2\n2 3"],
  }),
  H({
    t: "Topological Sort (Kahn)", s: "topological-sort", g: ["Graph", "Topological Sort"],
    d: "Given a directed graph of N nodes (0-based) and M edges, write a program that prints a topological order of the nodes using Kahn's algorithm. If the graph has a cycle, print -1.",
    i: "First line contains N and M. Next M lines contain one edge 'a b' (a -> b).", o: "Print the topological order separated by single spaces, or -1.",
    c: ["1 <= N <= 10^4", "0 <= M <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const n = rows[0][0];
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of rows.slice(1)) { adj[b].push(a); indeg[a]++; }
      const queue = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
      const order = [];
      while (queue.length) {
        const u = queue.shift();
        order.push(u);
        for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
      }
      return order.length === n ? order.join(" ") : "-1";
    },
    x: ["4 3\n0 1\n1 2\n2 3", "3 3\n0 1\n1 2\n2 0", "5 4\n1 0\n2 0\n3 1\n4 1", "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1", "2 1\n0 1"],
  }),
  H({
    t: "Longest Consecutive Sequence", s: "longest-consecutive-sequence", g: ["Array", "Hash Set"],
    d: "Given an unsorted array of N integers, write a program that prints the length of the longest sequence of consecutive numbers (duplicates ignored).",
    i: "First line contains N. Second line contains N integers.", o: "Print the length of the longest consecutive sequence.",
    c: ["1 <= N <= 10^5", "-10^9 <= element <= 10^9"],
    f: (s) => {
      const rows = linInts(s);
      const set = new Set(rows[1]);
      let best = 0;
      for (const v of set) {
        if (set.has(v - 1)) continue;
        let len = 1;
        while (set.has(v + len)) len++;
        best = Math.max(best, len);
      }
      return String(best);
    },
    x: ["6\n100 4 200 1 3 2", "3\n1 2 3", "5\n5 4 3 2 1", "4\n1 3 5 7", "6\n0 0 1 2 3 4"],
  }),
  H({
    t: "Maximum Circular Subarray Sum", s: "max-circular-subarray-sum", g: ["Array", "Kadane"],
    d: "Given an array of N integers, write a program that prints the maximum sum of a contiguous subarray when the array is treated as circular (the last element may wrap to the first).",
    i: "First line contains N. Second line contains N integers.", o: "Print the maximum circular subarray sum.",
    c: ["1 <= N <= 10^5", "-10^4 <= element <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const a = rows[1];
      const kadane = (arr) => {
        let best = arr[0], cur = arr[0];
        for (let i = 1; i < arr.length; i++) {
          cur = Math.max(arr[i], cur + arr[i]);
          best = Math.max(best, cur);
        }
        return best;
      };
      const linear = kadane(a);
      const total = a.reduce((x, y) => x + y, 0);
      const neg = kadane(a.map((x) => -x));
      return String(Math.max(linear, total === -neg ? linear : total + neg));
    },
    x: ["3\n5 -3 5", "4\n8 -1 3 4", "3\n-2 -3 -1", "4\n1 2 3 4", "5\n8 -8 9 -9 10"],
  }),
  H({
    t: "Best Time to Buy and Sell Stock", s: "best-time-to-buy-sell-stock", g: ["Array", "Greedy"],
    d: "Given an array of N daily stock prices, write a program that prints the maximum profit that can be made by buying on one day and selling on a later day. If no profit is possible, print 0.",
    i: "First line contains N. Second line contains N non-negative integers.", o: "Print the maximum profit.",
    c: ["1 <= N <= 10^5", "0 <= price <= 10^4"],
    f: (s) => {
      const rows = linInts(s);
      const prices = rows[1];
      let minPrice = prices[0], profit = 0;
      for (const p of prices) {
        profit = Math.max(profit, p - minPrice);
        minPrice = Math.min(minPrice, p);
      }
      return String(profit);
    },
    x: ["6\n7 1 5 3 6 4", "5\n7 6 4 3 1", "3\n1 2 3", "4\n3 1 4 2", "2\n9 1"],
  }),
];
/* =========================================================================
   TRACKS + SEED ENGINE
   ========================================================================= */
const TRACKS = [
  {
    slug: "beginner-program-bank",
    title: "Beginner Program Bank - 50 Programs",
    difficulty: "Easy",
    problems: BEGINNER,
  },
  {
    slug: "intermediate-program-bank",
    title: "Intermediate Program Bank - 50 Programs",
    difficulty: "Medium",
    problems: INTERMEDIATE,
  },
  {
    slug: "advanced-program-bank",
    title: "Advanced Program Bank - 50 Programs",
    difficulty: "Hard",
    problems: ADVANCED,
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to:", MONGO_URI);

  for (const track of TRACKS) {
    let doc = await CodingTest.findOne({ slug: track.slug });
    if (doc) {
      console.log("Track exists, adding missing programs:", track.slug);
    } else {
      doc = await CodingTest.create({
        slug: track.slug,
        title: track.title,
        description:
          "Curated coding program bank for the VCET arena. " +
          track.problems.length +
          " programs at the " +
          track.difficulty +
          " level.",
        category: "Program Bank",
        difficulty: track.difficulty,
        timeLimit: 120,
        memoryLimit: 256,
        languages: ["python", "javascript", "cpp", "java", "c"],
        settings: {
          fullscreenRequired: false,
          antiCopy: true,
          antiPaste: true,
          maxViolations: 1,
          autoSubmitOnViolation: true,
        },
        isPublished: true,
        problems: [],
      });
      console.log("Created track:", track.slug);
    }

    const existing = new Set((doc.problems || []).map((p) => p.slug));
    let added = 0;
    for (const problem of track.problems) {
      if (existing.has(problem.slug)) continue;
      doc.problems.push(problem);
      existing.add(problem.slug);
      added += 1;
    }
    await doc.save();
    console.log(
      track.slug + ": added " + added + ", total problems now " + doc.problems.length
    );
  }

  await mongoose.disconnect();
  console.log("Seed completed: 150-program bank (50 Easy / 50 Medium / 50 Hard).");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
