const { ObjectId } = require("mongodb");
const collection = require("../config/collection");
const db = require("../config/connection");

const ratingCollection = () => {
  return db.get().collection(collection.RATING_COLLECTION);
};

module.exports = {
  addRating: async (productId, rating, userId) => {
    try {
      let userQuery = {
        userId: new ObjectId(userId),
        rating,
      };
      let productQuery = {
        productId: new ObjectId(productId),
        reviews: [userQuery],
      };

      const isProductRating = await ratingCollection().findOne({
        productId: new ObjectId(productId),
      });

      if (isProductRating) {
        // const isUserRated=await ratingCollection.findOne({})
        console.log("Product has already rating");

        const isUserReviewed = await ratingCollection().findOne({
          productId: new ObjectId(productId),
          "reviews.userId": new ObjectId(userId),
        });

        if (isUserReviewed) {
          const existingReview = isUserReviewed.reviews.find(
            (r) => r.userId.toString() === userId.toString()
          );

          if (existingReview.rating > rating) {
            console.log(
              "user already reviewed ",
              existingReview.rating,
              "> ",
              rating
            );
            return;
          } else if (existingReview.rating < rating) {
            console.log(
              "user already reviewed, increase the rating",
              existingReview.rating,
              "< ",
              rating
            );

            const response = await ratingCollection().updateOne(
              {
                productId: new ObjectId(productId),
                "reviews.userId": new ObjectId(userId),
              },
              {
                $set: { "reviews.$.rating": rating },
              }
            );

            return response;
          } else {
            return;
          }
        }

        const response = await ratingCollection().updateOne(
          { productId: new ObjectId(productId) },
          {
            $push: { reviews: userQuery },
          }
        );

        return response;
      } else {
        const response = await ratingCollection().insertOne(productQuery);

        return response;
      }
    } catch (error) {
      throw new Error(error);
    }
  },

  getUserReviews: async (productIds, userId) => {
    try {
      const objectIds = productIds.map((id) => new ObjectId(id));
      const response = await ratingCollection()
        .find({
          productId: { $in: objectIds },
          "reviews.userId": new ObjectId(userId),
        })
        .toArray();

      const formatted = response.map((doc) => {
        const userReview = doc.reviews.find(
          (r) => r.userId.toString() === userId
        );

        return {
          productId: doc.productId.toString(),
          rating: userReview?.rating,
        };
      });

      return formatted;
    } catch (error) {
      throw new Error(error);
    }
  },
};
