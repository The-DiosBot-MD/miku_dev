const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../../modules/users/user.model');
const logger = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    if (req.accepts('html')) {
      const redirectUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/index.html?redirect=${redirectUrl}`); 
    }
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    
    if (!user) {
      logger.warn(`Intento de autenticación con un token para un usuario no existente. UserID: ${decoded.id}`);
      return res.status(401).json({ message: 'Token inválido. Usuario no encontrado.' });
    }

    req.user = user; 
    logger.debugOnly(`Token verificado para el usuario: ${user.username} (ID: ${user.id})`);
    
    next();

  } catch (error) {
    logger.error('Error de autenticación de token:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado. Por favor, vuelve a iniciar sesión.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token malformado o inválido.' });
    }
    
    return res.status(401).json({ message: 'Token no válido.' });
  }
};

module.exports = authMiddleware;