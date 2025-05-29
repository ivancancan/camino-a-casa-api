const supabase = require('../config/supabaseClient');

exports.createPet = async (req, res) => {
  const userId = req.user.id;
  const {
    nombre, sexo, edad, talla, caracter = [], conviveCon = [],
    vacunado = false, esterilizado = false, desparasitado = false,
    telefono, fotos = [], descripcion = '',
  } = req.body;

  if (!nombre || !sexo || !edad || !talla || !telefono || fotos.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const { data, error } = await supabase.from('pets').insert([{
    owner_id: userId, nombre, sexo, edad, talla, caracter,
    convive_con: conviveCon, vacunado, esterilizado, desparasitado,
    telefono_contacto: telefono, fotos, descripcion,
  }]);

  if (error) {
    console.error('Error al insertar mascota:', error.message);
    return res.status(500).json({ error: 'Error al guardar la mascota.' });
  }

  res.status(201).json({ message: 'Mascota publicada con éxito', data });
};

exports.getMyPets = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al obtener mascotas del usuario:', error.message);
    return res.status(500).json({ error: 'No se pudieron obtener las mascotas' });
  }

  res.status(200).json({ pets: data });
};

exports.getMyPetsWithInterest = async (req, res) => {
  const userId = req.user.id;

  const { data: pets, error } = await supabase
    .from('pets')
    .select('*, swipes:swipes(count)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al obtener mascotas con interés:', error.message);
    return res.status(500).json({ error: 'No se pudieron obtener las mascotas' });
  }

  // Obtener swipes pendientes (interesado = true y giver_response = null)
  const petIds = pets.map(p => p.id);

  const { data: swipesData, error: swipesError } = await supabase
    .from('swipes')
    .select('pet_id, count:giver_response')
    .eq('interested', true)
    .is('giver_response', null)
    .in('pet_id', petIds);

  if (swipesError) {
    console.error('❌ Error al contar swipes pendientes:', swipesError.message);
    return res.status(500).json({ error: 'No se pudieron contar interesados.' });
  }

  // Contar interesados por pet_id
  const countByPet = {};
  for (const swipe of swipesData) {
    countByPet[swipe.pet_id] = (countByPet[swipe.pet_id] || 0) + 1;
  }

  const enriched = pets.map(pet => ({
    ...pet,
    interesados: countByPet[pet.id] || 0,
  }));

  res.status(200).json({ pets: enriched });
};

exports.updatePet = async (req, res) => {
  const userId = req.user.id;
  const petId = req.params.id;
  const {
    nombre, sexo, edad, talla, caracter = [], conviveCon = [],
    vacunado = false, esterilizado = false, desparasitado = false,
    telefono, fotos = [], descripcion = '',
  } = req.body;

  const { data: existingPet, error: fetchError } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', petId)
    .single();

  if (fetchError || !existingPet || existingPet.owner_id !== userId) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta mascota.' });
  }

  const { error: updateError } = await supabase
    .from('pets')
    .update({
      nombre, sexo, edad, talla, caracter,
      convive_con: conviveCon, vacunado, esterilizado,
      desparasitado, telefono_contacto: telefono, fotos, descripcion,
    })
    .eq('id', petId);

  if (updateError) {
    console.error('❌ Error al actualizar mascota:', updateError.message);
    return res.status(500).json({ error: 'No se pudo actualizar la mascota.' });
  }

  res.status(200).json({ message: 'Mascota actualizada con éxito.' });
};

exports.deletePet = async (req, res) => {
  const userId = req.user.id;
  const petId = req.params.id;

  const { data: existingPet, error: fetchError } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', petId)
    .single();

  if (fetchError || !existingPet) {
    return res.status(404).json({ error: 'Mascota no encontrada' });
  }

  if (existingPet.owner_id !== userId) {
    return res.status(403).json({ error: 'No tienes permiso para borrar esta mascota.' });
  }

  const { error: deleteError } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId);

  if (deleteError) {
    return res.status(500).json({ error: 'Error al borrar la mascota' });
  }

  res.status(200).json({ message: 'Mascota borrada correctamente' });
};
