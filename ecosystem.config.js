// PM2 Ecosystem Config – NhanhMedia
// Dùng để chạy production trên aaPanel với PM2
// Khởi động: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'nhanhmedia-web',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/nhanhmedia.com', // <-- Thay bằng đường dẫn thư mục thực tế
      instances: 1,            // Số instance (1 = single, 'max' = cluster tất cả CPU)
      exec_mode: 'fork',       // 'fork' cho single, 'cluster' nếu dùng nhiều instance
      autorestart: true,       // Tự restart khi crash
      watch: false,            // Không watch file thay đổi trong production
      max_memory_restart: '512M', // Restart nếu vượt 512MB RAM
      restart_delay: 3000,     // Chờ 3 giây trước khi restart
      max_restarts: 10,        // Tối đa 10 lần restart liên tiếp

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Các biến môi trường production được đọc từ file .env trên server
        // KHÔNG đặt DATABASE_URL, JWT_SECRET ở đây – đặt trong .env trên server
      },

      // Log files
      error_file: '/www/wwwroot/nhanhmedia.com/logs/pm2-error.log',
      out_file: '/www/wwwroot/nhanhmedia.com/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
