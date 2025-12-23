// ecosystem.config.js - Configuración PM2 para clustering
module.exports = {
  apps: [{
    name: 'plataforma-frutos',
    script: './server.ts',
    interpreter: 'node',
    interpreter_args: '--loader ts-node/esm',
    instances: 'max', // Usa todos los núcleos disponibles
    exec_mode: 'cluster', // Modo clúster para escalabilidad
    watch: false, // Desactivar en producción
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      WATCH: 'true'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Configuración para reiniciar en caso de errores
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    // Configuración de carga
    listen_timeout: 10000,
    kill_timeout: 5000,
  }]
};
