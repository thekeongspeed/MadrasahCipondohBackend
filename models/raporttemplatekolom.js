'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RaportTemplateKolom extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RaportTemplateKolom.init({
    templateId: DataTypes.INTEGER,
    nama: DataTypes.STRING,
    tipe: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'RaportTemplateKolom',
  });
  return RaportTemplateKolom;
};