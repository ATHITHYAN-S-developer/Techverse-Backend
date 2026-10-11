/**
 * PM2 Ecosystem Configuration for TechVerse Backend
 *
 * Core Features Enabled:
 * 1. Auto-Restart:
 *    - Automatically restarts the Node.js application if it crashes or the server reboots.
 *    - Exponential backoff restart delay to prevent CPU thrashing during continuous failures.
 *    - max_memory_restart guards against memory leak saturation.
 *
 * 2. Cluster Mode:
 *    - Scales the application across all available CPU cores without code changes.
 *    - Load-balances incoming HTTP requests across all worker instances.
 *    - Capable of sustaining high-throughput workloads (500+ concurrent active users).
 *
 * 3. Process Monitoring:
 *    - Integrated log aggregation with timestamps.
 *    - Real-time CPU, memory, and uptime metrics via `pm2 monit` / `pm2 status`.
 *
 * 4. Zero-Downtime Reload:
 *    - Seamless rollouts using `pm2 reload ecosystem.config.cjs`.
 *    - Listens for process readiness signal (`wait_ready: true`) before cutting old workers.
 *    - Allows active user connections to finish gracefully (`kill_timeout: 5000`).
 */

module.exports = {
  apps: [
    {
      name: "techverse-backend",
      script: "src/server.js",

      // ── Cluster Mode ──────────────────────────────────────────────
      // "max" automatically detects the number of CPU cores and spawns that many workers.
      // E.g., on a 4-core CPU, 4 worker instances run simultaneously.
      instances: "max",
      exec_mode: "cluster",

      // ── Auto-Restart & Reliability ────────────────────────────────
      autorestart: true,
      watch: false, // Set to false in production to prevent unintended restarts
      max_memory_restart: "1G", // Auto-restart if a worker's memory exceeds 1GB
      restart_delay: 2000,
      exp_backoff_restart_delay: 100, // Exponential backoff for crash loops
      max_restarts: 15,
      min_uptime: "10s",

      // ── Zero-Downtime Reload Configuration ────────────────────────
      wait_ready: true, // Wait for process.send('ready') from server.js
      listen_timeout: 10000, // Timeout before considering process failed to listen (10s)
      kill_timeout: 5000, // Allow 5 seconds for in-flight requests to complete before terminating

      // ── Process Monitoring & Logging ──────────────────────────────
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      time: true,

      // ── Environment Variables ─────────────────────────────────────
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
