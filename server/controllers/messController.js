const supabaseAdmin = require('../services/supabaseAdmin')

exports.createMess = async (req, res) => {
  const { name, pin } = req.body;
  const userId = req.user.id;

  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

  const { data: newMess, error } = await supabaseAdmin
    .from('messes')
    .insert([{ name, pin }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .upsert({ 
      id: userId, 
      mess_id: newMess.id, 
      email: req.user.email,
      full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'User'
    });

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ mess: newMess });
}

exports.joinMess = async (req, res) => {
  const { name, pin } = req.body;
  const userId = req.user.id;

  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

  const { data: mess, error } = await supabaseAdmin
    .from('messes')
    .select('*')
    .eq('name', name)
    .eq('pin', pin)
    .single();

  if (error || !mess) return res.status(404).json({ error: 'Mess not found or incorrect PIN' });

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .upsert({ 
      id: userId, 
      mess_id: mess.id, 
      email: req.user.email,
      full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'User'
    });

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ mess });
}

exports.getMe = async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json({ profile: data || null });
};
