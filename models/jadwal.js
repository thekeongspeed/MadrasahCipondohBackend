'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Jadwal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Jadwal.init({
    kelas: DataTypes.STRING,
    hari: DataTypes.STRING,
    waktu: DataTypes.STRING,
    kegiatan: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Jadwal',
  });
  return Jadwal;
};