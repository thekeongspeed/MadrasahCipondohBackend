'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RaportSiswa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RaportSiswa.init({
    siswaId: DataTypes.INTEGER,
    kelas: DataTypes.STRING,
    periode: DataTypes.STRING,
    catatanGuru: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'RaportSiswa',
    freezeTableName: true 
  });
  return RaportSiswa;
};