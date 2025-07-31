const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config(); 
const { auth, authAdmin } = require('./authMiddleware');

// ==================== INISIALISASI & KONFIGURASI UTAMA ====================

const app = express();

// 1. Konfigurasi CORS (ditempatkan di paling atas agar berlaku untuk semua request)
const whitelist = ['http://localhost:5173', 'https://madrasah.cipondoh.site'];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 2. Middleware Body Parser
app.use(express.json());

// 3. Middleware untuk menyajikan file statis (gambar, dll.)
// Cukup deklarasikan satu kali di sini.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Middleware untuk header keamanan (opsional, tapi baik untuk ada)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});


// ==================== KONEKSI & SINKRONISASI DATABASE ====================

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, // Matikan logging di production untuk performa lebih baik
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();

// Initialize models
const db = require('./models');


// ==================== KONFIGURASI UPLOAD FILE (MULTER) ====================

const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles/';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const instrumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/instrumen';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadInstrument = multer({ 
  storage: instrumentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diizinkan'), false);
    }
  }
});


// ==================== FUNGSI HELPER ====================

const tentukanKelasBerdasarkanUsia = (tanggalLahir) => {
  if (!tanggalLahir) return null;
  const usia = new Date().getFullYear() - new Date(tanggalLahir).getFullYear();
  const rentangUsia = {
    paud: { min: 4, max: 6 }, caberawit: { min: 7, max: 12 },
    'pra-remaja': { min: 13, max: 15 }, remaja: { min: 16, max: 18 },
    'pra-nikah': { min: 19, max: 100 }
  };
  for (const kelas in rentangUsia) {
    if (usia >= rentangUsia[kelas].min && usia <= rentangUsia[kelas].max) {
      return kelas;
    }
  }
  return null;
};

const konversiNilaiKeHuruf = (nilaiAngka) => {
  const angka = parseFloat(nilaiAngka);
  if (angka >= 4.0) return 'A'; if (angka >= 3.0) return 'B';
  if (angka >= 2.0) return 'C'; if (angka >= 1.0) return 'D';
  return 'E';
};


// ==================== ROUTES API ====================

app.get('/', (req, res) => res.send('Server aktif!'));

// ----- AUTHENTICATION ROUTES -----
// ... (semua rute /api/register dan /api/login Anda di sini)
app.post('/api/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { 
      fullName, username, password, email, phone,
      dateOfBirth, parentName, address 
    } = req.body;

    const profilePicturePath = req.file 
      ? `/uploads/profiles/${req.file.filename}` 
      : '/default-profile.png';

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({ 
      fullName, username, password: hashedPassword, 
      email, phone, dateOfBirth, parentName, address,
      profilePicture: profilePicturePath, role: 'user'
    });
    
    res.status(201).json({ 
      message: 'User berhasil didaftarkan!',
      user: {
        id: newUser.id, username: newUser.username,
        fullName: newUser.fullName, profilePicture: newUser.profilePicture
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username atau Email sudah digunakan' });
    }
    console.error("Error saat registrasi:", error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const user = await db.User.findOne({ 
      where: { username: req.body.username } 
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

      const userKelas = tentukanKelasBerdasarkanUsia(user.dateOfBirth);
      
    const token = jwt.sign(
      { 
        id: user.id, username: user.username, role: user.role,
        profilePicture: user.profilePicture, kelas: userKelas
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token, 
      user: {
        id: user.id, username: user.username, fullName: user.fullName,
        profilePicture: user.profilePicture, role: user.role,
        kelas: userKelas, parentName: user.parentName 
      },
      message: 'Login berhasil!' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});


// ... (semua rute /api/profile Anda di sini)
app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/profile', auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    await user.update(req.body);
    
    const updatedUser = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUser);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email sudah digunakan' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/profile/upload', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang di-upload.' });
    }
    
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    const user = await db.User.findByPk(req.user.id);
    
    if (user) {
      if (user.profilePicture && !user.profilePicture.includes('default-profile.png')) {
        const oldImagePath = path.join(__dirname, user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      user.profilePicture = profilePicturePath;
      await user.save();
    }
    
    const updatedUser = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({ 
      message: 'Foto profil berhasil diupdate.', 
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// ----- ADMIN USER MANAGEMENT ROUTES -----
// ... (semua rute /api/users Anda di sini)
app.get('/api/users', authAdmin, async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/users/profil/:id', auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id, {
      attributes: ['id', 'fullName', 'username', 'profilePicture', 'role', 'createdAt', 'email', 'phone', 'dateOfBirth', 'parentName', 'address'] 
    });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/api/users/kelas/:kelas', auth, async (req, res) => {
  try {
    const allUsers = await db.User.findAll({ 
      where: { role: 'user' },
      attributes: { exclude: ['password'] }
    });
    
    const ageRanges = {
      paud: { min: 4, max: 6 },
      caberawit: { min: 7, max: 12 },
      'pra-remaja': { min: 13, max: 15 },
      remaja: { min: 16, max: 18 },
      'pra-nikah': { min: 19, max: 100 }
    };

    const kelasKey = req.params.kelas.toLowerCase();
    const targetRange = ageRanges[kelasKey];
    
    if (!targetRange) {
      return res.status(400).json({ message: 'Kelas tidak valid' });
    }

    const calculateAge = (dob) => {
      if (!dob) return 0;
      return new Date().getFullYear() - new Date(dob).getFullYear();
    };

    const filteredUsers = allUsers.filter(user => {
      const age = calculateAge(user.dateOfBirth);
      return age >= targetRange.min && age <= targetRange.max;
    });

    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/users/:id', authAdmin, async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    const updateData = { ...otherData };

    if (password && password.length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await db.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    await user.update(updateData);

    const updatedUser = await db.User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ 
      message: 'Data pengguna berhasil diupdate', 
      user: updatedUser 
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username atau email sudah digunakan' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});
app.delete('/api/users/:id', authAdmin, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (user.profilePicture && !user.profilePicture.includes('default-profile.png')) {
      const imagePath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await user.destroy();
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});


// ----- SCHEDULE ROUTES -----
// ... (semua rute /api/jadwal Anda di sini)
app.get('/api/jadwal/:kelas', auth, async (req, res) => {
  try {
    const jadwal = await db.Jadwal.findAll({ 
      where: { kelas: req.params.kelas },
      order: [['hari', 'ASC'], ['waktu', 'ASC']]
    });
    res.json(jadwal);
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
app.post('/api/jadwal', authAdmin, async (req, res) => {
  try {
    const jadwalBaru = await db.Jadwal.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(jadwalBaru);
  } catch (error) {
    res.status(400).json({ message: 'Gagal menambah jadwal' });
  }
});
app.delete('/api/jadwal/:id', authAdmin, async (req, res) => {
  try {
    const deleted = await db.Jadwal.destroy({ 
      where: { id: req.params.id } 
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }
    
    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});


// ----- ATTENDANCE ROUTES -----
// ... (semua rute /api/absensi Anda di sini)
app.get('/api/absensi/rekap/rentang', auth, async (req, res) => {
  try {
    const { kelas, startDate, endDate } = req.query;

    const rekap = await db.Absensi.findAll({
      where: {
        kelas: kelas,
        tanggal: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }
    });

    res.json({ success: true, data: rekap });

  } catch (error) {
    console.error('Error rekap absensi rentang:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
app.get('/api/absensi/:kelas/:tanggal', auth, async (req, res) => {
  try {
    const { kelas, tanggal } = req.params;
    const absensi = await db.Absensi.findAll({
      where: {
        kelas: kelas,
        tanggal: new Date(tanggal)
      },
      include: [
        { 
          model: db.User,
          attributes: ['id', 'fullName', 'profilePicture'],
          as: 'user'
        }
      ]
    });
    res.json(absensi);
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
app.get('/api/absensi/rekap/:kelas/:bulan', auth, async (req, res) => {
  try {
    const { kelas, bulan } = req.params;
    const [year, month] = bulan.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const rekap = await db.Absensi.findAll({
      where: {
        kelas: kelas,
        tanggal: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      include: [
        { 
          model: db.User,
          attributes: ['id', 'fullName'],
          as: 'user'
        }
      ],
      order: [['tanggal', 'DESC']]
    });
    
    res.json(rekap);
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
app.post('/api/absensi', authAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { kelas, tanggal, absensi: absensiData } = req.body;
    
    await db.Absensi.destroy({ 
      where: { 
        kelas: kelas,
        tanggal: new Date(tanggal)
      },
      transaction: t
    });

    const newAbsensi = await db.Absensi.bulkCreate(
      absensiData.map(item => ({
        tanggal: new Date(tanggal),
        kelas: kelas,
        userId: item.userId,
        status: item.status
      })),
      { transaction: t }
    );

    await t.commit();
    res.status(200).json({ message: 'Absensi berhasil disimpan', data: newAbsensi });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: 'Gagal menyimpan absensi' });
  }
});

// ----- ANNOUNCEMENT ROUTES -----
// ... (semua rute /api/pengumuman Anda di sini)
app.get('/api/pengumuman/:kelas', auth, async (req, res) => {
  try {
    const pengumuman = await db.Pengumuman.findAll({
      where: { kelas: req.params.kelas },
      order: [['createdAt', 'DESC']],
      include: [
        { 
          model: db.User,
          as: 'createdByUser',
          attributes: ['id', 'fullName', 'profilePicture']
        },
        {
          model: db.Komentar,
          as: 'komentar',
          include: [
            {
              model: db.User,
              as: 'author',
              attributes: ['id', 'fullName', 'profilePicture']
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    res.json(pengumuman);
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
app.post('/api/pengumuman', authAdmin, async (req, res) => {
  try {
    const pengumumanBaru = await db.Pengumuman.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    const pengumumanWithCreator = await db.Pengumuman.findByPk(pengumumanBaru.id, {
      include: [
        {
          model: db.User,
          as: 'createdByUser',
          attributes: ['id', 'fullName', 'profilePicture']
        }
      ]
    });
    
    res.status(201).json(pengumumanWithCreator);
  } catch (error) {
    res.status(400).json({ message: 'Gagal membuat pengumuman' });
  }
});
app.put('/api/pengumuman/:id', authAdmin, async (req, res) => {
  try {
    const { judul, isi } = req.body;
    
    const [updated] = await db.Pengumuman.update(
      { judul, isi },
      { where: { id: req.params.id } }
    );
    
    if (updated === 0) {
      return res.status(404).json({ message: 'Pengumuman tidak ditemukan' });
    }
    
    const updatedPengumuman = await db.Pengumuman.findByPk(req.params.id);
    res.json(updatedPengumuman);
  } catch (error) {
    res.status(400).json({ message: 'Gagal mengupdate pengumuman' });
  }
});
app.delete('/api/pengumuman/:id', authAdmin, async (req, res) => {
  try {
    const deleted = await db.Pengumuman.destroy({
      where: { id: req.params.id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Pengumuman tidak ditemukan' });
    }
    
    res.json({ message: 'Pengumuman berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ message: 'Gagal menghapus pengumuman' });
  }
});
app.post('/api/pengumuman/:id/komentar', auth, async (req, res) => {
  try {
    const komentarBaru = await db.Komentar.create({
      isi: req.body.isi,
      userId: req.user.id,
      pengumumanId: req.params.id
    });
    
    const komentarWithAuthor = await db.Komentar.findByPk(komentarBaru.id, {
      include: [
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'fullName', 'profilePicture']
        }
      ]
    });
    
    res.status(201).json(komentarWithAuthor);
  } catch (error) {
    res.status(400).json({ message: 'Gagal menambah komentar' });
  }
});
app.delete('/api/pengumuman/:pengumumanId/komentar/:komentarId', authAdmin, async (req, res) => {
  try {
    const deleted = await db.Komentar.destroy({
      where: { id: req.params.komentarId }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Komentar tidak ditemukan' });
    }
    
    res.json({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ message: 'Gagal menghapus komentar' });
  }
});


// ----- JOURNAL ROUTES -----
// ... (semua rute /api/jurnal Anda di sini)
app.get('/api/jurnal/rekap/:kelas/:bulan', auth, async (req, res) => {
  try {
    const { kelas, bulan } = req.params;
    const rekapJurnal = await db.Jurnal.findAll({
      where: {
        kelas: kelas,
        [Op.and]: [
          sequelize.where(
            sequelize.fn('DATE_FORMAT', sequelize.col('tanggal'), '%Y-%m'), 
            bulan
          )
        ]
      },
      include: [{
        model: db.User,
        as: 'createdByUser',
        attributes: ['id', 'fullName']
      }],
      order: [['tanggal', 'DESC']]
    });
    res.json({ success: true, data: rekapJurnal });
  } catch (error) {
    console.error(`Error saat mengambil REKAP JURNAL untuk kelas ${req.params.kelas}:`, error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
app.post('/api/jurnal', authAdmin, async (req, res) => {
  try {
    const jurnalBaru = await db.Jurnal.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    res.status(201).json(jurnalBaru);
  } catch (error) {
    res.status(400).json({ message: 'Gagal menyimpan jurnal' });
  }
});
app.put('/api/jurnal/:id', authAdmin, async (req, res) => {
  try {
    const { tanggal, materi, keterangan } = req.body;
    
    const [updated] = await db.Jurnal.update(
      { tanggal, materi, keterangan },
      { where: { id: req.params.id } }
    );
    
    if (updated === 0) {
      return res.status(404).json({ message: 'Jurnal tidak ditemukan' });
    }
    
    res.json({ message: "Jurnal berhasil diupdate" });
  } catch (error) {
    res.status(400).json({ message: 'Gagal mengupdate jurnal' });
  }
});
app.delete('/api/jurnal/:id', authAdmin, async (req, res) => {
  try {
    const deleted = await db.Jurnal.destroy({
      where: { id: req.params.id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Jurnal tidak ditemukan' });
    }
    
    res.json({ message: 'Jurnal berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ message: 'Gagal menghapus jurnal' });
  }
});


// ----- INSTRUMENT ROUTES -----
// ... (semua rute /api/instrumen Anda di sini)
app.get('/api/instrumen/:kelas/:jenis', auth, async (req, res) => {
  try {
    const instrument = await db.Instrument.findOne({
      where: { 
        kelas: req.params.kelas, 
        jenis: req.params.jenis 
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.User,
          as: 'uploadedByUser',
          attributes: ['id', 'fullName']
        }
      ]
    });
    
    res.json(instrument || null);
  } catch (error) {
    console.error(`Error saat mengambil jadwal untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
app.get('/api/instrumen/:kelas/:jenis/files', auth, async (req, res) => {
  try {
    const { kelas, jenis } = req.params;
    const files = await db.Instrument.findAll({
      where: {
        kelas: kelas,
        jenis: jenis
      },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error saat mengambil daftar file instrumen:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
app.post('/api/instrumen', authAdmin, uploadInstrument.single('file'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { kelas, jenis } = req.body;
    
    const instrument = await db.Instrument.create({
      kelas, jenis,
      filePath: `/uploads/instrumen/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json(instrument);
  } catch (error) {
    await t.rollback();
    
    if (req.file) {
      const filePath = path.join(__dirname, 'uploads/instrumen', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(400).json({ message: 'Gagal mengupload file' });
  }
});
app.delete('/api/instrumen/:id', authAdmin, async (req, res) => {
  try {
    const instrument = await db.Instrument.findByPk(req.params.id);
    
    if (!instrument) {
      return res.status(404).json({ message: 'File tidak ditemukan' });
    }

    const filePath = path.join(__dirname, instrument.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await instrument.destroy();
    
    res.json({ message: 'File berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ message: 'Gagal menghapus file' });
  }
});


// ----- REPORT CARD ROUTES -----
// ... (semua rute /api/template dan /api/raport Anda di sini)
app.get('/api/template/:kelas', authAdmin, async (req, res) => {
  try {
    const template = await db.RaportTemplate.findOne({
      where: { kelas: req.params.kelas },
      include: [{ model: db.RaportTemplateKolom, as: 'kolom' }]
    });
    // KOREKSI: Mengirim data yang benar
    res.json({ success: true, data: template || { kolom: [] } }); 
  } catch (error) {
    console.error(`Error mengambil template untuk kelas ${req.params.kelas}:`, error); 
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/template/public/:kelas', auth, async (req, res) => {
  try {
    const template = await db.RaportTemplate.findOne({
      where: { kelas: req.params.kelas },
      attributes: ['waliKelas']
    });
    // KOREKSI: Tidak mengirim 404 jika data kosong
    res.json({ success: true, data: template || null });
  } catch (error) {
    console.error(`Error mengambil template publik untuk kelas ${req.params.kelas}:`, error);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/template/:kelas/kolom', authAdmin, async (req, res) => {
  try {
    const [template] = await db.RaportTemplate.findOrCreate({
      where: { kelas: req.params.kelas },
      defaults: { dibuatOleh: req.user.id }
    });
    
    const kolomBaru = await db.RaportTemplateKolom.create({
      nama: req.body.nama,
      tipe: req.body.tipe || 'Teks',
      templateId: template.id
    });
    
    res.status(201).json(kolomBaru);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.delete('/api/template/:kelas/kolom/:kolomId', authAdmin, async (req, res) => {
  try {
    const deleted = await db.RaportTemplateKolom.destroy({
      where: { id: req.params.kolomId }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Kolom tidak ditemukan' });
    }
    
    res.json({ message: 'Materi berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/template/:kelas/walikelas', authAdmin, async (req, res) => {
  try {
    const { waliKelas } = req.body;
    const { kelas } = req.params;

    const [template] = await db.RaportTemplate.findOrCreate({
      where: { kelas: kelas },
      defaults: { dibuatOleh: req.user.id }
    });
    
    await template.update({ waliKelas: waliKelas });
    
    res.json({ success: true, message: 'Nama wali kelas berhasil disimpan.' });
  } catch (error) {
    console.error('Error menyimpan wali kelas:', error);
    res.status(500).json({ message: 'Gagal menyimpan nama wali kelas.' });
  }
});
app.get('/api/raport/:siswaId/:kelas/:periode', auth, async (req, res) => {
  try {
    const raport = await db.RaportSiswa.findOne({
      where: { 
        siswaId: req.params.siswaId, 
        kelas: req.params.kelas,
        periode: req.params.periode 
      },
      include: [
        {
          model: db.RaportNilai,
          as: 'nilai',
          order: [['createdAt', 'ASC']]
        }
      ]
    });
    // KOREKSI: Tidak mengirim 404 jika data kosong
    res.json({ data: raport || null });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/raport', authAdmin, async (req, res) => {
  try {
    const { siswaId, kelas, periode, materi, uraianMateri, nilaiAngka, keterangan } = req.body;
    
    const [raport] = await db.RaportSiswa.findOrCreate({
      where: { siswaId, kelas, periode },
      defaults: { catatanGuru: '' }
    });
    
    const nilaiBaru = await db.RaportNilai.create({
      raportSiswaId: raport.id,
      materi, uraianMateri, nilaiAngka, keterangan,
      nilaiHuruf: konversiNilaiKeHuruf(nilaiAngka)
    });
    
    const raportLengkap = await db.RaportSiswa.findByPk(raport.id, {
      include: [
        { model: db.RaportNilai, as: 'nilai', order: [['createdAt', 'ASC']] }
      ]
    });
    
    res.status(201).json(raportLengkap);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.delete('/api/raport/:raportId/nilai/:nilaiId', authAdmin, async (req, res) => {
  try {
    const deleted = await db.RaportNilai.destroy({
      where: { id: req.params.nilaiId, raportSiswaId: req.params.raportId }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Data nilai tidak ditemukan' });
    }
    
    res.json({ message: 'Data nilai berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/raport/:raportId/nilai/:nilaiId', authAdmin, async (req, res) => {
  try {
    const { materi, uraianMateri, nilaiAngka, keterangan } = req.body;
    
    const [updated] = await db.RaportNilai.update(
      {
        materi, uraianMateri, nilaiAngka, keterangan,
        nilaiHuruf: konversiNilaiKeHuruf(nilaiAngka)
      },
      { where: { id: req.params.nilaiId, raportSiswaId: req.params.raportId } }
    );
    
    if (updated === 0) {
      return res.status(404).json({ message: "Nilai tidak ditemukan" });
    }
    
    const updatedNilai = await db.RaportNilai.findByPk(req.params.nilaiId);
    res.json(updatedNilai);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.put('/api/raport/:raportId/catatan', authAdmin, async (req, res) => {
  try {
    const [updated] = await db.RaportSiswa.update(
      { catatanGuru: req.body.catatanGuru },
      { where: { id: req.params.raportId } }
    );
    
    if (updated === 0) {
      return res.status(404).json({ message: 'Raport tidak ditemukan' });
    }
    
    res.json({ message: 'Catatan guru berhasil disimpan.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});


// ==================== ERROR HANDLER & SERVER START ====================

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      message: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File terlalu besar (maks 10MB)' 
        : 'Error upload file' 
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token telah kadaluarsa' });
  }
  
  res.status(500).json({ 
    message: 'Terjadi kesalahan server',
    error: process.env.NODE_ENV === 'production' ? err.message : {}
  });
});

const PORT = process.env.PORT || 3000;
db.sequelize.sync({ force: false }).then(() => {
  console.log('Database & tables synced successfully.');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port: ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync database:', err);
});