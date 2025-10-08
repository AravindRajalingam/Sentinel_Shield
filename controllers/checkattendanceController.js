const supabase = require("../config/supabaseClient");

const checkTodayEntry = async (req, res) => {
  const { reg_no } = req.params; 

  if (!reg_no)
    return res.status(400).json({ error: "Register number required" });
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    
    const { data, error } = await supabase
      .from("location_logs")
      .select("id") 
      .eq("reg_no", reg_no)
      .eq("date", today) 
      .limit(1); 
    
    const {insideData,insideError}=await supabase
    .from("location_logs")
    .update({inside:true})
    .eq("reg_no",reg_no)
    .eq("date",today)
    
    if(insideError){
      console.error("Database Query Error:", error);
      return { success: false, message: "Error Updating inside flag", error };
    }
    if (error) {
      console.error("Database Query Error:", error);
      return { success: false, message: "Error checking today's entry", error };
    }

    // Return true if an entry exists, otherwise false
    return res.status(200).json({
      success: true,
      hasEntry: data.length > 0,
      message:
        data.length > 0 ? "Entry exists for today" : "No entry found for today",
    });
  } catch (err) {
    console.error("Unexpected Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

module.exports = { checkTodayEntry };
