module.exports = (db) => {
  // Validasi model exist
  const requiredModels = ['User', 'Jadwal', 'Pengumuman', 'Komentar', 'Instrument', 'Absensi', 'RaportSiswa'];
  
  requiredModels.forEach(modelName => {
    if (!db[modelName]) {
      throw new Error(`Model ${modelName} is not registered in db object`);
    }
  });

  // User associations
  db.User.hasMany(db.Jadwal, { foreignKey: 'createdBy', as: 'jadwal' });
  db.User.hasMany(db.Pengumuman, { foreignKey: 'createdBy', as: 'pengumuman' });
  db.User.hasMany(db.Komentar, { foreignKey: 'userId', as: 'komentar' });
  db.User.hasMany(db.Instrument, { foreignKey: 'uploadedBy', as: 'instrumen' });
  db.User.hasMany(db.Absensi, { foreignKey: 'userId', as: 'absensi' });
  db.User.hasMany(db.RaportSiswa, { foreignKey: 'siswaId', as: 'raport' });
  
  // Jadwal associations
  db.Jadwal.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
  
  // Pengumuman associations
  db.Pengumuman.belongsTo(db.User, { foreignKey: 'createdBy', as: 'createdByUser' });
  db.Pengumuman.hasMany(db.Komentar, { foreignKey: 'pengumumanId', as: 'komentar' });
  
  // Komentar associations
  db.Komentar.belongsTo(db.User, { foreignKey: 'userId', as: 'author' });
  db.Komentar.belongsTo(db.Pengumuman, { foreignKey: 'pengumumanId', as: 'pengumuman' });
  
  // Instrument associations
  db.Instrument.belongsTo(db.User, { foreignKey: 'uploadedBy', as: 'uploadedByUser' });
  
  // Absensi associations
  db.Absensi.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });


  db.Jurnal.belongsTo(db.User, { foreignKey: 'createdBy', as: 'createdByUser' });
  db.User.hasMany(db.Jurnal, { foreignKey: 'createdBy', as: 'jurnal' });
  

  
  // Raport associations
  if (db.RaportTemplate && db.RaportTemplateKolom) {
    db.RaportTemplate.hasMany(db.RaportTemplateKolom, { 
      foreignKey: 'templateId', 
      as: 'kolom' 
    });
    
    db.RaportTemplateKolom.belongsTo(db.RaportTemplate, { 
      foreignKey: 'templateId', 
      as: 'template' 
    });
  }
  
  if (db.RaportSiswa && db.RaportNilai) {
    db.RaportSiswa.hasMany(db.RaportNilai, { 
      foreignKey: 'raportSiswaId', 
      as: 'nilai' 
    });
    
    db.RaportNilai.belongsTo(db.RaportSiswa, { 
      foreignKey: 'raportSiswaId', 
      as: 'raport' 
    });
  }

  console.log('All associations have been set up successfully');
};