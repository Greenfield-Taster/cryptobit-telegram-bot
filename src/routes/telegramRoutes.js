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

router.get("/test-env", (req, res) => {
  res.json({
    botTokenExists: !!process.env.TELEGRAM_BOT_TOKEN,
    chatIdExists: !!process.env.TELEGRAM_CHAT_ID,
    botTokenLength: process.env.TELEGRAM_BOT_TOKEN
      ? process.env.TELEGRAM_BOT_TOKEN.length
      : 0,
    chatIdValue: process.env.TELEGRAM_CHAT_ID || "not set",
  });
});

router.get("/db-test", async (req, res) => {
  try {
    // Проверяем состояние подключения
    const state = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    res.json({
      status: "success",
      connection: states[state],
      database: mongoose.connection.db.databaseName,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;
