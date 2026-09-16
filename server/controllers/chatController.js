const supabaseAdmin = require('../services/supabaseAdmin');
exports.addMessage = async (req, res) => {
  const payload = req.body.payload || req.body;
  if (!payload || payload.mess_id !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });
  const { data, error } = await supabaseAdmin.from('messages').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
};

