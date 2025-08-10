'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const basename = path.basename(__filename);
const db = {};

// Pastikan semua environment variable penting terisi
const requiredEnv = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
requiredEnv.forEach((key) => {
  if (!process.env[key] || process.env[key].trim() === '') {
    throw new Error(`Environment variable ${key} belum di-set!`);
  }
});

// Path ke file sertifikat SSL
const caPath = path.resolve(__dirname, '..', 'ca.pem');
if (!fs.existsSync(caPath)) {
  throw new Error(`File sertifikat CA tidak ditemukan: ${caPath}`);
}

// Inisialisasi Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath),
      },
    },
    logging: false, // matiin log query kalau nggak perlu
  }
);

// Load semua model
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' &&
      file.slice(-3) === '.js'
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
    console.log(`Model loaded: ${model.name}`);
  });

// Load associations kalau ada
if (fs.existsSync(path.join(__dirname, 'associations.js'))) {
  require('./associations.js')(db);
  console.log('All associations have been set up successfully.');
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
