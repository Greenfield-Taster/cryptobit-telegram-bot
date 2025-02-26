const User = require("../models/User");

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Необходима авторизация",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Требуются права администратора",
      });
    }

    next();
  } catch (error) {
    console.error("Ошибка при проверке прав администратора:", error);
    res.status(500).json({
      success: false,
      message: "Внутренняя ошибка сервера",
    });
  }
};

module.exports = isAdmin;
