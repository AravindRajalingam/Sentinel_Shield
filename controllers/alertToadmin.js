require("dotenv").config();
const supabase = require("../config/supabaseClient");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

const sendAlerttoAdmin = async (req, res) => {
  const { reg_no, exit_time, latitude, longitude } = req.body;

  if (!reg_no || !latitude || !longitude) {
    return res
      .status(400)
      .json({ error: "reg_no, latitude, and longitude are required" });
  }

  try {
    const { data: studentData, error: studentError } = await supabase
      .from("student")
      .select("name")
      .eq("reg_no", reg_no)
      .single();

    if (studentError || !studentData) {
      console.error("Student fetch error:", studentError);
      return res.status(404).json({ error: "Student not found" });
    }

    const studentName = studentData.name;

    const message = await client.messages.create({
      body: `⚠️ ALERT: ${studentName} (${reg_no}) did NOT respond to exit verification.\nExit Time: ${exit_time}\nLocation: ${latitude}, ${longitude}`,
      from: twilioPhone,
      to: adminPhone,
    });

    console.log("Admin alert SMS sent:", message.sid);

    return res.status(200).json({
      success: true,
      message: "Admin alert SMS sent successfully",
      sid: message.sid,
    });
  } catch (err) {
    console.error("Twilio or Server Error:", err);
    return res.status(500).json({ error: "Failed to send alert SMS" });
  }
};

module.exports = { sendAlerttoAdmin };
