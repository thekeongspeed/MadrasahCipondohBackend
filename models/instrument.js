'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Instrument extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Instrument.init({
    kelas: DataTypes.STRING,
    jenis: DataTypes.STRING,
    filePath: DataTypes.STRING,
    fileName: DataTypes.STRING,
    fileSize: DataTypes.INTEGER,
    uploadedBy: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Instrument',
    freezeTableName: true 
  });
  return Instrument;
};