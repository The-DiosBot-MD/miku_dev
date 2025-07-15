const { Sequelize } = require('sequelize');
const config = require('../config/config');
const logger = require('../config/logger');

let sequelize;

if (config.database.url) {
  logger.info("Conectando a la base de datos de producción (Railway)...");
  sequelize = new Sequelize(config.database.url, {
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false, //true para produccion
      }
    },
    logging: false,
  });
} else {
  
  const dbLocal = config.database.local;
  logger.info(`Conectando a la base de datos local (${dbLocal.dialect})...`);
  sequelize = new Sequelize(
    dbLocal.name,
    dbLocal.user,
    dbLocal.password,
    {
      host: dbLocal.host,
      dialect: dbLocal.dialect,
      logging: false,
    }
  );
}

module.exports = sequelize;