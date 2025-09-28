// controllers/timingController.js
const supabase = require("../config/supabaseClient");

// GET /location/get-end-time/:dept_id
const getEndTime = async (req, res) => {
  const { dept_year_id } = req.params;

  if (!dept_year_id) return res.status(400).json({ error: "dept_id is required" });

  try {
    const { data, error } = await supabase
      .from("timing")
      .select(`
        sunday_end_time,
        monday_end_time,
        tuesday_end_time,
        wednesday_end_time,
        thursday_end_time,
        friday_end_time,
        saturday_end_time
      `)
      .eq("dept_year_id", dept_year_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Timing not found for this dept_id" });
    }

    return res.json(data); // returns all weekdays' end_time
  } catch (err) {
    console.error("Error fetching end_time:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getEndTime };
