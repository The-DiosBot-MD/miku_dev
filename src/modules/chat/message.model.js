const { DataTypes } = require('sequelize');
const sequelize = require('../../core/database/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'global',
  },
});

module.exports = Message;