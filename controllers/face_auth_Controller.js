// controllers/face_auth_controller.js
const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-cpu");
const sharp = require("sharp");
const supabase = require("../config/supabaseClient");
const path = require("path");

const MODEL_URL = path.join(__dirname, "../models");

// load models once
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
]).then(() => console.log("Face models loaded ✅"));

// helper: convert buffer → resized tensor
async function bufferToTensor(buf) {
  const { data, info } = await sharp(buf)
    .resize(224, 224, { fit: "cover" }) // resize to reduce memory
    .raw()
    .toBuffer({ resolveWithObject: true });

  return tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);
}

const Face_Signin = async (req, res) => {
  try {
    const { reg_no } = req.body;
    const file = req.file; // multer

    if (!reg_no || !file) {
      return res.status(400).json({ error: "reg_no and image file required" });
    }

    // 1. get stored face from DB
    const { data: student, error } = await supabase
      .from("student")
      .select("*")
      .eq("reg_no", reg_no)
      .single();

    if (error || !student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 2. fetch stored face
    const storedRes = await fetch(student.face_url);
    const storedBuf = Buffer.from(await storedRes.arrayBuffer());

    let storedDesc, inputDesc;

    // use tidy to auto-dispose tensors
    await tf.tidy(async () => {
      const storedTensor = await bufferToTensor(storedBuf);
      const inputTensor = await bufferToTensor(file.buffer);

      storedDesc = await faceapi
        .detectSingleFace(storedTensor)
        .withFaceLandmarks()
        .withFaceDescriptor();

      inputDesc = await faceapi
        .detectSingleFace(inputTensor)
        .withFaceLandmarks()
        .withFaceDescriptor();

      // dispose tensors explicitly (safety)
      storedTensor.dispose();
      inputTensor.dispose();
    });

    if (!storedDesc || !inputDesc) {
      return res.status(400).json({ error: "Face not detected in one of the images" });
    }

    // 3. compare descriptors
    const distance = faceapi.euclideanDistance(
      storedDesc.descriptor,
      inputDesc.descriptor
    );

    if (distance < 0.45) {
      console.log("Face matched");
      return res.json({ success: true, student, message: "Face matched" });
    } else {
      console.log("Face did not match");
      return res.status(401).json({ success: false, message: "Face mismatch" });
    }
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { Face_Signin };
