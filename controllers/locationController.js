const { saveLocation, updateExitTime } = require("../models/locationModel");

const logLocation = async (req, res) => {
  const { reg_no, latitude, longitude, entry_time, is_present } = req.body;

  const response = await saveLocation(
    reg_no,
    latitude,
    longitude,
    entry_time,
    is_present
  );

  if (!response.success) {
    return res.status(500).json(response);
  }

  res.status(200).json(response);
};

const UpdateExitTime = async (req, res) => {
  const { reg_no, exit_time } = req.body;

  const response = await updateExitTime(reg_no, exit_time);

  if (!response.success) {
    return res.status(500).json(response);
  }

  res.status(200).json(response);
};

module.exports = { logLocation, UpdateExitTime };
