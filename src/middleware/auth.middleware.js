const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Error al verificar token:', err.message);
      return res.status(403).json({ error: 'Token no válido o expirado' });
    }

    req.user = user;
    next();
  });
}

module.exports = authenticateUser;
