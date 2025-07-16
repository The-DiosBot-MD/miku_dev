require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const logger = require('./core/config/logger');
const sequelize = require('./core/database/database');
const config = require('./core/config/config');
const miscRoutes = require('./modules/misc/misc.routes');
const User = require('./modules/users/user.model');
const Message = require('./modules/chat/message.model');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');

require('./modules/auth/passport.config');

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

const app = express();

//app.use(helmet({ contentSecurityPolicy: false })); // Basico por si algo falla o pra testear
app.use( //Version 2.0
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://challenges.cloudflare.com", "https://cdn.socket.io"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://api.dicebear.com"],
        connectSrc: ["'self'", "https://challenges.cloudflare.com", "wss:", "ws:"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
/*app.use(
  helmet({
    // si no se entienden completamente. En una aplicación de misión crítica, se estudiarían más a fondo.
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    
    // Configuración detallada de la Política de Seguridad de Contenido (CSP)
    contentSecurityPolicy: {
      directives: {
        // La política por defecto que aplica si no hay una directiva específica.
        // Solo permite cargar recursos del propio origen.
        defaultSrc: ["'self'"],

        // De dónde se permiten cargar scripts.
        scriptSrc: [
          "'self'", // Scripts de tu propio dominio (ej. app.js, router.js)
          "https://challenges.cloudflare.com", // Para el script principal de Cloudflare Turnstile
          "https://cdn.socket.io", // Para la librería cliente de Socket.IO
          // Si usas scripts inlines pequeños que no puedes externalizar, añadir:
          // "'unsafe-inline'" // ¡Úsalo con MUCHA PRECAUCIÓN! Solo si es absolutamente necesario.
          // Si usas React/Vue u otros frameworks que inyectan JS inline, esto puede ser necesario.
        ],

        // De dónde se permiten cargar hojas de estilo (CSS).
        styleSrc: [
          "'self'", // Estilos de tu propio dominio (ej. app.css, auth.css)
          "'unsafe-inline'", // Necesario si tienes estilos inline en tu HTML o por frameworks JS
        ],

        // De dónde se permiten cargar iframes.
        frameSrc: [
          "'self'", // Iframes de tu propio dominio
          "https://challenges.cloudflare.com" // Para el iframe de Cloudflare Turnstile
        ],

        // De dónde se permiten cargar imágenes.
        imgSrc: [
          "'self'", // Imágenes de tu propio dominio (ej. /images/logo.png)
          "data:", // Para imágenes Base64 (comunes en algunos avatares/iconos)
          "https://i.pravatar.cc", // Si todavía lo usas para algún fallback o test
          "https://api.dicebear.com", // Para avatares generados por DiceBear
          "https://lh3.googleusercontent.com" // Para avatares de Google
        ],

        // De dónde se permiten cargar fuentes (fonts).
        fontSrc: [
          "'self'", // Fuentes de tu propio dominio
          // Si usas Google Fonts u otros CDNs de fuentes, añádelos aquí:
          // "https://fonts.gstatic.com", "https://fonts.googleapis.com"
        ],

        // De dónde se permiten realizar conexiones (XHR, WebSockets, EventSource).
        // CRÍTICO para Socket.IO y cualquier API externa que tu frontend llame directamente.
        connectSrc: [
          "'self'", // Conexiones a tu propio backend REST y WebSocket
          // Si tu servidor Node.js escucha en un puerto específico, especifica la URL completa:
          `ws://localhost:${config.server.port}`, // Para desarrollo local (WebSocket)
          `wss://localhost:${config.server.port}`, // Para desarrollo local (WebSocket Secure, si usas HTTPS)
          // Para producción, DEBES cambiar a tu dominio real, ejemplo:
          // "wss://your-mikudev-domain.com",
          "https://api.dicebear.com" // Si tu frontend hace fetch directo a DiceBear (antes del proxy)
          // Si usas el patrón de proxy que te di, esta línea para dicebear no sería estrictamente necesaria aquí,
          // ya que el frontend solo llama a tu propio dominio para la imagen.
        ],

        // No permitir la carga de plugins heredados (Flash, Java Applets).
        objectSrc: ["'none'"],

        // Para formularios: solo pueden enviar datos a tu propio dominio.
        formAction: ["'self'"],

        // Previene que tu sitio sea incrustado en iframes por otros sitios (previene Clickjacking).
        // Solo si tu app NO debe ser incrustada.
        frameAncestors: ["'none'"],

        // Le dice al navegador que reemplace todas las URLs HTTP con HTTPS. Muy recomendado para producción.
        upgradeInsecureRequests: [],
      },
    },
  })
);*/

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.server.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso no permitido por CORS.'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

//////////////////////////////

app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MikuDev Backend is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/misc', miscRoutes);
app.use('/api/users', userRoutes);

//app.use((req, res, next) => {
//  res.status(404).json({ message: 'Ruta no encontrada.' });
//});
//
//app.use((err, req, res, next) => {
//  logger.error('Error global no capturado:', err);
//  res.status(500).json({ message: 'Error interno del servidor.' });
//});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta de API no encontrada.' });
});

app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'app.html'));
});

sequelize.sync()
  .then(() => logger.info('Base de datos sincronizada correctamente.'))
  .catch((err) => logger.error('Error al sincronizar la base de datos:', err));

module.exports = app;