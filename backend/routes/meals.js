const router = require('express').Router();

const mealPlans = {
  diabetes: ['Ragi Java','Soft Dal Rice','Curd Rice','Vegetable Soup','Steam Idli'],
  surgery:  ['Steam Idli','Soft Rice Plain','Plain Rasam','Boiled Vegetables','Banana'],
  kidney:   ['Low-K Veg Soup','White Rice','Plain Curd','Cucumber Salad','Apple'],
  heart:    ['Oats Porridge','Brown Rice','Steamed Vegetables','Fruit Bowl','Thin Buttermilk']
};

router.get('/:condition', (req, res) => {
  const meals = mealPlans[req.params.condition] || mealPlans.diabetes;
  res.json({ meals });
});

module.exports = router;