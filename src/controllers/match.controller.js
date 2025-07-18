const supabase = require('../config/supabaseClient');

exports.getConfirmedMatchesForGiver = async (req, res) => {
  const userId = req.user.id;

  // Obtener mascotas del giver
  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId);

  if (petsError || !pets) {
    console.error('❌ Error al obtener mascotas:', petsError?.message);
    return res.status(500).json({ error: 'No se pudieron obtener las mascotas del giver' });
  }

  const petIds = pets.map(p => p.id);
  if (petIds.length === 0) return res.status(200).json({ matches: [] });

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
 adopter_profiles (
  user_id,
  foto,
  users!fk_adopter_user (
    id,
    name,
    email
  )
),
      pets (
        id,
        nombre,
        fotos,
        status
      )
    `)
    .in('pet_id', petIds);

  if (matchesError) {
    console.error('❌ Error al obtener matches:', matchesError.message);
    return res.status(500).json({ error: 'Error al obtener los matches' });
  }

  const confirmedMatches = [];
  for (const match of matches) {
    const { adopter_id, pet_id } = match;
    try {
      const { data: adopterSwipe } = await supabase
        .from('swipes')
        .select('interested')
        .eq('adopter_id', adopter_id)
        .eq('pet_id', pet_id)
        .maybeSingle();

      const { data: giverSwipe } = await supabase
        .from('swipes')
        .select('giver_response')
        .eq('adopter_id', adopter_id)
        .eq('pet_id', pet_id)
        .maybeSingle();

      if (adopterSwipe?.interested && giverSwipe?.giver_response === true) {
        confirmedMatches.push(match);
      }
    } catch (err) {
      console.error('❌ Error al verificar swipes para match:', err.message);
    }
  }

  return res.status(200).json({ matches: confirmedMatches });
};

exports.getConfirmedMatchesForAdopter = async (req, res) => {
  const userId = req.user.id;

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      pets (
        id,
        nombre,
        descripcion,
        fotos,
        status,
        owner_id,
        users (
          id,
          name,
          email,
          giver_profiles (
            foto
          )
        )
      )
    `)
    .eq('adopter_id', userId);

  if (matchesError) {
    console.error('❌ Error al obtener matches del adoptante:', matchesError.message);
    return res.status(500).json({ error: 'Error al obtener los matches', detail: matchesError.message });
  }

  const confirmedMatches = [];
  for (const match of matches) {
    const { adopter_id, pet_id } = match;
    try {
      const { data: adopterSwipe } = await supabase
        .from('swipes')
        .select('interested')
        .eq('adopter_id', adopter_id)
        .eq('pet_id', pet_id)
        .maybeSingle();

      const { data: giverSwipe } = await supabase
        .from('swipes')
        .select('giver_response')
        .eq('adopter_id', adopter_id)
        .eq('pet_id', pet_id)
        .maybeSingle();

      if (adopterSwipe?.interested && giverSwipe?.giver_response === true) {
        confirmedMatches.push(match);
      }
    } catch (err) {
      console.error('❌ Error al validar swipes del adoptante:', err.message);
    }
  }

  return res.status(200).json(confirmedMatches);
};

// Crear conversación si no existe
exports.createConversationIfNotExists = async (req, res) => {
  const { matchId } = req.params;

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error al verificar conversación existente:', findError.message);
    return res.status(500).json({ error: findError.message });
  }

  if (existing) {
    return res.status(200).json({ message: 'Ya existe conversación', id: existing.id });
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert([{ match_id: matchId }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error al crear conversación:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Conversación creada', conversation: data });
};

exports.getUnseenMatchesCount = async (req, res) => {
  const userId = req.user.id;

  // Obtener mascotas del usuario (giver)
  const { data: myPets, error: petsError } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId);

  if (petsError) {
    console.error('❌ Error al obtener mascotas del usuario:', petsError.message);
    return res.status(500).json({ error: petsError.message });
  }

  const myPetIds = myPets?.map(p => p.id) || [];

  // Construir filtro condicional para la consulta
  let filterString;
  if (myPetIds.length > 0) {
    filterString = `adopter_id.eq.${userId},pet_id.in.(${myPetIds.join(',')})`;
  } else {
    filterString = `adopter_id.eq.${userId}`;
  }

  // Obtener matches relevantes y no vistos
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      adopter_id,
      pet_id,
      is_seen_by_adopter,
      is_seen_by_giver
    `)
    .or(filterString);

  if (error) {
    console.error('❌ Error al obtener matches para contar unseen:', error.message);
    return res.status(500).json({ error: error.message });
  }

  let count = 0;

  for (const match of matches) {
    try {
      // Consultar swipes relacionados para el match
      const { data: adopterSwipe } = await supabase
        .from('swipes')
        .select('interested')
        .eq('adopter_id', match.adopter_id)
        .eq('pet_id', match.pet_id)
        .maybeSingle();

      const { data: giverSwipe } = await supabase
        .from('swipes')
        .select('giver_response')
        .eq('adopter_id', match.adopter_id)
        .eq('pet_id', match.pet_id)
        .maybeSingle();

      const confirmed = adopterSwipe?.interested && giverSwipe?.giver_response === true;

      if (!confirmed) continue;

      // Contar solo si no ha sido visto según el rol del usuario
      if (match.adopter_id === userId && match.is_seen_by_adopter === false) count++;
      else if (myPetIds.includes(match.pet_id) && match.is_seen_by_giver === false) count++;
    } catch (err) {
      console.error('❌ Error al verificar swipes para match:', err.message);
    }
  }

  return res.status(200).json({ unseenCount: count });
};



exports.markMatchesAsSeen = async (req, res) => {
  const userId = req.user.id;

  const { data: pets } = await supabase
    .from('pets')
    .select('id, owner_id');

  const myPets = pets.filter(p => p.owner_id === userId).map(p => p.id);

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, adopter_id, pet_id');

  if (error) {
    console.error('❌ Error al obtener matches para marcar vistos:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const updates = [];

  for (const match of matches) {
    if (match.adopter_id === userId) {
      updates.push(
        supabase
          .from('matches')
          .update({ is_seen_by_adopter: true })
          .eq('id', match.id)
      );
    } else if (myPets.includes(match.pet_id)) {
      updates.push(
        supabase
          .from('matches')
          .update({ is_seen_by_giver: true })
          .eq('id', match.id)
      );
    }
  }

  try {
    await Promise.all(updates);
    res.status(200).json({ message: 'Todos los matches confirmados marcados como vistos' });
  } catch (err) {
    console.error('❌ Error al actualizar matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};
