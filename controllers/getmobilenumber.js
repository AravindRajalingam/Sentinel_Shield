
const supabase = require("../config/supabaseClient");

// ✅ API: Get Mobile Number by Register Number
const getMobileNumberByRegister= async (req, res) => {
  const { registerNumber } = req.params;

  try {
    const { data, error } = await supabase
      .from("student")
      .select("mobile_number")
      .eq("reg_no", registerNumber)
      .single();

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ success: true, mobile_number: data.mobile_number });
  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getMobileNumberByRegister };
