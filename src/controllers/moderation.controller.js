const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.reportContent = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { tipo, id, motivo } = req.body;

    const { error } = await supabase
      .from('reports')
      .insert([{ user_id: userId, tipo, reported_id: id, motivo }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Reporte enviado' });
  } catch (err) {
    console.error('❌ Error al reportar:', err);
    return res.status(500).json({ error: 'Error al enviar reporte' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const blockerId = decoded.id;
    const { blockedId } = req.body;

    const { error } = await supabase
      .from('blocked_users')
      .insert([{ blocker_id: blockerId, blocked_id: blockedId }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Usuario bloqueado' });
  } catch (err) {
    console.error('❌ Error al bloquear usuario:', err);
    return res.status(500).json({ error: 'Error al bloquear usuario' });
  }
};
