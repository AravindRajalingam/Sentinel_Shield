require("dotenv").config();
const supabase = require("../config/supabaseClient");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

// ------------------- TwiML generator -------------------
const generateTwiml = () => {
  return `
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
};

// ------------------- Exit verification API -------------------
const Exitverification = async (req, res) => {
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

    // 2. Get today's date and current time
    const now = new Date();
    const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const exitTime = now.toLocaleTimeString("en-GB", { hour12: false });

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const startWindow = 16 * 60 + 30; // 16:30
    const endWindow = 17 * 60 + 30;   // 17:30

    // 3. Between 4:30-5:30 PM → skip call, directly log exit
    if (currentTime >= startWindow && currentTime <= endWindow) {
      await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);

      console.log(`⏰ Exit directly updated for ${reg_no} (${exitTime})`);
      return res.json({
        success: true,
        message: "Exit time updated without verification (4:30-5:30 PM)",
      });
    }

    // 4. Initiate verification call with TwiML Bin or inline TwiML
    const call = await client.calls.create({
      twiml: generateTwiml(),
      to: student.mobile_number,
      from: twilioPhone,
    });

    console.log("Verification call initiated:", call.sid);

    // 5. Wait 15s and then log exit & alert admin if no response
    setTimeout(async () => {
      const callDetails = await client.calls(call.sid).fetch();

      await supabase
        .from("location_logs")
        .update({ exit_time: exitTime })
        .eq("reg_no", reg_no)
        .eq("date", today);

      console.log("Call status:", callDetails.status);

      if (callDetails.status === "completed" || callDetails.status === "in-progress") {
        console.log(`✅ Exit time updated for ${reg_no} (answered call)`);
        res.json({ success: true, message: "Exit time updated (call answered)" });
      } else {
        await client.messages.create({
          body: `⚠️ ALERT: ${student.name} (${reg_no}) did NOT respond to exit verification.
Exit time: ${exitTime}
Location: ${latitude},${longitude}`,
          from: twilioPhone,
          to: adminPhone,
        });
        console.log("🚨 Exit updated + Admin alert SMS sent (no response)");
      }
    }, 15000);

    res.json({ success: true, message: "Verification call in progress" });
  } catch (err) {
    console.error("❌ Error in exit-verification:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { Exitverification };
