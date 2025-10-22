require("dotenv").config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;
const twilio = require("twilio");
const client = twilio(accountSid, authToken);

// ✅ Initialize Supabase client
const supabase = require("../config/supabaseClient");


const ReplyforAlert= async (req, res) => {

    try {
        const { reg_no, timestamp, reply, name } = req.body;

        console.log("Incoming values:", { reg_no, timestamp, reply, name });

        if (!reg_no || !timestamp) return

        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("reg_no", reg_no)
            .eq("sent_at", Number(timestamp))
            .single();

        if (error) throw error;

        const { data: student, error: studentError } = await supabase
            .from("student")
            .select("mobile_number, name, dept_year_id")
            .eq("reg_no", reg_no)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ error: "Student not found" });
        }

        if (data && data.status === "pending") {
            // User replied within 1 min
            console.log("✅ User replied within 1 min");

            if (name === "latestay") {
                await client.messages.create({
                    body: `⚠️ ALERT: ${student.name} (${reg_no}) inside campus after regular end time  (mobile number = ${student.mobile_number}) 
                    and their reply :  ${reply}`,
                    from: twilioPhone,
                    to: adminPhone,
                });
                console.log("🚨 Student reply sent to Admin");
            }
            if (name === "afternoon") {
                await client.messages.create({
                    body: `⚠️ ALERT: ${student.name} (${reg_no}) outside campus after lunch time end (mobile number = ${student.mobile_number}) 
                    and their reply : ${reply}`,
                    from: twilioPhone,
                    to: adminPhone,
                });
                console.log("🚨 Student reply sent to Admin");
            }

            // Update status and opened_at
            await supabase
                .from("alerts")
                .update({ status: "opened", opened_at: Date.now() })
                .eq("id", data.id);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error marking opened:", err);
        res.status(500).json({ error: "Failed to mark opened" });
    }
};

// 🔹 3. Endpoint to mark as opened
const DeviceResponse= async (req, res) => {
  try {
    const { reg_no, gps_status, internet_status, battery_percentage, timestamp } = req.body;

    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("reg_no", reg_no)
      .eq("sent_at", timestamp)
      .single();

    if (error) throw error;

    if (data && data.status === "pending") {
      await supabase
        .from("alerts")
        .update({ status: "opened", opened_at: Date.now() })
        .eq("id", data.id);

      console.log(`✅ Response from device ${reg_no}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking opened:", err);
    res.status(500).json({ error: "Failed to mark opened" });
  }
};

const ExitOffline= async (req, res) => {
    try {
        const { reg_no, date, time, latitude, longitude } = req.body;

        if (!reg_no || !date || !time) {
            return res.status(400).json({ error: "reg_no, date, exit_time required" });
        }

        // Update latest log for this reg_no on this date
        const { data, error } = await supabase
            .from("location_logs")
            .update({exit_time: time})
            .eq("reg_no", reg_no)
            .eq("date", date)

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "No log found to update" });
        }

        res.status(200).json({ message: "Exit time updated successfully", updatedLog: data[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

module.exports= { ReplyforAlert, DeviceResponse,ExitOffline };