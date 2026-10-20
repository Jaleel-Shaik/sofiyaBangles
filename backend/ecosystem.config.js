module.exports = {
  apps: [
    {
      name: "sofiya-backend",
      script: "./dist/server.js",
      cwd: __dirname,
      // On Oracle Always Free Ampere (ARM 4 OCPUs), you can set instances to 2 or 4.
      // On Oracle AMD Micro (1 OCPU, 1 GB RAM), keep instances at 1.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "450M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      kill_timeout: 10000,
      listen_timeout: 8000,
      restart_delay: 3000,
    },
  ],
};
