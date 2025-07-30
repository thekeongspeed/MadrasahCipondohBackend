'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Komentar extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Komentar.init({
    isi: DataTypes.TEXT,
    userId: DataTypes.INTEGER,
    pengumumanId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Komentar',
    freezeTableName: true 
  });
  return Komentar;
};