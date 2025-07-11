// controllers/orderController.js
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const couponModels = require("../models/couponModel");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_X9b2LOCu4sLwHX",
  key_secret: "REehPOu4r20VEsqJtw4MomNS",
});

exports.checkoutPage = async (req, res, next) => {
  try {
    const total = await userModel.getTotalAmount(req.session.user._id);
    res.json({ user: req.session.user, total });
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "receipt_order_id_" + new Date().getTime(),
    };

    const order = await razorpay.orders.create(options);
    console.log("Order creted and send", order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Order creation failed" });
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    console.log("Datas is ", req.body);

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", "REehPOu4r20VEsqJtw4MomNS")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      console.log("Payment verified");
      next();
    } else {
      res.status(400).json({ status: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.log("Payment verification failed", error);

    res.status(500).json({ error: "Order verification failed" });
  }
};

exports.placeOrder = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const address = await userModel.getOrderAddress(req.body.addressId, userId);

    let items, subtotal, couponDiscount, total;
    if (req.body.buyNow) {
      const prod = await productModel.getProduct(req.body.proId);
      items = prod;
      subtotal = prod.Price;
    } else {
      items = await userModel.getCartProducts(userId);
      subtotal = await userModel.getTotalAmount(userId);
    }

    const couponCode = req.body?.couponCode ?? null;

    let apply=true

    if (couponCode) {
      const coupon = await couponModels.applyCoupon(
        userId,
        couponCode,
        subtotal,
        apply
      );
      couponDiscount = coupon.discount;
      total = subtotal - couponDiscount;
    } else {
      couponDiscount = 0;
      total = subtotal;
    }

    console.log(
      `subtotal:${subtotal}, coupon dis ${couponDiscount}, total ${total}`
    );

    const response = await userModel.addOrders(
      address,
      items,
      total,
      subtotal,
      couponDiscount,
      userId,
      couponCode,
      req.body.buyNow
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const orders = await userModel.getOrders(req.session.user._id);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.orderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.Id;
    const products = await userModel.getOrderedProducts(orderId);
    const ordertrack = await userModel.getTrackOrders(orderId);
    res.json({ products, ordertrack });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const resp = await userModel.cancelOrder(
      req.body.orderId,
      req.session.user._id
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
};

exports.returnProduct = async (req, res, next) => {
  try {
    const { proId, orderId, check, reason, message } = req.body.returndata;
    const resp = await userModel.returnProduct(
      proId,
      orderId,
      check,
      reason,
      message
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
};

exports.buyNowInfo = async (req, res, next) => {
  try {
    const prod = await productModel.getProduct(req.body.proId);
    res.json({ total: prod.Price, product: prod });
  } catch (err) {
    next(err);
  }
};
