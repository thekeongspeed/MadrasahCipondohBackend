'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

// Tentukan environment saat ini. Jika tidak di-set, anggap 'development'.
// Railway secara otomatis men-set NODE_ENV menjadi 'production'.
const env = process.env.NODE_ENV || 'development';

// Muat file konfigurasi berdasarkan environment yang sedang berjalan.
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
// Bagian ini akan menggunakan konfigurasi dari config.json
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // ====================================================================
  // === INI ADALAH BAGIAN KUNCI YANG KITA MODIFIKASI SECARA BENAR ===
  // ====================================================================

  // Kita hanya menambahkan konfigurasi SSL jika environment adalah 'production'
  if (env === 'production') {
    // Tambahkan dialectOptions untuk SSL ke dalam objek config
    config.dialectOptions = {
      ssl: {
        ca: fs.readFileSync(path.join(__dirname, '../ca.pem'))
      }
    };
  }

  // Gunakan objek config yang sudah final (yang mungkin sudah ditambahkan SSL)
  // untuk membuat koneksi Sequelize.
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Bagian ini memuat semua file model (User.js, Product.js, dll) secara otomatis
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Bagian ini menjalankan fungsi asosiasi jika ada (misal: User.hasMany(Post))
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;