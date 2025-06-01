const supabase = require('../config/supabaseClient');

const SYSTEM_USER_ID = '5d295b28-25ce-4e1b-baa1-8fe2e8f805f7'; // CaminoBot UUID real

// 🧠 Utilidad para insertar mensajes automáticos del sistema
exports.sendSystemMessage = async (conversation_id, message) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id, sender_id: SYSTEM_USER_ID, message, is_read: false }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error al insertar mensaje automático:', error.message);
    return null;
  }

  console.log('✅ Mensaje automático enviado:', data);
  return data;
};

exports.sendMessage = async (req, res) => {
  const { conversation_id, message } = req.body;
  const sender_id = req.user?.id;

  console.log('📨 Nueva petición de mensaje');
  console.log('conversation_id:', conversation_id);
  console.log('sender_id:', sender_id);
  console.log('message:', message);

  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id, sender_id, message, is_read: false }])
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
    .select('id, message, sender_id, is_read, created_at')
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

  const adopterIds = [...new Set(conversations.map(c => c.matches?.adopter_id).filter(Boolean))];

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

  const ownerIds = [...new Set(conversations.map(c => c.matches?.pets?.owner_id).filter(Boolean))];

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

  const { data: unreadMsgs, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false)
    .neq('sender_id', userId);

  const unreadMap = {};
  if (!unreadError && unreadMsgs) {
    unreadMsgs.forEach(msg => {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
    });
  }

  const formatted = await Promise.all(
    conversations
      .filter(conv => {
        const adopterId = conv.matches?.adopter_id;
        const ownerId = conv.matches?.pets?.owner_id;
        return adopterId === userId || ownerId === userId;
      })
      .map(async (conv) => {
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

        const unread = unreadMap[conv.id] > 0;

        const { data: lastMessageData, error: lastMsgError } = await supabase
          .from('messages')
          .select('message')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastMessage = lastMsgError ? '' : lastMessageData?.message || '';

        return {
          id: conv.id,
          pet,
          otherUser,
          lastMessage,
          hasUnreadMessages: unread,
        };
      })
  );

  res.status(200).json({ data: formatted });
};

exports.getUnreadMessagesCount = async (req, res) => {
  const userId = req.user.id;

  const { count, error } = await supabase
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
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const { data: mensajes, error } = await supabase
      .from('messages')
      .select('id, sender_id, is_read')
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error al obtener mensajes:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const idsParaMarcar = mensajes
      .filter((msg) => msg.sender_id !== userId)
      .map((msg) => msg.id);

    if (idsParaMarcar.length === 0) {
      return res.status(200).json({ message: 'Nada que marcar como leído' });
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', idsParaMarcar);

    if (updateError) {
      console.error('❌ Error al marcar como leídos:', updateError.message);
      return res.status(500).json({ error: updateError.message });
    }

    res.status(200).json({ message: 'Mensajes marcados como leídos' });
  } catch (e) {
    console.error('❌ Error inesperado:', e.message);
    res.status(500).json({ error: 'Error interno al marcar como leídos' });
  }
};

exports.getUnreadCountsByConversation = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false)
    .neq('sender_id', userId);

  if (error) {
    console.error('❌ Error al contar mensajes no leídos por conversación:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const counts = {};
  data.forEach((msg) => {
    counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
  });

  res.status(200).json({ counts });
};
