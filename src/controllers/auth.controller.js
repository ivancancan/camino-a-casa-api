const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Registro de usuario
exports.register = async (req, res) => {
  const { email, password, name } = req.body;
  console.log('📥 Datos recibidos en el registro:', req.body);

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(400).json({ error: 'El correo ya está registrado' });
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    return res.status(500).json({ error: fetchError.message });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, name }])
      .select();

    if (error) {
      console.error('❌ Error al insertar usuario:', error);
      return res.status(500).json({ error: error.message });
    }

    const newUser = data[0];

    // Buscar foto si tiene perfil de adoptante
    let foto = '';
    const { data: adopterProfile } = await supabase
      .from('adopter_profiles')
      .select('foto')
      .eq('user_id', newUser.id)
      .single();

    if (adopterProfile?.foto) {
      foto = adopterProfile.foto;
    }

    const userPayload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      roles: newUser.roles,
      role: null,
      foto,
    };

    const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario registrado',
      user: userPayload,
      token,
    });
  } catch (err) {
    console.error('❌ Error inesperado en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Inicio de sesión
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  let foto = '';
  let role = null;

  if (user.roles?.includes('adopter')) {
    role = 'adopter';
    const { data: adopterProfile } = await supabase
      .from('adopter_profiles')
      .select('foto')
      .eq('user_id', user.id)
      .single();

    if (adopterProfile?.foto) {
      foto = adopterProfile.foto;
    }
  } else if (user.roles?.includes('giver')) {
    role = 'giver';
  }

  const userPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    role,
    foto,
  };

  const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.status(200).json({
    message: 'Inicio de sesión exitoso',
    user: userPayload,
    token,
  });
};

// Actualización de roles
exports.updateRoles = async (req, res) => {
  const userId = req.params.id;
  const { roles } = req.body;

  const { data, error } = await supabase
    .from('users')
    .update({ roles })
    .eq('id', userId)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const updatedUser = data[0];

  let role = null;
  if (roles.includes('adopter')) {
    role = 'adopter';
  } else if (roles.includes('giver')) {
    role = 'giver';
  }

  res.status(200).json({
    message: 'Roles actualizados',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      roles: updatedUser.roles,
      role,
    },
  });
};

exports.deleteAccount = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // 🔥 Eliminar datos relacionados
    await supabase.from('adopter_profiles').delete().eq('user_id', userId);
    await supabase.from('giver_profiles').delete().eq('user_id', userId);
    await supabase.from('pets').delete().eq('user_id', userId);
    await supabase.from('swipes').delete().or(`adopter_id.eq.${userId},giver_id.eq.${userId}`);
    await supabase.from('matches').delete().or(`adopter_id.eq.${userId},giver_id.eq.${userId}`);
    await supabase.from('chats').delete().or(`adopter_id.eq.${userId},giver_id.eq.${userId}`);

    // 🧨 Eliminar usuario
    await supabase.from('users').delete().eq('id', userId);

    return res.status(200).json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar cuenta:', err);
    return res.status(500).json({ error: 'Error interno al eliminar cuenta' });
  }
};
