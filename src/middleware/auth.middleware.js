const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('🔐 Header Authorization recibido:', authHeader);

  if (!authHeader) {
    console.warn('⚠️ No se proporcionó el header Authorization');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('⚠️ El header Authorization está mal formado');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Error al verificar token:', err.message);
      return res.status(403).json({ error: 'Token no válido o expirado' });
    }

    console.log('✅ Token verificado. Usuario extraído del token:', user);
    req.user = user;
    next();
  });
}

module.exports = authenticateUser;
