const jwt = require('jsonwebtoken');
const { User } = require('./models'); 

// 1. Middleware dasar untuk memeriksa apakah user sudah login
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Akses ditolak: Tidak ada token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Akses ditolak: Token tidak valid' });
    }
    req.user = decoded; // Simpan payload token (berisi id, username, role)
    next();
  });
}

// 2. Middleware untuk memeriksa apakah user adalah admin
function authAdmin(req, res, next) {
  // Panggil middleware 'auth' terlebih dahulu
  auth(req, res, () => {
    // Kemudian, periksa role dari payload token
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya untuk admin.' });
    }
    next(); // Jika benar admin, lanjutkan
  });
}

module.exports = { auth, authAdmin };