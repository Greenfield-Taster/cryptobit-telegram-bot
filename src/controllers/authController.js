const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const generateNumericNickname = async () => {
  let nickname = "";
  for (let i = 0; i < 5; i++) {
    nickname += Math.floor(Math.random() * 10);
  }

  const existingUser = await User.findOne({ nickname });
  if (existingUser) {
    return generateNumericNickname();
  }

  return nickname;
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Пользователь с таким email уже существует",
      });
    }

    const nickname = await generateNumericNickname();
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = new User({
      email,
      password: hashedPassword,
      name,
      nickname,
      role,
    });

    if (phone) {
      userData.phone = phone;
    }

    const user = new User(userData);
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      success: true,
      message: "Регистрация успешна",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        nickname: user.nickname,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при регистрации пользователя",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Неверный пароль",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      message: "Вход выполнен успешно",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Ошибка при входе:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при входе в систему",
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Токен не предоставлен",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Недействительный или истекший токен",
        expired: true,
      });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      message: "Токен успешно обновлен",
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Ошибка при обновлении токена:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при обновлении токена",
    });
  }
};

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Доступ запрещен. Токен не предоставлен",
      expired: false,
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res.status(403).json({
        success: false,
        message: isExpired
          ? "Срок действия токена истек"
          : "Недействительный токен",
        expired: isExpired,
      });
    }
    req.user = user;
    next();
  });
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        nickname: user.nickname,
        createdAt: user.createdAt,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Ошибка при получении пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении данных пользователя",
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const ExchangeRequest = require("../models/ExchangeRequest");
    const orders = await ExchangeRequest.find({ userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Ошибка при получении заказов пользователя:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при получении заказов пользователя",
    });
  }
};
