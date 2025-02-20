const TelegramBot = require("node-telegram-bot-api");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");

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

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    exchangeRequest = new ExchangeRequest({
      fromCrypto: req.body.fromCrypto,
      toCrypto: req.body.toCrypto,
      amount: parseFloat(req.body.amount),
      calculatedAmount: parseFloat(req.body.calculatedAmount),
      senderWallet: req.body.senderWallet,
      recipientWallet: req.body.recipientWallet,
      saveFromWallet: Boolean(req.body.saveFromWallet),
      orderId: req.body.orderId,
      userId: req.user.userId,
    });

    await exchangeRequest.save();
    console.log("Заявка сохранена с ID:", exchangeRequest._id);

    const message = `
<b>🔄 Новая заявка на обмен #${exchangeRequest.orderId}</b>

👤 <b>Пользователь:</b> ${user.nickname} 

📤 <b>Отправляет:</b> ${exchangeRequest.fromCrypto}
📥 <b>Получает:</b> ${exchangeRequest.toCrypto}
💰 <b>Сумма:</b> ${exchangeRequest.amount}
💵 <b>К получению:</b> ${exchangeRequest.calculatedAmount}

🔹 <b>Кошелек отправителя:</b> 
<code>${exchangeRequest.senderWallet}</code>

✅ Сохранить кошельки: ${exchangeRequest.saveFromWallet ? "✓" : "✗"}

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

exports.getRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.userId;

    const request = await ExchangeRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Заказ не найден",
      });
    }

    if (request.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "У вас нет доступа к этому заказу",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Ошибка при получении данных заказа:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении данных заказа",
    });
  }
};

// exports.getAllRequests = async (req, res) => {
//   try {
//     const requests = await ExchangeRequest.find()
//       .sort({ createdAt: -1 })
//       .limit(100);

//     res.json({
//       success: true,
//       data: requests,
//     });
//   } catch (error) {
//     console.error("Ошибка при получении заявок:", error);
//     res.status(500).json({
//       success: false,
//       message: "Ошибка при получении заявок",
//     });
//   }
// };
