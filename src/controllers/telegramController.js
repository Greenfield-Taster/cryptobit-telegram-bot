const TelegramBot = require("node-telegram-bot-api");
const Form = require("../models/Form");

let bot;
try {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
} catch (error) {
  console.error("Error initializing bot:", error);
}

const validateFormData = (data) => {
  const required = [
    "fromCrypto",
    "toCrypto",
    "amount",
    "calculatedAmount",
    "senderWallet",
  ];
  const missing = required.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (isNaN(parseFloat(data.amount))) {
    throw new Error("Amount must be a valid number");
  }
  if (isNaN(parseFloat(data.calculatedAmount))) {
    throw new Error("Calculated amount must be a valid number");
  }
};

exports.sendFormData = async (req, res) => {
  try {
    console.log("Received form data:", JSON.stringify(req.body, null, 2));

    // Validate incoming data
    validateFormData(req.body);

    const formData = {
      fromCrypto: req.body.fromCrypto,
      toCrypto: req.body.toCrypto,
      amount: parseFloat(req.body.amount),
      calculatedAmount: parseFloat(req.body.calculatedAmount),
      senderWallet: req.body.senderWallet,
    };

    const form = new Form(formData);
    await form.save();
    console.log("Form saved with ID:", form._id);

    const message = `
Новая заявка:

Из: ${formData.fromCrypto}
В: ${formData.toCrypto}
Количество: ${formData.amount}
Цена: ${formData.calculatedAmount}
Кошелек: ${formData.senderWallet}
    `;

    const sentMessage = await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      message
    );
    console.log("Telegram message sent:", sentMessage.message_id);

    form.telegramStatus = {
      sent: true,
      sentAt: new Date(),
      messageId: sentMessage.message_id,
    };
    await form.save();

    res.status(200).json({
      success: true,
      message: "Данные успешно отправлены",
      formId: form._id,
    });
  } catch (error) {
    console.error("Error processing form:", {
      error: error.message,
      stack: error.stack,
      data: req.body,
    });

    res.status(500).json({
      success: false,
      message: error.message,
      type: error.name,
    });
  }
};
