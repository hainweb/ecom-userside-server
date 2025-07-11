// routes/api.js
const express = require("express");
const router = express.Router();
const { verifyLogin } = require("../middleware/authMiddleware");

// Controllers
const homeController = require("../controllers/homeController");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");
const otpController = require("../controllers/otpController");
const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const wishlistController = require("../controllers/wishlistController");
const addressController = require("../controllers/addressController");
const categoryController = require("../controllers/categoryController");
const sliderController = require("../controllers/sliderController");
const contactController = require("../controllers/contactController");
const profileController = require("../controllers/profileController");
const couponController = require("../controllers/couponController");
const ratingController = require("../controllers/ratingController");

// Home
router.get("/api/home", verifyLogin, homeController.home);

// Products
router.get("/api/products", productController.list);
router.get("/api/explore-products",productController.getExploreProducts)
router.get("/api/get-product/:id", verifyLogin, productController.getById);
router.get("/api/get-categories", categoryController.list);
router.get("/api/find-category-:thing", categoryController.find);

// Authentication & User
router.get("/api/login", authController.getLoginStatus);
router.post("/api/login", authController.login);
router.get("/api/logout", authController.logout);
router.post("/api/signup", authController.signup);
router.post("/api/find-user", authController.findUser);
router.post("/api/change-password", authController.changePassword);

// OTP (Forgot/Signup)
router.post("/api/forgot-send-otp", otpController.sendForgotOtp);
router.post("/api/send-otp", otpController.sendSignupOtp);
router.post("/api/verify-otp", otpController.verify);

// Cart
router.get("/api/cart", verifyLogin, cartController.viewCart);
router.get("/api/add-to-cart/:id", verifyLogin, cartController.addToCart);
router.post("/api/change-productQuantity", cartController.changeQuantity);
router.get("/api/get-cart-count", verifyLogin, cartController.getCartCount);

// Orders & Checkout
router.get("/api/place-order", verifyLogin, orderController.checkoutPage);
router.post("/api/place-order", verifyLogin, orderController.placeOrder);

router.post("/api/create-order", verifyLogin, orderController.createOrder);
router.post(
  "/api/verify-payment",
  verifyLogin,
  orderController.verifyPayment,
  orderController.placeOrder
);

router.get("/api/view-orders", verifyLogin, orderController.listOrders);
router.get(
  "/api/view-orders-products/:Id",
  verifyLogin,
  orderController.orderDetails
);
router.post("/api/cancel-order", verifyLogin, orderController.cancel);
router.post("/api/return-product", verifyLogin, orderController.returnProduct);
router.post("/api/buy-product", orderController.buyNowInfo);

// Wishlist
router.get("/api/wishlist", verifyLogin, wishlistController.view);
router.get("/api/add-to-Wishlist/:id", verifyLogin, wishlistController.toggle);

// Addresses
router.get("/api/get-address", verifyLogin, addressController.list);
router.post("/api/add-address", verifyLogin, addressController.add);
router.post("/api/edit-profile", verifyLogin, profileController.editProfile);
router.post("/api/edit-user-address", verifyLogin, addressController.edit);
router.post("/api/delete-address", verifyLogin, addressController.remove);

// Sliders
router.get("/api/get-sliders", sliderController.list);

// Contact Form
router.post("/api/contact-form", contactController.submit);

//Filter
router.get("/api/products/filter", productController.filterProduct);

//Coupons

router.get("/api/get-user-coupons", couponController.getCoupons);
router.post("/api/apply-coupon", couponController.applyCoupon);

//Rating

router.post("/api/submit-rating", ratingController.addRating);
router.post('/api/user-reviews',ratingController.getUserReviews)


// Suggested products 

router.get("/api/suggested-products",productController.suggestedProducts)

// Export
module.exports = router;
