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
      messages(message, created_at),
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

  // Obtener fotos de perfiles de adoptantes
  const adopterIds = [
    ...new Set(conversations.map(c => c.matches?.adopter_id).filter(Boolean))
  ];

  const { data: adopterProfiles, error: adopterError } = await supabase
    .from('adopter_profiles')
    .select('user_id, foto')
    .in('user_id', adopterIds);

  if (adopterError) {
    console.error('❌ Error al obtener adopter_profiles:', adopterError.message);
    return res.status(500).json({ error: 'No se pudieron obtener perfiles de adoptantes.' });
  }

  const adopterMap = Object.fromEntries(adopterProfiles.map(p => [p.user_id, p]));

  // Obtener fotos de perfiles de dueños
  const ownerIds = [
    ...new Set(conversations.map(c => c.matches?.pets?.owner_id).filter(Boolean))
  ];

  const { data: giverProfiles, error: giverError } = await supabase
    .from('giver_profiles')
    .select('user_id, foto')
    .in('user_id', ownerIds);

  if (giverError) {
    console.error('❌ Error al obtener giver_profiles:', giverError.message);
    return res.status(500).json({ error: 'No se pudieron obtener perfiles de givers.' });
  }

  const giverMap = Object.fromEntries(giverProfiles.map(p => [p.user_id, p]));

  // Formato para frontend
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
        ? { foto: giver?.foto || '', nombre: 'Dueño' }
        : { foto: adopter?.foto || '', nombre: 'Adoptante' };

      return {
        id: conv.id,
        pet,
        otherUser,
        lastMessage: conv.messages?.[conv.messages.length - 1]?.message || '',
      };
    });

  res.status(200).json({ data: formatted });
};
