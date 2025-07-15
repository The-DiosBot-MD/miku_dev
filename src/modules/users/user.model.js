const { DataTypes } = require('sequelize');
const sequelize = require('../../core/database/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: {
        args: /^[a-zA-Z0-9]([a-zA-Z0-9_-\s]{1,28})[a-zA-Z0-9]$/,
        msg: 'Nombre de usuario inválido.'
      },
      len: {
        args: [3, 30],
        msg: 'El nombre de usuario debe tener entre 3 y 30 caracteres.'
      }
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'La URL del avatar proporcionada no es válida.'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    allowNull: false,
    defaultValue: 'user',
  },
}, {
  hooks: {
    beforeValidate: (user, options) => {
      if (user.username) {
        user.username = user.username.trim();
      }
      if (user.email) {
        user.email = user.email.trim().toLowerCase();
      }
    },
    beforeCreate: async (user) => {
      if (!user.avatarUrl && user.username) {
        const seed = encodeURIComponent(user.username);
        user.avatarUrl = `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}`;
      }

      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.isValidPassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
}

module.exports = User;