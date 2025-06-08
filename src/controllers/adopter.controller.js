const { v4: uuidv4 } = require('uuid');
const baseClient = require('../config/supabaseClient');
const { createClient } = require('@supabase/supabase-js');

// Guardar o actualizar todo el perfil del adoptante
exports.saveAdopterProfile = async (req, res) => {
  const userId = req.user.id;
  const profile = req.body;

  const normalizedProfile = {
    tienemascotas: profile.tieneMascotas,
    experiencia: profile.experiencia,
    hayninos: profile.hayNinos,
    vivienda: profile.vivienda,
    espacioexterior: profile.espacioExterior,
    ritmo: profile.ritmo,
    cubregastos: profile.cubreGastos,
    tallapreferida: profile.tallaPreferida,
    caracterpreferido: profile.caracterPreferido,
    aceptaseguimiento: profile.aceptaSeguimiento,
    foto: profile.foto || '',
    motivacion: profile.motivacion || '',
  };

  console.log('📥 Perfil recibido normalizado:', normalizedProfile);

  const { data, error } = await baseClient
    .from('adopter_profiles')
    .upsert([{ user_id: userId, ...normalizedProfile }], { onConflict: ['user_id'] });

  if (error) {
    console.error('❌ Error al guardar perfil adoptante:', error.message);
    return res.status(500).json({ error: 'No se pudo guardar el perfil' });
  }

  res.status(200).json({ message: 'Perfil guardado', data });
};

// Verificar si existe perfil del adoptante
exports.hasAdopterProfile = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await baseClient
    .from('adopter_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error verificando perfil adoptante:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const exists = !!data;
  res.status(200).json({ exists });
};

// Obtener perfil del adoptante
exports.getAdopterProfile = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await baseClient
    .from('adopter_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error al obtener perfil adoptante:', error.message);
    return res.status(500).json({ error: 'No se pudo obtener el perfil' });
  }

  res.status(200).json({ profile: data });
};

// Actualizar solo la motivación del adoptante
exports.updateAdopterDescription = async (req, res) => {
  const userId = req.user.id;
  const { motivacion } = req.body;

  if (!motivacion) {
    return res.status(400).json({ error: 'No se proporcionó la descripción' });
  }

  const { data, error } = await baseClient
    .from('adopter_profiles')
    .update({ motivacion })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Error al actualizar descripción:', error.message);
    return res.status(500).json({ error: 'No se pudo actualizar la descripción' });
  }

  res.status(200).json({ message: 'Descripción actualizada', data });
};

// POST /api/adopter/upload-photo (✅ migrado a multer)
exports.uploadAdopterPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      console.warn('⚠️ No se envió ningún archivo');
      return res.status(400).json({ error: 'No se envió ninguna imagen.' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'El archivo no es una imagen válida.' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const fileName = `adopter-photos/adopter-${userId}-${uuidv4()}.jpg`;

    const result = await serviceClient.storage
      .from('adopter-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (result.error) {
      console.error('❌ Error subiendo imagen completo:', result.error);
      return res.status(500).json({ error: 'No se pudo subir la imagen', details: result.error });
    }

    const { data: publicData } = serviceClient.storage
      .from('adopter-photos')
      .getPublicUrl(fileName);

    const publicUrl = publicData.publicUrl;

    const { data: updatedProfile, error: updateError } = await baseClient
      .from('adopter_profiles')
      .update({ foto: publicUrl })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error al guardar URL en perfil:', updateError.message);
      return res.status(500).json({ error: 'No se pudo guardar la imagen en el perfil' });
    }

    res.status(200).json({ message: 'Imagen subida y guardada', url: publicUrl });
  } catch (error) {
    console.error('❌ Error inesperado al subir imagen:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
