require("dotenv").config();
const supabase = require("../config/supabaseClient");

const registerToken = async (req, res) => {
  const { regNo, fcmToken } = req.body;

  if (!regNo || !fcmToken) {
    return res.status(400).json({ error: "regNo and fcmToken required" });
  }
  try {
    const { data, error } = await supabase
      .from("fcm_tokens")
      .upsert({ reg_no: regNo, fcm_token: fcmToken }, { onConflict: "reg_no" });

    if (error) throw error;

    res.status(200).json({ message: "Token registered successfully", data });
  } catch (err) {
    console.error("Error registering token:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { registerToken };