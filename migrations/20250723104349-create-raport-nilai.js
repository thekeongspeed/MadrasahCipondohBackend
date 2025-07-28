'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RaportNilais', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      raportSiswaId: {
        type: Sequelize.INTEGER
      },
      materi: {
        type: Sequelize.STRING
      },
      uraianMateri: {
        type: Sequelize.STRING
      },
      nilaiAngka: {
        type: Sequelize.FLOAT
      },
      nilaiHuruf: {
        type: Sequelize.STRING
      },
      keterangan: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RaportNilais');
  }
};