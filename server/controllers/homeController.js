const supabaseAdmin = require('../services/supabaseAdmin');
exports.getDashboardData = async (req, res) => {
  const { messId } = req.params;
  if (!messId) return res.status(400).json({ error: 'messId required' });
  if (messId !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const [resM, resE, resMl, resMsg, resLogs] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('mess_id', messId),
      supabaseAdmin.from('expenses').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
      supabaseAdmin.from('meals').select('*').eq('mess_id', messId).order('date', { ascending: false }),
      supabaseAdmin.from('messages').select('*').eq('mess_id', messId).order('created_at', { ascending: true }),
      supabaseAdmin.from('activity_logs').select('*').eq('mess_id', messId).order('created_at', { ascending: false }).limit(1000)
    ]);
    res.json({ members: resM.data || [], expenses: resE.data || [], meals: resMl.data || [], messages: resMsg.data || [], logs: resLogs.data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
