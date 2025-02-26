const TelegramBot = require("node-telegram-bot-api");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");

let bot;

const initializeBot = async () => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN не установлен в .env");
    }
    if (!process.env.TELEGRAM_CHAT_ID) {
      throw new Error("TELEGRAM_CHAT_ID не установлен в .env");
    }

    const webhookUrl = process.env.WEBHOOK_URL;

    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

    const webhookResult = await bot.setWebHook(webhookUrl);
    console.log("Webhook установлен:", webhookResult);

    console.log("Telegram бот успешно инициализирован с webhook");
    return true;
  } catch (error) {
    console.error("Ошибка инициализации бота:", error);
    return false;
  }
};

initializeBot();

const sendToTelegram = async (message, orderId) => {
  if (!bot && !initializeBot()) {
    throw new Error("Telegram бот не может быть инициализирован");
  }

  try {
    console.log("Попытка отправки сообщения в Telegram");
    console.log("Chat ID:", process.env.TELEGRAM_CHAT_ID);
    console.log("OrderId для кнопки:", orderId);

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Подтвердить оплату",
            callback_data: `confirm_payment:${orderId}`,
          },
        ],
      ],
    };

    let retries = 3;
    let sentMessage = null;

    while (retries > 0 && !sentMessage) {
      try {
        sentMessage = await bot.sendMessage(
          process.env.TELEGRAM_CHAT_ID,
          message,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
      } catch (err) {
        console.error(`Попытка ${4 - retries} не удалась:`, err.message);
        retries--;

        if (
          err.code === "ETELEGRAM" &&
          err.response &&
          (err.response.statusCode === 401 || err.response.statusCode === 403)
        ) {
          console.log("Попытка переинициализации бота...");
          bot = null;
          initializeBot();
        }

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw err;
        }
      }
    }

    console.log("Сообщение успешно отправлено:", sentMessage);
    return sentMessage;
  } catch (error) {
    console.error("Детали ошибки отправки в Telegram:", {
      error: error.message,
      code: error.code,
      description: error.description || "No description",
    });
    throw new Error(
      `Не удалось отправить сообщение в Telegram: ${error.message}`
    );
  }
};

exports.processCallbackQuery = async (callbackQuery) => {
  console.log("Обработка callback_query:", callbackQuery);
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  if (data.startsWith("confirm_payment:")) {
    console.log("Обработка подтверждения платежа");
    const orderId = data.split(":")[1];
    try {
      console.log("Поиск заказа с orderId:", orderId);

      const exchangeRequest = await ExchangeRequest.findOneAndUpdate(
        { orderId: orderId },
        {
          $set: {
            status: "completed",
            adminConfirmed: true,
            completedAt: new Date(),
          },
        },
        { new: true }
      );

      console.log("Результат обновления:", exchangeRequest);

      if (exchangeRequest) {
        const updatedMessage =
          callbackQuery.message.text + "\n\n✅ Статус: Оплачено";

        await bot.editMessageText(updatedMessage, {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          message_id: messageId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Оплата подтверждена",
                  callback_data: "payment_confirmed",
                },
              ],
            ],
          },
        });

        console.log("Сообщение обновлено");

        return {
          success: true,
          message: "Оплата успешно подтверждена",
        };
      } else {
        console.log("Заказ не найден");
        return {
          success: false,
          message: "Ошибка: заказ не найден",
        };
      }
    } catch (error) {
      console.error("Ошибка при обновлении статуса:", error);
      return {
        success: false,
        message: "Ошибка при обновлении статуса: " + error.message,
      };
    }
  }

  return {
    success: false,
    message: "Неизвестный callback_data",
  };
};

// Экспортируем функцию для webhook
exports.setupWebhook = async (req, res) => {
  try {
    // Убедимся, что есть доступ к боту
    if (!bot && !initializeBot()) {
      return res.status(500).json({
        success: false,
        message: "Telegram бот не может быть инициализирован",
      });
    }

    // URL для webhook должен быть публичным и доступным из интернета
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: "URL для webhook не указан",
      });
    }

    // Устанавливаем webhook
    const result = await bot.setWebHook(webhookUrl);

    res.json({
      success: true,
      message: "Webhook успешно установлен",
      result,
    });
  } catch (error) {
    console.error("Ошибка при установке webhook:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при установке webhook: " + error.message,
    });
  }
};

// Обработчик webhook от Telegram
exports.handleWebhook = async (req, res) => {
  try {
    const update = req.body;

    // Проверяем, является ли это callback_query
    if (update && update.callback_query) {
      const result = await this.processCallbackQuery(update.callback_query);
      return res.json(result);
    }

    // Другие типы обновлений можно обрабатывать здесь

    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка при обработке webhook:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при обработке webhook: " + error.message,
    });
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

    const sentMessage = await sendToTelegram(message, exchangeRequest.orderId);

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
      // Если заявка сохранена, но возникла ошибка при отправке в Telegram
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
