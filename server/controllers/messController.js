const supabaseAdmin = require('../services/supabaseAdmin')
const Joi = require('joi')

const updatePinSchema = Joi.object({
  messId: Joi.string().required(),
  newPin: Joi.string().min(4).required()
})

exports.updatePin = async (req, res) => {
  const { error, value } = updatePinSchema.validate(req.body)
  if (error) return res.status(400).json({ error: error.details[0].message })

  const { messId, newPin } = value
  const { data, error: dbError } = await supabaseAdmin
    .from('messes')
    .update({ pin: newPin })
    .eq('id', messId)
    .select()
    .single()

  if (dbError) return res.status(500).json({ error: dbError.message })
  res.json({ mess: data })
}

exports.kickMember = async (req, res) => {
  const { memberId } = req.params
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ mess_id: null })
    .eq('id', memberId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

exports.resetMonthlyChart = async (req, res) => {
  const { messId, yearMonth } = req.body
  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-31`
  const { error } = await supabaseAdmin
    .from('meals')
    .delete()
    .eq('mess_id', messId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

exports.createMess = async (req, res) => {
  console.log("createMess called with body:", req.body);
  const { name, pin } = req.body;
  const userId = req.user.id;

  if (!name || !pin) {
    console.log("Missing name or pin");
    return res.status(400).json({ error: 'Name and PIN required' });
  }

  console.log("Inserting into supabase messes table...");
  const { data: newMess, error } = await supabaseAdmin
    .from('messes')
    .insert([{ name, pin }])
    .select()
    .single();

  console.log("Supabase insert result:", { newMess, error });

  if (error) {
    console.log("Error inserting mess:", error.message);
    return res.status(500).json({ error: error.message });
  }

  console.log("Upserting profile with new mess_id:", newMess.id);
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .upsert({ 
      id: userId, 
      mess_id: newMess.id, 
      email: req.user.email,
      full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'User'
    });

  console.log("Profile update result:", updateError);

  if (updateError) {
    console.log("Error updating profile:", updateError.message);
    return res.status(500).json({ error: updateError.message });
  }

  console.log("Sending success response!");
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