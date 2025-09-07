const { ObjectId } = require("mongodb");
const collection = require("../config/collection");
const db = require("../config/connection");

module.exports = {
  getCoupons: async (userId) => {
    try {
      const response = await db
        .get()
        .collection(collection.COUPONS_COLLECTION)
        .findOne({ userId: new ObjectId(userId) });
      console.log("coppons", response);

      return response.coupons;
    } catch (error) {
      throw new Error(error);
    }
  },
  applyCoupon: async (userId, couponCode, price, apply) => {
    try {
      const userCoupons = await db
        .get()
        .collection(collection.COUPONS_COLLECTION)
        .findOne({ userId: new ObjectId(userId) });

      if (!userCoupons) {
        return { status: false, message: "No coupons found for this user." };
      }

      const coupon = userCoupons.coupons.find((c) => c.code === couponCode);

      if (!coupon) {
        return { status: false, message: "Coupon not found." };
      }

      if (coupon.isUsed) {
        return { status: false, message: "Coupon has already been used." };
      }

      if (new Date(coupon.expDate) < new Date()) {
        return { status: false, message: "Coupon has expired." };
      }

      if (price < coupon.minAmount) {
        return {
          status: false,
          message: `Minimum amount required is ₹${coupon.minAmount}.`,
        };
      }

     

      if (apply) {
        const response = await db
          .get()
          .collection(collection.COUPONS_COLLECTION)
          .updateOne(
            { userId: new ObjectId(userId), "coupons.code": couponCode },
            {
              $set: {
                "coupons.$.isUsed": true,
              },
            }
          );
        console.log(response);
      }

      return {
        status: true,
        message: "Coupon applied successfully.",
        discount: coupon.discount,
        coupon,
      };
    } catch (error) {
      console.error("Error applying coupon:", error);
      return {
        status: false,
        message: "Something went wrong while applying coupon.",
      };
    }
  },
};
