// controllers/giver.controller.js
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
