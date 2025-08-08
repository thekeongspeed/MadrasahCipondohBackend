module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY
    },
    parentName: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    profilePicture: {
      type: DataTypes.STRING,
      defaultValue: '/default-profile.png'
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    }
  }, {
    timestamps: true,
    paranoid: true 
  });

  // Instance methods
  User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  };

  return User;
};