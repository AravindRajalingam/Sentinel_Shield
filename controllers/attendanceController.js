const supabase = require("../config/supabaseClient");

const getAttendance = async (req, res) => {
  const { reg_no } = req.params; // Get reg_no from request parameters

  if (!reg_no)
    return res.status(400).json({ error: "Register number required" });

  try {
    // Fetch attendance records where reg_no matches
    const { data, error } = await supabase
      .from("location_logs")
      .select("entry_time, exit_time, date, is_present")
      .eq("reg_no", reg_no);

    if (error) throw error;

    // Format response to match sampleAttendance structure
    const formattedData = data.map((log) => ({
      date: log.date,
      entry: log.is_present ? log.entry_time : "—",
      exit: log.is_present ? log.exit_time : "—",
      present: log.is_present,
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAttendance };
