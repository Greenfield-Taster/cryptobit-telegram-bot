const User = require("../models/User");
const ExchangeRequest = require("../models/ExchangeRequest");

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

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

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

    res.json({
      success: true,
      data: {
        request: exchangeRequest,
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

exports.module.exports = exports;
