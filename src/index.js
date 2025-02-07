const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Базовый маршрут
app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/api/db-test", async (req, res) => {
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

const telegramRoutes = require("./routes/telegramRoutes");
app.use("/api", telegramRoutes);

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Тестовый маршрут
app.get("/api/test-telegram", async (req, res) => {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    await bot.sendMessage(
      chatId,
      "Тестовое сообщение! Проверка связи с сервером 👋"
    );
    res.json({ success: true, message: "Сообщение отправлено!" });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
