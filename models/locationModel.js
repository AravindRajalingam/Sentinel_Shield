const supabase = require("../config/supabaseClient");

const saveLocation = async (
  reg_no,
  latitude,
  longitude,
  entry_time,
  is_present
) => {
  try {
    const formattedTime = entry_time.padStart(8, "0"); // Ensure proper format

    const { data, error } = await supabase
      .from("location_logs")
      .insert([
        {
          reg_no,
          latitude,
          longitude,
          entry_time: formattedTime,
          is_present,
          date: new Date(),
          inside:true
        },
      ]);

    if (error) {
      console.error("Database Insert Error:", error);
      return { success: false, message: "Error saving location data", error };
    }

    return { success: true, message: "Location saved successfully", data };
  } catch (err) {
    console.error("Unexpected Error:", err);
    return {
      success: false,
      message: "Internal Server Error",
      error: err.message,
    };
  }
};

const updateExitTime = async (reg_no, exit_time) => {
  try {
    const formattedExitTime = exit_time.padStart(8, "0"); // Ensure proper format

    const { data, error } = await supabase
      .from("location_logs")
      .update({ exit_time: formattedExitTime })
      .eq("reg_no", reg_no)
      .is("exit_time", null); // Update only if exit_time is NULL

    if (error) {
      console.error("Database Update Error:", error);
      return { success: false, message: "Error updating exit time", error };
    }

    if (data.length === 0) {
      return { success: false, message: "No matching record found" };
    }

    return { success: true, message: "Exit time updated successfully", data };
  } catch (err) {
    console.error("Unexpected Error:", err);
    return {
      success: false,
      message: "Internal Server Error",
      error: err.message,
    };
  }
};

module.exports = { saveLocation, updateExitTime };
