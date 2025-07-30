'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Jurnal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Jurnal.init({
    kelas: DataTypes.STRING,
    tanggal: DataTypes.DATE,
    materi: DataTypes.STRING,
    namaGuru: DataTypes.STRING,
    keterangan: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Jurnal',
    freezeTableName: true 
  });
  return Jurnal;
};