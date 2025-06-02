// controllers/giver.controller.js
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');

// GET /api/giver/pet/:petId/interested
exports.getInterestedAdopters = async (req, res) => {
  const { petId } = req.params;

  const { data, error } = await supabase
    .from('swipes')
    .select(`
      id,
      adopter_id,
      giver_response,
      adopter:adopter_id ( id, name, email ),
      profile:adopter_id ( tallaPreferida, caracterPreferido )
    `)
    .eq('pet_id', petId)
    .eq('interested', true);

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json(data);
};

// POST /api/giver/swipe
exports.respondToSwipe = async (req, res) => {
  const { swipeId, accepted } = req.body;

  const { error: updateError } = await supabase
    .from('swipes')
    .update({ giver_response: accepted })
    .eq('id', swipeId);

  if (updateError) return res.status(400).json({ error: updateError.message });

  if (!accepted) {
    return res.status(200).json({ message: 'Interesado rechazado' });
  }

  const { data: swipeData, error: readError } = await supabase
    .from('swipes')
    .select('adopter_id, pet_id')
    .eq('id', swipeId)
    .single();

  if (readError) return res.status(400).json({ error: readError.message });

  const { adopter_id, pet_id } = swipeData;

  const { data: existingMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('adopter_id', adopter_id)
    .eq('pet_id', pet_id)
    .maybeSingle();

  if (!existingMatch) {
    await supabase
      .from('matches')
      .insert([{ adopter_id, pet_id }]);
  }

  return res.status(200).json({ message: '¡Match confirmado!' });
};


// GET /api/giver/profile
exports.getGiverProfile = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('giver_profiles')
    .select('foto')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error al obtener perfil del giver:', error.message);
    return res.status(500).json({ error: 'No se pudo obtener el perfil' });
  }

  res.status(200).json({ profile: data });
};

// POST /api/giver/profile
exports.saveGiverProfile = async (req, res) => {
  const userId = req.user.id;
  const { foto } = req.body;

  const { data, error } = await supabase
    .from('giver_profiles')
    .upsert([{ user_id: userId, foto }], { onConflict: ['user_id'] });

  if (error) {
    console.error('❌ Error al guardar foto del giver:', error.message);
    return res.status(500).json({ error: 'No se pudo guardar la foto' });
  }

  res.status(200).json({ profile: data?.[0] });
};

// POST /api/giver/upload-photo
exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen.' });
    }

    const file = req.files.file;

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'El archivo no es una imagen válida.' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const buffer = file.data;
    const fileName = `giver-photos/giver-${userId}-${uuidv4()}.jpg`;

    const result = await serviceClient.storage
      .from('giver-photos')
      .upload(fileName, buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (result.error) {
      return res.status(500).json({ error: 'No se pudo subir la imagen', details: result.error });
    }

    const { data: publicData } = serviceClient.storage
      .from('giver-photos')
      .getPublicUrl(fileName);

    const publicUrl = publicData.publicUrl;

    res.status(200).json({ message: 'Imagen subida', url: publicUrl });
  } catch (error) {
    console.error('❌ Error al subir foto de perfil del giver:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
