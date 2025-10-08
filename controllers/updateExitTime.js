require("dotenv").config();
const supabase = require("../config/supabaseClient");

const update_Exit_Time = async (req, res) => {
  const { reg_no } = req.body;

  if (!reg_no) {
    return res.status(400).json({ error: "reg_no is required" });
  }

  const now = new Date();
  const exit_time = now.toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  const today = now.toLocaleDateString("en-CA"); 

  try {
    const { data, error } = await supabase
      .from("location_logs")
      .update({
        exit_time: exit_time,
        inside: false,
      })
      .eq("reg_no", reg_no)
      .eq("date", today)
      .select();

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ error: "Error updating exit time" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No matching record found for today" });
    }

    return res.status(200).json({
      success: true,
      message: "Exit time updated successfully",
      data,
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Server error updating exit time" });
  }
};

module.exports = { update_Exit_Time };
