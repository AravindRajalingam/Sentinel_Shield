const supabase = require("../config/supabaseClient");


const Face_Signin = async (req, res) => {
 try {
    const { reg_no } = req.query;
    if (!reg_no) {
      return res.status(400).json({ success: false, error: "reg_no is required" });
    }

    const { data, error } = await supabase
      .from("student")
      .select("reg_no, name, face_url, mobile_number, gender, hosteller,dept_year_id")
      .eq("reg_no", reg_no)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    return res.json({ success: true, student: data });
  } catch (err) {
    console.error("Error fetching student face:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

module.exports = { Face_Signin };
