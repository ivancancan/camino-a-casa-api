const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');

// 🔍 Obtener interesados en una mascota
const getInterestedAdopters = async (req, res) => {
  const { petId } = req.params;
  console.log("🔍 Buscando interesados para petId:", petId);

  // 1. Obtener swipes interesados sin relaciones
  const { data: swipes, error: swipeError } = await supabase
    .from('swipes')
    .select('id, adopter_id, giver_response')
    .eq('pet_id', petId)
    .eq('interested', true)
    .is('giver_response', null);

  if (swipeError) {
    console.error('❌ Error al obtener swipes:', swipeError.message);
    return res.status(400).json({ error: swipeError.message });
  }

  // 2. Obtener perfiles de adoptantes
  const adopterIds = swipes.map(s => s.adopter_id);

  const { data: profiles, error: profileError } = await supabase
    .from('adopter_profiles')
    .select('user_id, tallapreferida, caracterpreferido, motivacion, tienemascotas, vivienda, foto')
    .in('user_id', adopterIds);

  if (profileError) {
    console.error('❌ Error al obtener perfiles:', profileError.message);
    return res.status(400).json({ error: profileError.message });
  }

  // 3. Obtener info básica de users (opcional)
  const { data: adopters, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', adopterIds);

  if (userError) {
    console.error('❌ Error al obtener usuarios:', userError.message);
    return res.status(400).json({ error: userError.message });
  }

  // 4. Unir la info
  const result = swipes.map(swipe => {
    const adopter = adopters.find(u => u.id === swipe.adopter_id);
    const profile = profiles.find(p => p.user_id === swipe.adopter_id);
    return {
      id: swipe.id,
      adopter_id: swipe.adopter_id,
      giver_response: swipe.giver_response,
      adopter,
      adopter_profile: profile,
    };
  });

  console.log("🐾 Interesados encontrados:", result);

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).json(result);
};





// ✅ Giver responde a un swipe (aceptar/rechazar)
const respondToSwipe = async (req, res) => {
  const { swipeId, accepted } = req.body;

  const { error: updateError } = await supabase
    .from('swipes')
    .update({ giver_response: accepted })
    .eq('id', swipeId);

  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  if (!accepted) {
    return res.status(200).json({ message: 'Interesado rechazado' });
  }

  const { data: swipe, error: readError } = await supabase
    .from('swipes')
    .select('adopter_id, pet_id')
    .eq('id', swipeId)
    .single();

  if (readError) {
    return res.status(400).json({ error: readError.message });
  }

  const { adopter_id, pet_id } = swipe;

  const { data: existingMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('adopter_id', adopter_id)
    .eq('pet_id', pet_id)
    .maybeSingle();

  if (!existingMatch) {
    await supabase.from('matches').insert([{ adopter_id, pet_id }]);
  }

  res.status(200).json({ message: '¡Match confirmado!' });
};

// 👤 Obtener foto de perfil del giver
const getGiverProfile = async (req, res) => {
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

// 💾 Guardar foto de perfil del giver
const saveGiverProfile = async (req, res) => {
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

// 📤 Subir imagen del perfil del giver
const uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Archivo inválido' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const fileName = `giver-photos/giver-${userId}-${uuidv4()}.jpg`;

    const { error: uploadError } = await serviceClient.storage
      .from('giver-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: 'No se pudo subir la imagen', details: uploadError });
    }

    const { data: publicData } = serviceClient.storage
      .from('giver-photos')
      .getPublicUrl(fileName);

    res.status(200).json({ message: 'Imagen subida', url: publicData.publicUrl });
  } catch (error) {
    console.error('❌ Error al subir imagen del giver:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🐶 Mascotas del giver + cuántos interesados tiene cada una
const getMyPetsWithInterest = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (petsError) throw petsError;
    if (!pets.length) return res.status(200).json([]);

    const petIds = pets.map(p => p.id);

 const { data: swipes, error: swipesError } = await supabase
  .from('swipes')
  .select('pet_id')
  .in('pet_id', petIds)
  .eq('interested', true)
  .is('giver_response', null); // Solo los interesados que no han sido respondidos

    if (swipesError) throw swipesError;

    const swipeCountByPetId = {};
    swipes.forEach(({ pet_id }) => {
      swipeCountByPetId[pet_id] = (swipeCountByPetId[pet_id] || 0) + 1;
    });

    const enrichedPets = pets.map(pet => ({
      ...pet,
      nuevosInteresados: swipeCountByPetId[pet.id] || 0,
    }));

    res.status(200).json(enrichedPets);
  } catch (err) {
    console.error('❌ Error al obtener mascotas del giver:', err);
    res.status(500).json({ error: 'Error al obtener mascotas del giver' });
  }
};

module.exports = {
  getInterestedAdopters,
  respondToSwipe,
  getGiverProfile,
  saveGiverProfile,
  uploadPhoto,
  getMyPetsWithInterest,
};
