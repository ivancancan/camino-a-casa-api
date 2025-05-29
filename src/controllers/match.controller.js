// src/controllers/match.controller.js

const supabase = require('../config/supabaseClient');

exports.getConfirmedMatchesForGiver = async (req, res) => {
  const userId = req.user.id;

  // 1. Obtener mascotas del giver
  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id, nombre, fotos')
    .eq('owner_id', userId);

  if (petsError || !pets) {
    console.error('❌ Error al obtener mascotas:', petsError?.message);
    return res.status(500).json({ error: 'No se pudieron obtener las mascotas del giver' });
  }

  const petIds = pets.map(p => p.id);

  if (petIds.length === 0) {
    return res.status(200).json({ matches: [] });
  }

  // 2. Obtener matches asociados a esas mascotas
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*, adopter_profiles(*), pets(nombre, fotos)')
    .in('pet_id', petIds);

  if (matchesError) {
    console.error('❌ Error al obtener matches:', matchesError.message);
    return res.status(500).json({ error: 'Error al obtener los matches' });
  }

  // 3. Filtrar solo los matches confirmados
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
        .select('interested')
        .eq('giver_id', userId)
        .eq('adopter_id', adopter_id)
        .eq('pet_id', pet_id)
        .maybeSingle();

      if (adopterSwipe?.interested && giverSwipe?.interested) {
        confirmedMatches.push(match);
      }
    } catch (err) {
      console.error('❌ Error al verificar swipes para match:', err.message);
    }
  }

  return res.status(200).json({ matches: confirmedMatches });
};
