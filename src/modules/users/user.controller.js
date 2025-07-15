const jwt = require('jsonwebtoken');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const User = require('./user.model');
const config = require('../../core/config/config');
const logger = require('../../core/config/logger');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const USERNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9_-\s]{1,28})[a-zA-Z0-9]$/;

// GET /api/users/me
const getCurrentUser = async (req, res) => {
  res.json(req.user);
};

// GET /api/users/:username
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({
      where: { username: username },
      attributes: ['username', 'avatarUrl', 'bio', 'createdAt', 'role']
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// PATCH /api/users/me
const updateCurrentUser = async (req, res) => {
  try {
    const { username, avatarUrl, bio, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    let needsNewToken = false;

    if (username && username !== user.username) {
      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ message: 'El nuevo nombre de usuario tiene un formato inválido.' });
      }
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ message: 'Ese nombre de usuario ya está en uso.' });
      }
      user.username = username;
      needsNewToken = true;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Se requiere la contraseña actual para establecer una nueva.' });
      }
      const isMatch = await user.isValidPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
      }
      user.password = newPassword;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    if (bio !== undefined) {
      user.bio = purify.sanitize(bio);
    }

    await user.save();

    const responsePayload = {
      message: 'Perfil actualizado con éxito.'
    };

    if (needsNewToken) {
      const payload = { id: user.id, username: user.username, role: user.role };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '7d' });
      responsePayload.token = token;
    }

    res.json(responsePayload);

  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
    }
    logger.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getCurrentUser,
  getUserProfile,
  updateCurrentUser,
};