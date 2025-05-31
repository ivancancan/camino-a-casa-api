// src/controllers/message.controller.js
const supabase = require('../config/supabaseClient');

exports.sendMessage = async (req, res) => {
  const { conversation_id, message } = req.body;
  const sender_id = req.user?.id;

  console.log('📨 Nueva petición de mensaje');
  console.log('conversation_id:', conversation_id);
  console.log('sender_id:', sender_id);
  console.log('message:', message);

  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id, sender_id, message }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error al guardar mensaje:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Mensaje enviado', data });
};

exports.getMessages = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('messages')
    .select('id, message, sender_id, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(data);
};
