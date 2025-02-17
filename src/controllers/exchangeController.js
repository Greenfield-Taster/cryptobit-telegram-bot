const TelegramBot = require("node-telegram-bot-api");
const ExchangeRequest = require("../models/ExchangeRequest");

let bot;
try {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN не установлен в .env");
  }
  if (!process.env.TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_CHAT_ID не установлен в .env");
  }

  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  console.log("Telegram бот успешно инициализирован");
} catch (error) {
  console.error("Ошибка инициализации бота:", error);
}

const sendToTelegram = async (message) => {
  if (!bot) {
    throw new Error("Telegram бот не инициализирован");
  }

  try {
    const sentMessage = await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      message,
      { parse_mode: "HTML" }
    );
    return sentMessage;
  } catch (error) {
    console.error("Ошибка отправки в Telegram:", error);
    throw new Error("Не удалось отправить сообщение в Telegram");
  }
};

exports.createExchangeRequest = async (req, res) => {
  let exchangeRequest;
  try {
    console.log("Получены данные формы:", req.body);

    exchangeRequest = new ExchangeRequest({
      fromCrypto: req.body.fromCrypto,
      toCrypto: req.body.toCrypto,
      amount: parseFloat(req.body.amount),
      calculatedAmount: parseFloat(req.body.calculatedAmount),
      senderWallet: req.body.senderWallet,
      recipientWallet: req.body.recipientWallet,
      saveFromWallet: Boolean(req.body.saveFromWallet),
      orderId: req.body.orderId,
    });

    await exchangeRequest.save();
    console.log("Заявка сохранена с ID:", exchangeRequest._id);

    const message = `
<b>🔄 Новая заявка на обмен #${exchangeRequest.orderId}</b>

📤 <b>Отправляет:</b> ${exchangeRequest.fromCrypto}
📥 <b>Получает:</b> ${exchangeRequest.toCrypto}
💰 <b>Сумма:</b> ${exchangeRequest.amount}
💵 <b>К получению:</b> ${exchangeRequest.calculatedAmount}

🔹 <b>Кошелек отправителя:</b> 
<code>${exchangeRequest.senderWallet}</code>

✅ Сохранить кошельки: ${exchangeRequest.saveFromWallet ? "✓" : "✗"} / ${
      exchangeRequest.saveToWallet ? "✓" : "✗"
    }
⏰ <b>Время:</b> ${new Date().toLocaleString()}
`;

    const sentMessage = await sendToTelegram(message);

    exchangeRequest.telegramMessageId = sentMessage.message_id;
    exchangeRequest.sentToTelegram = true;
    exchangeRequest.telegramSentAt = new Date();
    await exchangeRequest.save();

    res.status(200).json({
      success: true,
      message: "Заявка успешно создана и отправлена в Telegram",
      requestId: exchangeRequest._id,
    });
  } catch (error) {
    console.error("Ошибка при обработке заявки:", error);

    if (error.message.includes("Telegram") && exchangeRequest?._id) {
      res.status(500).json({
        success: false,
        message:
          "Заявка сохранена, но не отправлена в Telegram. Пожалуйста, проверьте настройки бота.",
        requestId: exchangeRequest._id,
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || "Внутренняя ошибка сервера",
      });
    }
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Ошибка при получении заявок:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении заявок",
    });
  }
};
