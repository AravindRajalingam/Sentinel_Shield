
require("dotenv").config();
const twilio = require("twilio");
const supabase = require("../config/supabaseClient");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

const EmergencyAlert= async (req, res) => {
    const { reg_no, timestamp } = req.body;

    if (!reg_no) {
        return res.status(400).json({ success: false, message: "reg_no is required" });
    }

    // 1. Get student details with dept_year_id
    const { data: student, error: studentError } = await supabase
        .from("student")
        .select("mobile_number, name, dept_year_id")
        .eq("reg_no", reg_no)
        .single();

    if (studentError || !student) {
        return res.status(404).json({ success: false, error: "Student not found" });
    }

    try {
        await client.messages.create({
            body: `🚨 EMERGENCY ALERT: ${student.name} (${reg_no}) faced an emergency incident (mobile number = ${student.mobile_number})`,
            from: twilioPhone,
            to: adminPhone,
        });
        
        return res.json({ success: true, message: "Alert received successfully" });

    } catch (err) {
        console.error("Error Sending Emergency Alert:", err);
        res.status(500).json({ error: "Error Sending Emergency Alert" });
    }

};

module.exports = { EmergencyAlert };