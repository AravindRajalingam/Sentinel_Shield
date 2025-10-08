// controllers/timingController.js
const supabase = require("../config/supabaseClient");

// GET /location/get-end-time/:dept_id
const getEndTime = async (req, res) => {
  const { dept_year_id } = req.params;

  if (!dept_year_id) return res.status(400).json({ error: "dept_id is required" });

  try {
      const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const todayDay = weekdays[new Date().getDay()]; 
      
      const { data: timing, error: timingError } = await supabase
      .from("timing")
      .select(`${todayDay}_end_time`)
      .eq("dept_year_id", dept_year_id)
      .single();

    if (timingError || !timing) {
      return res.status(404).json({ error: `Timing not found for ${todayDay}` });
    }

     const end_time_str = timing[`${todayDay}_end_time`]; // e.g., "18:38:00"
    if (!end_time_str) {
      return res.status(400).json({ error: `End time not set for ${todayDay}` });
    }

    const [endH, endM] = end_time_str.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    // Current time in minutes
    const now = new Date();
    const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const exitTime = now.toLocaleTimeString("en-GB", {hour12: false,timeZone: "Asia/Kolkata", // Chennai is in the same timezone
});
    const [h, m] = exitTime.split(":").map(Number);
    const currentMinutes = h * 60 + m;
    if(currentMinutes < endMinutes) {
       return res.json({ beforeEndTime: true }); 
    }
    return res.json({ beforeEndTime: false });
  } catch (err) {
    console.error("Error fetching end_time:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getEndTime };
