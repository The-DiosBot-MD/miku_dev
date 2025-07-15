const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const config = require('../../core/config/config');
const logger = require('../../core/config/logger');

const USERNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9_-\s]{1,28})[a-zA-Z0-9]$/;
const INVALID_USERNAME_MESSAGE = 'Nombre de usuario inválido. Debe tener entre 3 y 30 caracteres, puede contener espacios (no al principio ni al final), letras, números, guiones bajos (_) y guiones (-).'

const completeGoogleRegistration = async (req, res) => {
  const username = req.body.username ? req.body.username.trim() : '';
  const { password, tempToken } = req.body;

  if (!username || !password || !tempToken) {
    return res.status(400).json({ message: 'Nombre de usuario, contraseña y token son requeridos.' });
  }

  if (!USERNAME_REGEX.test(username)) {
    return res.status(400).json({ message: INVALID_USERNAME_MESSAGE });
  }

  try {
    const decoded = jwt.verify(tempToken, config.jwt.secret);
    const { googleId, email, avatarUrl } = decoded;

    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso. Por favor, elige otro.' });
    }
    
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
        return res.status(409).json({ message: 'El correo electrónico ya está registrado. Intenta iniciar sesión.' });
    }

    const newUser = await User.create({
      googleId,
      email,
      avatarUrl,
      username,
      password
    });

    logger.info(`Usuario completó registro de Google con éxito: ${newUser.username}`);

    const payload = { id: newUser.id, username: newUser.username, role: newUser.role };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });

    res.status(201).json({ token });

  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      logger.warn('Intento de completar registro con token temporal inválido o expirado.');
      return res.status(401).json({ message: 'Tu sesión de registro ha expirado. Por favor, inténtalo de nuevo.' });
    }
    logger.error('Error al completar el registro de Google:', error);
    res.status(500).json({ message: 'Error interno al registrar el usuario.' });
  }
};

const register = async (req, res) => {
  const username = req.body.username ? req.body.username.trim() : '';
  const email = req.body.email ? req.body.email.trim() : '';
  const { password, avatarUrl } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Correo electrónico, contraseña y nombre de usuario son requeridos.' });
  }

  if (!USERNAME_REGEX.test(username)) {
    return res.status(400).json({ message: INVALID_USERNAME_MESSAGE });
  }

    try {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email: email }, { username: username }]
        }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
        }
        if (existingUser.email === email) {
          return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }
      }

      const newUserObject = {
        email,
        password,
        username,
      };

      if (avatarUrl && avatarUrl.trim() !== '') {
        newUserObject.avatarUrl = avatarUrl;
      }

      const newUser = await User.create(newUserObject);

      res.status(201).json({ message: 'Usuario registrado con éxito. Ahora puedes iniciar sesión.' });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
      }
      logger.error('Error en el registro:', error);
      res.status(500).json({ message: 'Error interno al registrar el usuario.' });
    }
};

const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Se requiere un identificador (usuario o email) y una contraseña.' });
  }

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      }
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    
    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });
    
    res.json({ token });

  } catch (error) {
    logger.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno al iniciar sesión.' });
  }
};


module.exports = {
  completeGoogleRegistration,
  register,
  login
};