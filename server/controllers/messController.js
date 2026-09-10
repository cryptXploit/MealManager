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
  const { messId, yearMonth } = req.body;
  if (!messId || !yearMonth) return res.status(400).json({ error: 'messId and yearMonth required' });

  const { error } = await supabaseAdmin
    .from('meals')
    .delete()
    .eq('mess_id', messId)
    .like('date', `${yearMonth}-%`);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

exports.dbInsert = async (req, res) => {
  const { table, payload } = req.body;
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
};

exports.dbDelete = async (req, res) => {
  const { table, id } = req.body;
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

exports.getDashboardData = async (req, res) => {
  const { messId } = req.params;
  if (!messId) return res.status(400).json({ error: 'messId required' });

  try {
    const [resM, resE, resMl, resMsg, resLogs] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('mess_id', messId),
      supabaseAdmin.from('expenses').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
      supabaseAdmin.from('meals').select('*').eq('mess_id', messId).order('date', { ascending: false }),
      supabaseAdmin.from('messages').select('*').eq('mess_id', messId).order('created_at', { ascending: true }),
      supabaseAdmin.from('activity_logs').select('*').eq('mess_id', messId).order('created_at', { ascending: false }).limit(1000)
    ]);

    res.json({
      members: resM.data || [],
      expenses: resE.data || [],
      meals: resMl.data || [],
      messages: resMsg.data || [],
      logs: resLogs.data || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
exports.getMe = async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json({ profile: data || null });
};

exports.getMe = async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json({ profile: data || null });
};
