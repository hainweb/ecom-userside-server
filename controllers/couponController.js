const couponModels = require("../models/couponModel");
const { getCoupons } = require("../models/couponModel");

module.exports = {
  getCoupons: async (req, res) => {
    let userId = req.session.user._id;
    try {
      const response = await getCoupons(userId);
      res.json(response);
    } catch (error) {
      console.error(error);
      res.json({ status: false, message: "Something went wrong" });
    }
  },
  applyCoupon: async (req, res) => {
    let { code, price } = req.body;
    let userId = req.session.user._id;
    try {
      const response = await couponModels.applyCoupon(userId, code, price);
      console.log(response);

      res.json(response);
    } catch (error) {
      res.json({ status: false, message: "Something went wrong" });
    }
  },
};
