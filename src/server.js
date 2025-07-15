const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./core/config/config');
const logger = require('./core/config/logger');
const { initializeChat } = require('./modules/chat/chat.gateway');

const PORT = config.server.port;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.server.allowedOrigins,
    methods: ["GET", "POST"]
  }
});

initializeChat(io);

server.listen(PORT, () => {
  logger.info(`Servidor escuchando en http://localhost:${PORT}`);
  if (config.logging.debugMode) {
    logger.warn('El servidor está corriendo en MODO DEBUG.');
  }
});