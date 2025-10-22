require("dotenv").config();
const supabase = require("../config/supabaseClient");
const twilio = require("twilio");
const admin = require("firebase-admin");


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const adminPhone = process.env.ADMIN_PHONE;

const client = twilio(accountSid, authToken);

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// ------------------- Exit verification API -------------------
const Exitverification = async (req, res) => {
    const { reg_no } = req.body;

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
        const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
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
        const exitTime = now.toLocaleTimeString("en-GB", { hour12: false });
        const [h, m] = exitTime.split(":").map(Number);
        const currentMinutes = h * 60 + m;
        // Define the restricted range (12:50 to 14:00)
        const skipStartMinutes = 12 * 60 + 50; // 12:50 → 770
        const skipEndMinutes = 14 * 60 + 0;    // 14:00 → 840

        console.log(`End time for dept: ${end_time_str} (${endMinutes} min)`);
        console.log(`Current time: ${exitTime} (${currentMinutes} min)`);

        if (currentMinutes >= skipStartMinutes && currentMinutes <= skipEndMinutes) {
            await supabase
                .from("location_logs")
                .update({ exit_time: exitTime,inside:false })
                .eq("reg_no", reg_no)
                .eq("date", today);
            console.log("Current time within 12:50–14:00 → skipping any action");
            return res.json({ success: true, message: "No action performed and exit time updated during break time" });
        }

        // 4. Determine action
        if (currentMinutes < endMinutes) {
            // Before end_time → verification call
            await sendCall(student, reg_no, exitTime, today);
            return res.json({ success: true, message: "Verification call in progress (before end_time)" });
        } else {
            // Between end_time and +30 min → log exit directly
            await supabase
                .from("location_logs")
                .update({ exit_time: exitTime,inside:false })
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



async function sendCall(student, reg_no, exitTime, today) {
    try {
        // Get the user's FCM token from DB
        const { data: tokenData, error: tokenError } = await supabase
            .from("fcm_tokens")
            .select("fcm_token")
            .eq("reg_no", reg_no)
            .single(); // assume one token per user

        if (tokenError) {
            throw tokenError; // handle error
        }

        const fcm_token = tokenData?.fcm_token;
        if (!fcm_token) {
            throw new Error(`No FCM token found for reg_no: ${reg_no}`);
        }

        const info = "Please open the alert to confirm your exist"
        const sent_at = Date.now();

        // 1️⃣ Insert alert into DB
        const { error } = await supabase
            .from("alerts")
            .insert([{ reg_no, sent_at, info, status: "pending" }]);
        if (error) throw error;

        // 2️⃣ Send FCM notification
        const message = {
            token: fcm_token,
            data: {
                type: "alert",
                sentAt: sent_at.toString(),
                info,
            },
            android: { priority: "high", ttl: 0, },
        };
        await admin.messaging().send(message);

        await supabase
            .from("location_logs")
            .update({ exit_time: exitTime,inside:false })
            .eq("reg_no", reg_no)
            .eq("date", today);

        // 3️⃣ Schedule server-side check for 2 min timeout
        setTimeout(async () => {
            const { data } = await supabase
                .from("alerts")
                .select("*")
                .eq("reg_no", reg_no)
                .eq("sent_at", sent_at)
                .single();

            if (data && data.status === "pending") {
                // user did NOT open notification
                console.log(`student ${reg_no} not attend the call send alert to admin`);

                await client.messages.create({
                    body: `⚠️ ALERT: ${student.name} (${reg_no}) (mobile number = ${student.mobile_number}) did NOT respond to exit verification.
                    Exit time: ${exitTime}`,
                    from: twilioPhone,
                    to: adminPhone,
                });
                console.log("🚨 Exit updated + Admin alert SMS sent (no response)");

                // Update status to timeout
                await supabase
                    .from("alerts")
                    .update({ status: "timeout" })
                    .eq("id", data.id);
            }
        }, 60 * 2000);

        return { success: true };
    } catch (err) {
        throw new Error("Failed to send alert");
    }
}


const AlertOpened= async (req, res) => {

    try {
        const { reg_no, timestamp } = req.body;

        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .eq("reg_no", reg_no)
            .eq("sent_at", timestamp)
            .single();

        if (error) throw error;

        if (data && data.status === "pending") {
            // User opened notification
            console.log("✅ User opened notification");

            // Execute function to update exit time 
            console.log(`Exit time updated for student ${reg_no}`);

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


module.exports = { Exitverification ,AlertOpened};