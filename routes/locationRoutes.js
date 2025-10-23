const express = require("express");
const {
  logLocation,
  UpdateExitTime,
} = require("../controllers/locationController");
const { SendOTP, sendCall, sendOTP, verifyOTP } = require("../controllers/sendotpController");
const { getAttendance } = require("../controllers/attendanceController");
const { checkTodayEntry } = require("../controllers/checkattendanceController");
const { getMobileNumberByRegister } = require("../controllers/getmobilenumber");
const { Exitverification, AlertOpened } = require("../controllers/exitverification");

const router = express.Router();
const multer = require("multer");
const { Face_Signin } = require("../controllers/face_auth_Controller");
const { getEndTime } = require("../controllers/timingController");
const { update_Exit_Time } = require("../controllers/updateExitTime");
const { sendAlerttoAdmin } = require("../controllers/alertToadmin");
const { registerToken } = require("../controllers/registerToken");
const { ReplyforAlert, DeviceResponse, ExitOffline } = require("../controllers/replyforalert");
const { EmergencyAlert } = require("../controllers/emergency_alert");
const { KeepAlive } = require("../controllers/keepalive");

router.post("/log", logLocation);
router.post("/sendotp", sendOTP);
router.put("/updateExit", UpdateExitTime);
router.post("/verifyotp", verifyOTP);
// router.post("/sendCall", sendCall);
router.get("/attendance/:reg_no", getAttendance);
router.get("/checkattendance/:reg_no", checkTodayEntry);
router.get("/getMobile/:registerNumber",getMobileNumberByRegister);
router.post("/exit-verification",Exitverification);
// router.post("/exit-grace-check",CheckAfterEndGrace);
router.get("/signin",  Face_Signin);
router.get("/before-endTime/:dept_year_id", getEndTime);
router.post("/updateExitTime", update_Exit_Time);
router.post("/sendalert",sendAlerttoAdmin);
router.post("/register-token",registerToken);
router.post("/alert/opened", AlertOpened);
router.post("/alert/reply",ReplyforAlert);
router.post("/device/response", DeviceResponse);
router.post("/emergency-alert", EmergencyAlert);
router.post("/exit-offline",ExitOffline);
router.get("/keep-active",KeepAlive);

module.exports = router;
