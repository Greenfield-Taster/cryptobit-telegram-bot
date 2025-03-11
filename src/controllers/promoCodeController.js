const PromoCode = require("../models/PromoCode");
const User = require("../models/User");

const generateUniqueCode = async () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Исключаем похожие символы: I, O, 0, 1
  let code = "";

  // Генерируем код из 8 символов
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Проверяем, существует ли такой код
  const existingCode = await PromoCode.findOne({ code });
  if (existingCode) {
    // Если код уже существует, генерируем новый
    return generateUniqueCode();
  }

  return code;
};

exports.createPromoCode = async (req, res) => {
  try {
    const { userId, discount, expiresAt } = req.body;

    // Проверка существования пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    // Проверка валидности скидки
    if (discount < 1 || discount > 100) {
      return res.status(400).json({
        success: false,
        message: "Скидка должна быть от 1% до 100%",
      });
    }

    // Генерация уникального кода
    const code = await generateUniqueCode();

    // Создание промокода
    const promoCode = new PromoCode({
      code,
      discount,
      userId,
      createdBy: req.user.userId,
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    });

    await promoCode.save();

    res.status(201).json({
      success: true,
      data: promoCode,
      message: "Промокод успешно создан",
    });
  } catch (error) {
    console.error("Ошибка при создании промокода:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при создании промокода",
    });
  }
};

exports.getAllPromoCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status; // "active", "used", "expired"

    const query = {};

    // Поиск по коду или имени пользователя
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { nickname: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((user) => user._id);

      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    // Фильтр по статусу
    if (status === "active") {
      query.isUsed = false;
      query.expiresAt = { $gt: new Date() };
    } else if (status === "used") {
      query.isUsed = true;
    } else if (status === "expired") {
      query.isUsed = false;
      query.expiresAt = { $lt: new Date() };
    }

    const promoCodes = await PromoCode.find(query)
      .populate("userId", "name email nickname")
      .populate("createdBy", "name email nickname")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await PromoCode.countDocuments(query);

    res.json({
      success: true,
      data: {
        promoCodes,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Ошибка при получении промокодов:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении промокодов",
    });
  }
};

exports.getPromoCodeById = async (req, res) => {
  try {
    const promoCodeId = req.params.id;

    const promoCode = await PromoCode.findById(promoCodeId)
      .populate("userId", "name email nickname")
      .populate("createdBy", "name email nickname");

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Промокод не найден",
      });
    }

    res.json({
      success: true,
      data: promoCode,
    });
  } catch (error) {
    console.error("Ошибка при получении промокода:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении промокода",
    });
  }
};

exports.deletePromoCode = async (req, res) => {
  try {
    const promoCodeId = req.params.id;

    const promoCode = await PromoCode.findById(promoCodeId);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Промокод не найден",
      });
    }

    // Проверка, что промокод не использован
    if (promoCode.isUsed) {
      return res.status(400).json({
        success: false,
        message: "Нельзя удалить использованный промокод",
      });
    }

    await PromoCode.findByIdAndDelete(promoCodeId);

    res.json({
      success: true,
      message: "Промокод успешно удален",
    });
  } catch (error) {
    console.error("Ошибка при удалении промокода:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при удалении промокода",
    });
  }
};

exports.validatePromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Код промокода не указан",
      });
    }

    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Промокод не найден или уже использован",
      });
    }

    // Проверка, что промокод принадлежит текущему пользователю
    if (promoCode.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Этот промокод не принадлежит вам",
      });
    }

    res.json({
      success: true,
      data: {
        discount: promoCode.discount,
        code: promoCode.code,
        expiresAt: promoCode.expiresAt,
      },
      message: "Промокод действителен",
    });
  } catch (error) {
    console.error("Ошибка при проверке промокода:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при проверке промокода",
    });
  }
};

exports.getUserPromoCodes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const promoCodes = await PromoCode.find({
      userId,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: promoCodes,
    });
  } catch (error) {
    console.error("Ошибка при получении промокодов пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении промокодов пользователя",
    });
  }
};
