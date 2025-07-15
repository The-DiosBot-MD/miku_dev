const logger = require('../config/logger');

const verifyCloudflare = async (req, res, next) => {
  const token = req.body['turnstileToken'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!token) {
    return res.status(400).json({ message: 'Captcha de Cloudflare no proporcionado.' });
  }

  const formData = new URLSearchParams();
  formData.append('secret', process.env.CLOUDFLARE_SECRET_KEY);
  formData.append('response', token);
  formData.append('remoteip', ip);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      logger.debugOnly('Verificación de Cloudflare exitosa.');
      next();
    } else {
      logger.warn('Verificación de Cloudflare fallida:', data['error-codes']);
      res.status(403).json({ message: 'No se pudo verificar que eres humano.' });
    }
  } catch (error) {
    logger.error('Error al contactar con el servidor de Cloudflare:', error);
    res.status(500).json({ message: 'Error del servidor al verificar el captcha.' });
  }
};

module.exports = verifyCloudflare;