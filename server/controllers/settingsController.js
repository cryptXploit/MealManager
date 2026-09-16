const supabaseAdmin = require('../services/supabaseAdmin');
const Joi = require('joi');

const updatePinSchema = Joi.object({
  messId: Joi.string().required(),
  newPin: Joi.string().min(4).required()
});

exports.updatePin = async (req, res) => {
  const { error, value } = updatePinSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { messId, newPin } = value;
  if (messId !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });
  const { data, error: dbError } = await supabaseAdmin
    .from('messes').update({ pin: newPin }).eq('id', messId).select().single();
  if (dbError) return res.status(500).json({ error: dbError.message });
  res.json({ mess: data });
};

exports.kickMember = async (req, res) => {
  const { memberId } = req.params;
  const { data: targetProfile } = await supabaseAdmin.from('profiles').select('mess_id').eq('id', memberId).single();
  if (targetProfile?.mess_id !== req.user.mess_id) {
    return res.status(403).json({ error: 'Unauthorized to kick this member' });
  }
  const { error } = await supabaseAdmin.from('profiles').update({ mess_id: null }).eq('id', memberId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

exports.resetMonthlyChart = async (req, res) => {
  const { messId, yearMonth } = req.body;
  if (!messId || !yearMonth) return res.status(400).json({ error: 'messId and yearMonth required' });
  if (messId !== req.user.mess_id) return res.status(403).json({ error: 'Unauthorized' });

  const { error } = await supabaseAdmin
    .from('meals').delete().eq('mess_id', messId).like('date', `${yearMonth}-%`);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
