const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const adminController = require("../controllers/adminController");
const isAdmin = require("../middleware/isAdmin");
const { authenticateToken } = require("../controllers/authController");

router.use(authenticateToken);
router.use(isAdmin);

router.get("/chats", chatController.getChats);
router.get("/chats/:chatId/messages", chatController.getChatMessages);
router.post("/chats/:chatId/messages", chatController.sendMessage);
router.post("/chats/:chatId/close", chatController.closeChat);
router.post("/chats/:chatId/archive", chatController.archiveChat);

router.get("/users", adminController.getUsers);
router.get("/orders", adminController.getAllExchangeRequests);

module.exports = router;
