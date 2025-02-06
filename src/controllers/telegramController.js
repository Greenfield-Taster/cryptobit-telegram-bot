const TelegramBot = require("node-telegram-bot-api");
const Form = require("../models/Form");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

exports.sendFormData = async (req, res) => {
  try {
    const formData = req.body;

    const form = new Form(formData);
    await form.save();

    // Формируем сообщение из данных формы
    const message = `
    Новая заявка:
    
    Из:  ${formData.fromCrypto},
    В:  ${formData.toCrypto},
    Количество:  ${formData.amount},
    Цена:  ${formData.calculatedAmount},
    Кошелек:  ${formData.senderWallet}
        `;

    // Отправляем сообщение в Telegram
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);

    form.telegramStatus = {
      sent: true,
      sentAt: new Date(),
    };
    await form.save();

    res
      .status(200)
      .json({ success: true, message: "Данные успешно отправлены" });
  } catch (error) {
    console.error("Ошибка при отправке в Telegram:", error);
    res
      .status(500)
      .json({ success: false, message: "Ошибка при отправке данных" });
  }
};
