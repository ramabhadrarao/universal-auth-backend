const express = require('express');
const router = express.Router();
const controller = require('../controllers/subcategory.controller');

router.post('/', controller.createSubcategory);
router.get('/', controller.getAllSubcategories);
router.put('/:id', controller.updateSubcategory);
router.delete('/:id', controller.deleteSubcategory);

module.exports = router;
