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
  console.log('📨 Obteniendo mensajes para conversación:', id);

  const { data, error } = await supabase
    .from('messages')
    .select('id, message, sender_id, is_read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener mensajes:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
};

exports.getConversationsForUser = async (req, res) => {
  const userId = req.user.id;
  console.log('👤 Obteniendo conversaciones para usuario:', userId);

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

  console.log('📥 Conversaciones encontradas:', conversations.length);

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
          .select('message, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let lastMessage = '';
        if (!lastMsgError && lastMessageData?.message) {
          lastMessage = lastMessageData.message;
          if (lastMessageData.sender_id === SYSTEM_USER_ID) {
            otherUser.nombre = 'CaminoBot';
          }
        }

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
  const userId = req.user?.id;
  console.log('🔍 Verificando mensajes no leídos para usuario:', userId);

  if (!userId) {
    console.error('⛔ Usuario no autenticado en getUnreadMessagesCount');
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, matches ( adopter_id, pets ( owner_id ) )');

  if (convError) {
    console.error('❌ Error al obtener conversaciones del usuario:', convError.message);
    return res.status(500).json({ error: convError.message });
  }

  const validConversationIds = conversations
    .filter(c =>
      c.matches?.adopter_id === userId || c.matches?.pets?.owner_id === userId
    )
    .map(c => c.id);

  if (validConversationIds.length === 0) {
    console.log('📭 Sin conversaciones válidas');
    return res.status(200).json({ count: 0 });
  }

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', validConversationIds)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('❌ Error al contar mensajes no leídos:', error.message);
    return res.status(500).json({ error: error.message });
  }

  console.log('📬 Total mensajes no leídos:', count);
  res.status(200).json({ count });
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    console.log('✅ Marcar como leído conversación:', conversationId);

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
      console.log('🔹 No hay mensajes para marcar como leídos');
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
  const userId = req.user?.id;
  console.log('🔎 Buscando mensajes no leídos por conversación para usuario:', userId);

  if (!userId) {
    console.error('⛔ Usuario no autenticado en getUnreadCountsByConversation');
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

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

  console.log('📊 Conteo por conversación:', counts);
  res.status(200).json({ counts });
};
