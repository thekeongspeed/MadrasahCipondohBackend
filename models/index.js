'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('dotenv').config();

const basename = path.basename(__filename);
const db = {};

// 1. Inisialisasi koneksi Sequelize dari .env
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, // Set ke console.log untuk melihat query SQL saat debugging
});

// 2. Memuat semua file model dari direktori ini secara dinamis
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' && // Jangan load file associations di sini
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
    console.log(`Model loaded: ${model.name}`);
  });

// 3. Panggil file associations SETELAH semua model dimuat
// Ini adalah bagian kunci yang memperbaiki masalah Anda
if (fs.existsSync(path.join(__dirname, 'associations.js'))) {
  require('./associations.js')(db);
  console.log('All associations have been set up successfully.');
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;