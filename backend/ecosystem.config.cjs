module.exports = {
  apps: [
    {
      name: 'gca-backend',
      script: 'dist/index.js',
      node_args: '--experimental-specifier-resolution=node',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
