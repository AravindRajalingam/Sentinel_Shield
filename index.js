const express = require("express");
const cors = require("cors");
const locationRoutes = require("./routes/locationRoutes");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/location", locationRoutes);

const PORT = process.env.PORT||5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
