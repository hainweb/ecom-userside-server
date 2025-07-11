const ratingModel = require("../models/ratingModel");

module.exports = {
  addRating: async (req, res) => {
    const { productId, rating } = req.body;
    const userId = req.session.user?._id;
    try {
      console.log(
        `ProductId:${productId}, rating :${rating}, userId:${userId}`
      );

      const response = await ratingModel.addRating(productId, rating, userId);
      if (response.acknowledged) {
        res.status(200).json({ status: true });
      }
    } catch (error) {
      console.log(error);

      res.status(500).json({ message: "Something went wrong" });
    }
  },

  getUserReviews: async (req, res) => {
    const userId = req.session.user?._id;
    const { productIds } = req.body;
    try {
      const response = await ratingModel.getUserReviews(productIds, userId);
      res.status(200).json({reviews:response});
    } catch (error) {
      console.error(error);
      res.status(500).json("Something went wrong");
    }
  },
};
