// pm2 process definition. The app MUST run as a single instance:
// workspace writes are serialized by an in-process lock (src/lib/server/lock.server.ts).
module.exports = {
  apps: [
    {
      name: "sibamotor",
      script: ".output/server/index.mjs",
      node_args: "--env-file-if-exists=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "700M",
      env: { NODE_ENV: "production" },
    },
  ],
};
