const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Token recibido en el middleware:', token);
  console.log('🛡️ Usando JWT_SECRET del entorno:', process.env.JWT_SECRET);

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    // Solo para depurar el contenido sin verificar
    const decoded = jwt.decode(token);
    console.log('🧬 Contenido del token (sin verificar):', decoded);
  } catch (e) {
    console.error('❌ No se pudo decodificar el token:', e.message);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Error al verificar token:', err.message);
      return res.status(403).json({ error: 'Token no válido o expirado' });
    }

    console.log('✅ Token verificado. Usuario:', user);
    req.user = user;
    req.token = token; // ⬅️ Esta línea es esencial
    next();
  });
};
