require("dotenv").config();
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_VERIFY_SID;

//sendOTP
const sendOTP = async (req, res) => {
  const { phone } = req.body;
  try {
    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: phone, channel: "sms" });

    res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Verify OTP
const verifyOTP = async (req, res) => {
  const { phone, code } = req.body;
  try {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code });

    if (check.status === "approved") {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendOTP, verifyOTP };
