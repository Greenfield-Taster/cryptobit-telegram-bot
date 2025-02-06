const express = require("express");
const router = express.Router();
const { sendFormData } = require("../controllers/telegramController");
const Form = require("../models/Form");

router.post("/send-form", sendFormData);

router.get("/forms", async (req, res) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Ошибка при получении данных" });
  }
});

module.exports = router;
