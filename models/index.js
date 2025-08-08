'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('dotenv').config();

const basename = path.basename(__filename);
const db = {};

// 1. Inisialisasi koneksi Sequelize dari .env
const caPath = path.resolve(__dirname, '..', 'config', 'ca.pem'); // Sesuaikan path ini dengan lokasi file Anda

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql', // TiDB Cloud kompatibel dengan dialek mysql
    dialectOptions: {
      // INI BAGIAN YANG PALING PENTING
      ssl: {
        // rejectUnauthorized akan menolak koneksi jika sertifikat tidak valid.
        // Sebaiknya selalu true di produksi.
        rejectUnauthorized: true, 
        // Membaca dan menggunakan file sertifikat CA Anda
        ca: fs.readFileSync(caPath)
      }
    }
  }
);

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