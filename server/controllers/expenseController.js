const supabaseAdmin = require('../services/supabaseAdmin');
exports.addExpense = async (req, res) => {
  const payload = req.body.payload || req.body;
  if (!payload || payload.mess_id !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });
  const { data, error } = await supabaseAdmin.from('expenses').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
};
exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  const { data: item } = await supabaseAdmin.from('expenses').select('mess_id').eq('id', id).single();
  if (!item || item.mess_id !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });
  const { error } = await supabaseAdmin.from('expenses').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

