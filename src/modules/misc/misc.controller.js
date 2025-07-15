const config = require('../../core/config/config');

const getFrontendConfig = (req, res) => {
  //console.log("--- DEBUG: Contenido del objeto config en /api/misc/config ---");
  //console.log(JSON.stringify(config, null, 2));
  //console.log("-----------------------------------------------------------------");

  const siteKey = config && config.cloudflare ? config.cloudflare.siteKey : undefined;

  if (!siteKey) {
    console.error("!!! ERROR CRÍTICO: cloudflare.siteKey no está definido en el objeto de configuración.");
    return res.status(500).json({ 
        message: "Error de configuración del servidor: La clave de verificación no está disponible." 
    });
  }

  res.json({
    cloudflareSiteKey: siteKey,
  });
};

module.exports = {
  getFrontendConfig,
};