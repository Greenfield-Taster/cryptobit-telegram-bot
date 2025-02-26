const User = require("../models/User");
const ExchangeRequest = require("../models/ExchangeRequest");
const Chat = require("../models/Chat");

// Получение всех пользователей
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const searchQuery = search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { nickname: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(searchQuery)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении пользователей",
    });
  }
};

// Получение детальной информации о пользователе
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Получаем статистику заказов пользователя
    const ordersCount = await ExchangeRequest.countDocuments({ userId });
    const completedOrdersCount = await ExchangeRequest.countDocuments({
      userId,
      status: "completed",
    });

    res.json({
      success: true,
      data: {
        user,
        stats: {
          ordersCount,
          completedOrdersCount,
        },
      },
    });
  } catch (error) {
    console.error("Ошибка при получении данных пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении данных пользователя",
    });
  }
};

// Обновление пользователя
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, role } = req.body;

    // Проверка на существование пользователя с таким email
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Пользователь с таким email уже существует",
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { name, email, phone, role } },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    res.json({
      success: true,
      data: user,
      message: "Данные пользователя успешно обновлены",
    });
  } catch (error) {
    console.error("Ошибка при обновлении пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при обновлении пользователя",
    });
  }
};

// Удаление пользователя
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Проверяем, не пытается ли админ удалить сам себя
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "Вы не можете удалить свой собственный аккаунт",
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Можно также удалить связанные с пользователем данные
    // await ExchangeRequest.deleteMany({ userId });
    // await Chat.deleteMany({ userId });

    res.json({
      success: true,
      message: "Пользователь успешно удален",
    });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при удалении пользователя",
    });
  }
};

// Получение всех заявок на обмен
exports.getAllExchangeRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || null;
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const query = {};
    if (status) {
      query.status = status;
    }

    const exchangeRequests = await ExchangeRequest.find(query)
      .populate("userId", "name email nickname")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await ExchangeRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests: exchangeRequests,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Ошибка при получении заявок:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении заявок",
    });
  }
};

// Получение детальной информации о заявке
exports.getExchangeRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;

    const exchangeRequest = await ExchangeRequest.findById(requestId)
      .populate("userId", "name email nickname phone")
      .lean();

    if (!exchangeRequest) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена",
      });
    }

    // Проверяем, есть ли чат для этой заявки
    const chat = await Chat.findOne({ orderId: exchangeRequest.orderId });

    res.json({
      success: true,
      data: {
        request: exchangeRequest,
        hasChatSupport: !!chat,
        chatId: chat ? chat._id : null,
      },
    });
  } catch (error) {
    console.error("Ошибка при получении данных заявки:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении данных заявки",
    });
  }
};

// Обновление статуса заявки
exports.updateExchangeRequestStatus = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status, adminNote } = req.body;

    const validStatuses = ["pending", "processing", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Недопустимый статус заявки",
      });
    }

    const updateData = {
      status,
      adminConfirmed: status === "completed",
    };

    if (status === "completed" && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    if (adminNote) {
      updateData.adminNote = adminNote;
    }

    const exchangeRequest = await ExchangeRequest.findByIdAndUpdate(
      requestId,
      { $set: updateData },
      { new: true }
    ).populate("userId", "name email nickname");

    if (!exchangeRequest) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена",
      });
    }

    res.json({
      success: true,
      data: exchangeRequest,
      message: `Статус заявки изменен на "${status}"`,
    });
  } catch (error) {
    console.error("Ошибка при обновлении статуса заявки:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при обновлении статуса заявки",
    });
  }
};

// Получение статистики по заявкам
exports.getExchangeStatistics = async (req, res) => {
  try {
    // Общее количество заявок
    const totalRequests = await ExchangeRequest.countDocuments();

    // Количество заявок по статусам
    const statusCounts = await ExchangeRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по валютам
    const cryptoStats = await ExchangeRequest.aggregate([
      {
        $group: {
          _id: "$fromCrypto",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Статистика по дням (последние 7 дней)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await ExchangeRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalRequests,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        cryptoStats,
        dailyStats,
      },
    });
  } catch (error) {
    console.error("Ошибка при получении статистики:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении статистики",
    });
  }
};

// Создание нового чата поддержки для заявки
exports.createSupportChat = async (req, res) => {
  try {
    const { orderId, userId, initialMessage } = req.body;

    // Проверяем, существует ли заявка
    const exchangeRequest = await ExchangeRequest.findOne({ orderId });
    if (!exchangeRequest) {
      return res.status(404).json({
        success: false,
        message: "Заявка не найдена",
      });
    }

    // Проверяем, существует ли пользователь
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Проверяем, существует ли уже чат для этой заявки
    const existingChat = await Chat.findOne({ orderId });
    if (existingChat) {
      return res.status(400).json({
        success: false,
        message: "Чат для этой заявки уже существует",
        chatId: existingChat._id,
      });
    }

    // Создаем новый чат
    const newChat = new Chat({
      orderId,
      userId,
      status: "active",
      messages: [],
    });

    // Если есть начальное сообщение, добавляем его
    if (initialMessage) {
      newChat.messages.push({
        sender: "admin",
        content: initialMessage,
        timestamp: new Date(),
        read: false,
      });
    }

    await newChat.save();

    res.status(201).json({
      success: true,
      data: newChat,
      message: "Чат поддержки успешно создан",
    });
  } catch (error) {
    console.error("Ошибка при создании чата поддержки:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при создании чата поддержки",
    });
  }
};

exports.updateUserSchema = async (req, res) => {
  try {
    const { field, defaultValue } = req.body;

    // Это административная функция для обновления схемы
    // Будьте осторожны при использовании!

    // Пример обновления всех пользователей добавлением нового поля
    // или обновлением существующего
    if (!field) {
      return res.status(400).json({
        success: false,
        message: "Не указано поле для обновления",
      });
    }

    const updateObj = {};
    updateObj[field] = defaultValue !== undefined ? defaultValue : "";

    const result = await User.updateMany(
      { [field]: { $exists: false } },
      { $set: updateObj }
    );

    res.json({
      success: true,
      message: `Схема пользователей обновлена. Затронуто ${result.modifiedCount} записей.`,
      result,
    });
  } catch (error) {
    console.error("Ошибка при обновлении схемы пользователей:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при обновлении схемы пользователей",
    });
  }
};

module.exports = exports;
