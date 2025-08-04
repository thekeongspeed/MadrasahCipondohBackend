'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Absensi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Absensi.init({
    tanggal: DataTypes.DATE,
    kelas: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    status: {
        type: DataTypes.ENUM('Hadir', 'Izin', 'Sakit', 'Alpa'), 
        allowNull: false
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    markedBy: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    }

  }, {
    sequelize,
    modelName: 'Absensi',
    freezeTableName: true 
  });
  return Absensi;
};