// src/controllers/pet.controller.js
const supabase = require('../config/supabaseClient');
const { sendSystemMessage } = require('./message.controller');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

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
    owner_id: userId,
    nombre,
    sexo,
    edad,
    talla,
    caracter,
    convive_con: conviveCon,
    vacunado,
    esterilizado,
    desparasitado,
    telefono_contacto: telefono,
    fotos,
    descripcion,
    status: 'disponible',
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
      nombre,
      sexo,
      edad,
      talla,
      caracter,
      convive_con: conviveCon,
      vacunado,
      esterilizado,
      desparasitado,
      telefono_contacto: telefono,
      fotos,
      descripcion,
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

exports.markAsAdopted = async (req, res) => {
  console.log('📦 markAsAdopted triggered');
  const petId = req.params.id;
  console.log('🐶 Pet ID:', petId);

  const { error } = await supabase
    .from('pets')
    .update({ status: 'adoptado' })
    .eq('id', petId);

  if (error) {
    console.error('❌ Error al actualizar status:', error.message);
    return res.status(500).json({ error: 'Error al actualizar estado.' });
  }

  const { data: petData, error: petError } = await supabase
    .from('pets')
    .select('nombre')
    .eq('id', petId)
    .single();

  if (petError || !petData) {
    console.error('❌ No se encontró la mascota');
    return res.status(404).json({ error: 'Mascota no encontrada.' });
  }

  console.log('✅ Mascota encontrada:', petData.nombre);

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('pet_id', petId)
    .eq('confirmed', true);

  if (matchError || !matches || matches.length === 0) {
    console.warn('⚠️ No hay matches confirmados para esta mascota.');
    return res.status(200).json({ message: 'Mascota marcada como adoptada' });
  }

  for (const match of matches) {
    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('match_id', match.id)
      .maybeSingle();

    if (convError) {
      console.error(`❌ Error buscando conversación para match ${match.id}:`, convError.message);
      continue;
    }

    if (conversationData) {
      console.log('💬 Enviando mensaje automático a conversación:', conversationData.id);
      await sendSystemMessage(conversationData.id, `${petData.nombre} ya fue adoptada 🐾`);
      console.log('✅ Mensaje automático enviado para match:', match.id);
    } else {
      console.warn('⚠️ No se encontró conversación para match:', match.id);
    }
  }

  res.status(200).json({ message: 'Mascota marcada como adoptada' });
};


exports.markAsAvailable = async (req, res) => {
  console.log('📦 markAsAvailable triggered');
  const petId = req.params.id;
  console.log('🐶 Pet ID:', petId);

  const { error } = await supabase
    .from('pets')
    .update({ status: 'disponible' })
    .eq('id', petId);

  if (error) {
    console.error('❌ Error al actualizar status:', error.message);
    return res.status(500).json({ error: 'Error al actualizar estado.' });
  }

  const { data: petData, error: petError } = await supabase
    .from('pets')
    .select('nombre')
    .eq('id', petId)
    .single();

  if (petError || !petData) {
    console.error('❌ No se encontró la mascota');
    return res.status(404).json({ error: 'Mascota no encontrada.' });
  }

  console.log('✅ Mascota encontrada:', petData.nombre);

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('pet_id', petId)
    .eq('confirmed', true);

  if (matchError || !matches || matches.length === 0) {
    console.warn('⚠️ No hay matches confirmados para esta mascota.');
    return res.status(200).json({ message: 'Mascota marcada como disponible' });
  }

  for (const match of matches) {
    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('match_id', match.id)
      .maybeSingle();

    if (convError) {
      console.error(`❌ Error buscando conversación para match ${match.id}:`, convError.message);
      continue;
    }

    if (conversationData) {
      console.log('💬 Enviando mensaje automático: sigue disponible a conversación:', conversationData.id);
      await sendSystemMessage(conversationData.id, `${petData.nombre} sigue disponible 🐶`);
      console.log('✅ Mensaje automático enviado para match:', match.id);
    } else {
      console.warn('⚠️ No se encontró conversación para match:', match.id);
    }
  }

  res.status(200).json({ message: 'Mascota marcada como disponible' });
};


exports.uploadPetPhoto = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  try {
    const supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const fileName = `pet-${uuidv4()}.jpg`;

    const { error: uploadError } = await supabaseService.storage
      .from('pet-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error al subir imagen:', uploadError.message);
      return res.status(500).json({ error: 'No se pudo subir la imagen' });
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/pet-photos/${fileName}`;
    res.status(200).json({ url: publicUrl });
  } catch (err) {
    console.error('❌ Error inesperado al subir imagen:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.deletePetPhoto = async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'No se proporcionó la URL de la imagen.' });
  }

  try {
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const filePath = imageUrl.split('/storage/v1/object/public/pet-photos/')[1];

    const { error } = await serviceClient.storage
      .from('pet-photos')
      .remove([filePath]);

    if (error) {
      console.error('❌ Error al eliminar imagen:', error.message);
      return res.status(500).json({ error: 'No se pudo eliminar la imagen' });
    }

    res.status(200).json({ message: 'Imagen eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error inesperado al eliminar imagen:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
