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

exports.getConversationsForUser = async (req, res) => {
  const userId = req.user.id;

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      match_id,
      messages(id, message, sender_id, is_read, created_at),
      matches (
        id,
        adopter_id,
        pets (
          id,
          nombre,
          fotos,
          owner_id
        )
      )
    `);

  if (error) {
    console.error('❌ Error al obtener conversaciones:', error.message);
    return res.status(500).json({ error: 'No se pudieron obtener las conversaciones.' });
  }

  const adopterIds = [
    ...new Set(conversations.map(c => c.matches?.adopter_id).filter(Boolean))
  ];

  const { data: adopterProfiles, error: adopterError } = await supabase
    .from('adopter_profiles')
    .select('user_id, foto, users(name)')
    .in('user_id', adopterIds);

  if (adopterError) {
    console.error('❌ Error al obtener adopter_profiles:', adopterError.message);
    return res.status(500).json({ error: 'No se pudieron obtener perfiles de adoptantes.' });
  }

  const adopterMap = Object.fromEntries(
    adopterProfiles.map(p => [p.user_id, { foto: p.foto, nombre: p.users?.name }])
  );

  const ownerIds = [
    ...new Set(conversations.map(c => c.matches?.pets?.owner_id).filter(Boolean))
  ];

  const { data: giverProfiles, error: giverError } = await supabase
    .from('giver_profiles')
    .select('user_id, foto, users(name)')
    .in('user_id', ownerIds);

  if (giverError) {
    console.error('❌ Error al obtener giver_profiles:', giverError.message);
    return res.status(500).json({ error: 'No se pudieron obtener perfiles de givers.' });
  }

  const giverMap = Object.fromEntries(
    giverProfiles.map(p => [p.user_id, { foto: p.foto, nombre: p.users?.name }])
  );

  const formatted = conversations
    .filter(conv => {
      const adopterId = conv.matches?.adopter_id;
      const ownerId = conv.matches?.pets?.owner_id;
      return adopterId === userId || ownerId === userId;
    })
    .map(conv => {
      const match = conv.matches;
      const pet = match.pets;
      const adopter = adopterMap[match.adopter_id];
      const giver = giverMap[pet.owner_id];
      const isAdopter = match.adopter_id === userId;

      const otherUser = isAdopter
        ? {
            foto: giver?.foto || '',
            nombre: giver?.nombre || 'Dueño',
          }
        : {
            foto: adopter?.foto || '',
            nombre: adopter?.nombre || 'Adoptante',
          };

      const unread = conv.messages?.some(m =>
        m.sender_id !== userId && m.is_read === false
      );

      return {
        id: conv.id,
        pet,
        otherUser,
        lastMessage: conv.messages?.[conv.messages.length - 1]?.message || '',
        hasUnreadMessages: unread || false,
      };
    });

  res.status(200).json({ data: formatted });
};

exports.getUnreadMessagesCount = async (req, res) => {
  const userId = req.user.id;

  const { data, error, count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('❌ Error al contar mensajes no leídos:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ count });
};

exports.markMessagesAsRead = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('❌ Error al marcar mensajes como leídos:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'Mensajes marcados como leídos' });
};

exports.getUnreadCountsByConversation = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id') // ya no se usa count:true porque agrupamos manual
    .eq('is_read', false)
    .neq('sender_id', userId); // solo los que no envió él

  if (error) {
    console.error('❌ Error al contar mensajes no leídos por conversación:', error.message);
    return res.status(500).json({ error: error.message });
  }

  // Agrupar por conversation_id
  const counts = {};
  data.forEach((msg) => {
    counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
  });

  res.status(200).json({ counts });
};

