'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RaportTemplate extends Model {
   
    static associate(models) {
      // define association here
    }
  }
  RaportTemplate.init({
    kelas: DataTypes.STRING,
    waliKelas: DataTypes.STRING, 
    dibuatOleh: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'RaportTemplate',
  });
  return RaportTemplate;
};