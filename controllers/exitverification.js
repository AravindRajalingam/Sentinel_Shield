require("dotenv").config();
const supabase = require("../config/supabaseClient");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

// ------------------- TwiML generator -------------------
const generateTwiml = () => `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="15" finishOnKey="#">
    <Say voice="alice" language="en-US">
      Hello! Please press any key to verify your exit and ensure your safety.
    </Say>
  </Gather>
  <Say voice="alice" language="en-US">
    Thank you! Your exit has been verified successfully.
  </Say>
  <Say voice="alice" language="en-US">
    We did not receive any input. Your exit will be logged but an alert will be sent to admin.
  </Say>
  <Hangup/>
</Response>
`;

// ---------------- Helper function to initiate call ----------------
const initiateVerificationCall = async (student, reg_no, exitTime, latitude, longitude, today) => {
  try {
    const call = await client.calls.create({
      twiml: generateTwiml(),
      to: student.mobile_number,
      from: twilioPhone,
    });

    console.log("Verification call initiated:", call.sid);

    setTimeout(async () => {
      const callDetails = await client.calls(call.sid).fetch();

      await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);

      if (callDetails.status === "completed" || callDetails.status === "in-progress") {
        console.log(`✅ Exit time updated for ${reg_no} (answered call)`);
      } else {
        await client.messages.create({
          body: `⚠️ ALERT: ${student.name} (${reg_no}) did NOT respond to exit verification.
Exit time: ${exitTime}
Location: ${latitude},${longitude}`,
          from: twilioPhone,
          to: adminPhone,
        });
        console.log("Admin alert SMS sent");
      }
    }, 25000);

    return true;
  } catch (err) {
    console.error("❌ Error initiating call:", err.message);
    return false;
  }
};

// ------------------- Exit verification API -------------------
const Exitverification = async (req, res) => {
  const { reg_no, latitude, longitude } = req.body;

  try {
    // 1. Get student details with dept_year_id
    const { data: student, error: studentError } = await supabase
      .from("student")
      .select("mobile_number, name, dept_year_id")
      .eq("reg_no", reg_no)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 2. Get today's day and corresponding end_time column
    const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const todayDay = weekdays[new Date().getDay()]; 

    const { data: timing, error: timingError } = await supabase
      .from("timing")
      .select(`${todayDay}_end_time`)
      .eq("dept_year_id", student.dept_year_id)
      .single();

    if (timingError || !timing) {
      return res.status(404).json({ error: `Timing not found for ${todayDay}` });
    }

    const end_time_str = timing[`${todayDay}_end_time`]; // e.g., "18:38:00"
    if (!end_time_str) {
      return res.status(400).json({ error: `End time not set for ${todayDay}` });
    }

    // 3. Parse end_time (HH:MM:SS)
    const [endH, endM] = end_time_str.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    // Current time in minutes
    const now = new Date();
    const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const exitTime = now.toLocaleTimeString("en-GB", {hour12: false,timeZone: "Asia/Kolkata", // Chennai is in the same timezone
});
    const [h, m] = exitTime.split(":").map(Number);
    const currentMinutes = h * 60 + m;
    // Define the restricted range (12:50 to 14:00)
    const skipStartMinutes = 12 * 60 + 50; // 12:50 → 770
    const skipEndMinutes = 14 * 60 + 0;    // 14:00 → 840

   if (currentMinutes >= skipStartMinutes && currentMinutes <= skipEndMinutes) {
     await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);
      console.log("Current time within 12:50–14:00 → skipping any action");
      return res.json({ success: true, message: "No action performed and exit time updated during break time" });
    }

    console.log(`End time for dept: ${end_time_str} (${endMinutes} min)`);
    console.log(`Current time: ${exitTime} (${currentMinutes} min)`);

    // 4. Determine action
    if (currentMinutes < endMinutes) {
      // Before end_time → verification call
      await initiateVerificationCall(student, reg_no, exitTime, latitude, longitude, today);
      return res.json({ success: true, message: "Verification call in progress (before end_time)" });
    } else {
      // Between end_time and +30 min → log exit directly
      await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);

      console.log(`Exit directly updated for ${reg_no} (within end_time + 30min)`);
      return res.json({ success: true, message: "Exit time updated (within end_time + 30 min)" });
    }
  } catch (err) {
    console.error("❌ Error in exit-verification:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const CheckAfterEndGrace = async (req, res) => {
  const { reg_no, latitude, longitude } = req.body;

  try {
    // 1. Get student details
    const { data: student, error: studentError } = await supabase
      .from("student")
      .select("mobile_number, name")
      .eq("reg_no", reg_no)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const now = new Date();
    const today = now.toLocaleDateString("en-CA");
   const exitTime = now.toLocaleTimeString("en-GB", {hour12: false,timeZone: "Asia/Kolkata", // Chennai is in the same timezone
});

    // 2. Check if student still exists in location without exit_time
    const { data: locationData, error: locError } = await supabase
      .from("location_logs")
      .select("reg_no")
      .eq("reg_no", reg_no)
      .eq("date", today)
      .eq("exit_time", null)
      .single();

    if (locError && locError.code !== "PGRST116") {
      console.error("Error checking location:", locError.message);
      return res.status(500).json({ error: locError.message });
    }

    if (locationData) {
      // Still in location → initiate verification call
      await initiateVerificationCall(student, reg_no, exitTime, latitude, longitude, today);
      return res.json({
        success: true,
        message: "Verification call initiated (student still in location after end+30 min)",
      });
    } else {
      // Already left → log exit
      await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);

      console.log(`Exit updated for ${reg_no} (already left location)`);
      return res.json({ success: true, message: "Exit updated (already left location)" });
    }
  } catch (err) {
    console.error("❌ Error in CheckAfterEndGrace:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { Exitverification,CheckAfterEndGrace };
