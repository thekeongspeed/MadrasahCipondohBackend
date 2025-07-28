'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RaportNilai extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RaportNilai.init({
    raportSiswaId: DataTypes.INTEGER,
    materi: DataTypes.STRING,
    uraianMateri: DataTypes.STRING,
    nilaiAngka: DataTypes.FLOAT,
    nilaiHuruf: DataTypes.STRING,
    keterangan: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'RaportNilai',
  });
  return RaportNilai;
};