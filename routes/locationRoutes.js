const express = require("express");
const {
  logLocation,
  UpdateExitTime,
} = require("../controllers/locationController");
const { SendOTP, sendCall, sendOTP, verifyOTP } = require("../controllers/sendotpController");
const { getAttendance } = require("../controllers/attendanceController");
const { checkTodayEntry } = require("../controllers/checkattendanceController");
const { getMobileNumberByRegister } = require("../controllers/getmobilenumber");
const { Exitverification } = require("../controllers/exitverification");

const router = express.Router();
const multer = require("multer");
const { Face_Signin } = require("../controllers/face_auth_Controller");
const upload = multer({ storage: multer.memoryStorage() });
router.post("/log", logLocation);
router.post("/sendotp", sendOTP);
router.put("/updateExit", UpdateExitTime);
router.post("/verifyotp", verifyOTP);
// router.post("/sendCall", sendCall);
router.get("/attendance/:reg_no", getAttendance);
router.get("/checkattendance/:reg_no", checkTodayEntry);
router.get("/getMobile/:registerNumber",getMobileNumberByRegister);
router.post("/exit-verification",Exitverification);
router.post("/signin", upload.single("image"), Face_Signin);

module.exports = router;
