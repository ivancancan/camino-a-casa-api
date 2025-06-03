// src/controllers/swipe.controller.js

const supabase = require('../config/supabaseClient');

exports.registerSwipe = async (req, res) => {
  const { adopterId, petId, interested } = req.body;

  if (!adopterId || !petId || typeof interested !== 'boolean') {
    return res.status(400).json({ error: 'Campos inválidos o incompletos' });
  }

  // Prevenir duplicados
  const { data: existingSwipe } = await supabase
    .from('swipes')
    .select('*')
    .eq('adopter_id', adopterId)
    .eq('pet_id', petId)
    .maybeSingle();

  if (existingSwipe) {
    return res.status(200).json({ message: 'Swipe ya registrado' });
  }

  const { error: swipeError } = await supabase
    .from('swipes')
    .insert([{ adopter_id: adopterId, pet_id: petId, interested }]);

  if (swipeError) return res.status(400).json({ error: swipeError.message });

  if (!interested) {
    return res.status(200).json({ message: 'Swipe registrado' });
  }

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('owner_id')
    .eq('id', petId)
    .single();

  if (petError || !pet) {
    return res.status(400).json({ error: 'No se encontró la mascota' });
  }

  const { data: existingMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('adopter_id', adopterId)
    .eq('pet_id', petId)
    .maybeSingle();

  if (existingMatch) {
    return res.status(200).json({ message: '¡Match ya existía!' });
  }

  const { error: matchError } = await supabase
    .from('matches')
    .insert([{ adopter_id: adopterId, pet_id: petId }]);

  if (matchError) return res.status(500).json({ error: 'Error al crear match' });

  return res.status(200).json({ message: '¡Match registrado!' });
};

exports.getSuggestions = async (req, res) => {
  const adopterId = req.user.id;

  const { data: profile, error: profileError } = await supabase
    .from('adopter_profiles')
    .select('*')
    .eq('user_id', adopterId)
    .single();

  if (profileError || !profile) {
    return res.status(400).json({ error: 'Perfil no encontrado' });
  }

  const { data: swipes } = await supabase
    .from('swipes')
    .select('pet_id')
    .eq('adopter_id', adopterId);

  const swipedIds = swipes?.map((s) => s.pet_id).filter(Boolean) || [];

  let query = supabase
    .from('pets')
    .select('*')
    .eq('status', 'disponible');

  if (swipedIds.length > 0) {
    const formattedIds = swipedIds.map(id => `"${id}"`).join(',');
    query = query.filter('id', 'not.in', `(${formattedIds})`);
  }

  const tallaFilter = Array.isArray(profile.tallapreferida) ? profile.tallapreferida : [];
  const caracterFilter = Array.isArray(profile.caracterpreferido) ? profile.caracterpreferido : [];

  if (tallaFilter.length > 0) {
    query = query.in('talla', tallaFilter);
  }
  if (caracterFilter.length > 0) {
    query = query.overlaps('caracter', caracterFilter);
  }

  const { data: pets, error: petsError } = await query;

  if (petsError) {
    return res.status(400).json({ error: petsError.message });
  }

  return res.status(200).json(pets);
};

exports.getInterestedUsers = async (req, res) => {
  const { petId } = req.params;

  // 1. Traer todos los swipes interesados sin respuesta
  const { data: swipes, error } = await supabase
    .from('swipes')
    .select('*')
    .eq('pet_id', petId)
    .eq('interested', true)
    .is('giver_response', null);

  if (error) {
    console.error("Error obteniendo swipes:", error.message);
    return res.status(500).json({ error: "Error al obtener interesados" });
  }

  const adopterIds = swipes.map((s) => s.adopter_id);

  // 2. Obtener datos del usuario
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', adopterIds);

  if (usersError) {
    console.error("Error obteniendo usuarios:", usersError.message);
    return res.status(500).json({ error: "Error al obtener usuarios" });
  }

  // 3. Obtener perfiles
  const { data: profiles, error: profilesError } = await supabase
    .from('adopter_profiles')
    .select('user_id, motivacion, foto, vivienda, tienemascotas, tallapreferida, caracterpreferido')
    .in('user_id', adopterIds);

  if (profilesError) {
    console.error("Error obteniendo perfiles:", profilesError.message);
    return res.status(500).json({ error: "Error al obtener perfiles" });
  }

  // 4. Merge manual
  const enriched = swipes.map((swipe) => {
    const user = users.find((u) => u.id === swipe.adopter_id);
    const profile = profiles.find((p) => p.user_id === swipe.adopter_id);
    return {
      ...swipe,
      adopter_id: {
        ...user,
        adopter_profile: profile || null,
      },
    };
  });

  res.json(enriched);
};

exports.confirmMatch = async (req, res) => {
  const { adopterId, petId, accepted } = req.body;

  const { error: updateError } = await supabase
    .from('swipes')
    .update({ giver_response: accepted })
    .match({ adopter_id: adopterId, pet_id: petId });

  if (updateError) {
    return res.status(500).json({ error: "Error al guardar respuesta del giver" });
  }

  if (accepted) {
    const { data: existingMatch, error: matchCheckError } = await supabase
      .from('matches')
      .select('*')
      .eq('adopter_id', adopterId)
      .eq('pet_id', petId)
      .maybeSingle();

    if (!existingMatch && !matchCheckError) {
      const { error: matchError } = await supabase
        .from('matches')
        .insert([{ adopter_id: adopterId, pet_id: petId }]);

      if (matchError) {
        return res.status(500).json({ error: "No se pudo crear match" });
      }
    }
  }

  res.json({ message: "Respuesta del giver registrada correctamente" });
};
