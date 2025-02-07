const express = require("express");
const router = express.Router();
const {
  createExchangeRequest,
  getAllRequests,
} = require("../controllers/exchangeController");

// Создание новой заявки на обмен
router.post("/send-form", createExchangeRequest);

// Получение всех заявок
router.get("/requests", getAllRequests);

module.exports = router;
