const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
// const validate = require("../middleware/validate");
// const  {createItemSchema} = require("../validators/itemValidation");

const {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  getFilteredItems,
  searchItems,
  getPaginatedItems
} = require("../controllers/item");

router.post("/", authMiddleware, createItem);
router.get("/filter", getFilteredItems);
router.get("/search", searchItems);
router.get("/page", getPaginatedItems);
router.get("/", getAllItems);
router.get("/:id", getItemById);
router.put("/:id", authMiddleware, updateItem);
router.delete("/:id", authMiddleware, deleteItem);



module.exports = router;
