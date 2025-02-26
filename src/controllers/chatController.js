const Chat = require("../models/Chat");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");

exports.getChats = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "active";

    const chats = await Chat.find({ status })
      .populate("userId", "nickname email")
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Chat.countDocuments({ status });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Ошибка при получении чатов:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении чатов",
    });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId).populate(
      "userId",
      "nickname email"
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Чат не найден",
      });
    }

    chat.messages.forEach((msg) => {
      if (msg.sender === "user" && !msg.read) {
        msg.read = true;
      }
    });
    await chat.save();

    res.json({
      success: true,
      data: chat.messages,
    });
  } catch (error) {
    console.error("Ошибка при получении сообщений:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении сообщений",
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Текст сообщения не может быть пустым",
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Чат не найден",
      });
    }

    if (chat.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Нельзя отправить сообщение в закрытый чат",
      });
    }

    const newMessage = {
      sender: "admin",
      content: message,
      timestamp: new Date(),
      read: true,
    };

    chat.messages.push(newMessage);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Отправка уведомления пользователю через бота Telegram
    // Здесь вы можете добавить интеграцию с вашим ботом

    res.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при отправке сообщения",
    });
  }
};

exports.closeChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Чат не найден",
      });
    }

    chat.status = "closed";
    chat.closedAt = new Date();
    await chat.save();

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Ошибка при закрытии чата:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при закрытии чата",
    });
  }
};

exports.archiveChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Чат не найден",
      });
    }

    if (chat.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "Только закрытые чаты можно архивировать",
      });
    }

    chat.status = "archived";
    await chat.save();

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Ошибка при архивации чата:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при архивации чата",
    });
  }
};
