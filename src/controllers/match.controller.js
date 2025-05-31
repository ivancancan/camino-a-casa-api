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

  // Obtener matches con adopter_profiles y su usuario (para obtener name)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      adopter_profiles (
        user_id,
        foto,
        users!adopter_profiles_user_id_fkey (
          id,
          name,
          email
        )
      ),
      pets (
        id,
        nombre,
        fotos
      )
    `)
    .in('pet_id', petIds);

  if (matchesError) {
    console.error('❌ Error al obtener matches:', matchesError.message);
    return res.status(500).json({ error: 'Error al obtener los matches' });
  }

  // Filtrar matches confirmados (interés mutuo)
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

  // Obtener matches del adoptante, con info del dueño (user y perfil)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      pets (
        id,
        nombre,
        descripcion,
        fotos,
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

  // Filtrar solo matches confirmados (interés mutuo)
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
