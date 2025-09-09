var db = require("../config/connection");

var collection = require("../config/collection");

var bcrypt = require("bcrypt");

const { ObjectId } = require("mongodb");

const { response } = require("../app");

const { reject } = require("bcrypt/promises");

const parseOrderDate = (dateString) => {
  const [month, day, year, at, time, meridian] = dateString.split(/[\s,]+/);

  const [hours, minutes, seconds] = time.split(":");

  const monthIndex = new Date(Date.parse(month + " 1")).getMonth(); // Get month index (0-11)

  return new Date(
    year,

    monthIndex,

    day,

    meridian === "PM" ? (+hours % 12) + 12 : +hours,

    +minutes,

    +seconds
  );
};

const { v4: uuidv4 } = require("uuid");

module.exports = {
  doSignup: (userData, check, findUser) => {
    return new Promise(async (resolve, reject) => {
      console.log("find", userData, findUser);

      let response1 = {};

      let userExists = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Mobile: userData.Mobile });

      if (check) {
        if (userExists) {
          response1.status = false;

          response1.message = "This number is already taken";

          resolve(response1);
        } else {
          response1.status = true;

          resolve(response1);
        }
      } else if (findUser) {
        if (userExists) {
          response1.status = true;

          response1.user = userExists;

          resolve(response1);
        } else {
          response1.status = false;

          response1.message = `Can't find the mobile number`;

          resolve(response1);
        }
      } else {
        if (!userExists) {
          userData.Password = await bcrypt.hash(userData.Password, 10);

          db.get()
            .collection(collection.USER_COLLECTION)
            .insertOne(userData)
            .then((data) => {
              response1.user = userData;

              response1.status = true;

              resolve(response1);
            });
        } else {
          response1.status = false;

          resolve(response1);
        }
      }
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;

      let response = {};

      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Mobile: userData.Mobile });

      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log("Login success");

            response.user = user;

            response.status = true;

            resolve(response);
          } else {
            console.log("Login failed pss error");

            resolve({ status: false });
          }
        });
      } else {
        console.log("No user found");

        resolve({ status: false });
      }
    });
  },

  updateLastActive: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              LastActive: new Date().toISOString(),
            },
          }
        )
        .then((response) => {
          console.log("responce in last active update", response);
          resolve();
        });
    });
  },

  changePassword: (datas) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Received data:", datas);

        const user = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ _id: new ObjectId(datas.userId) });

        if (!user) {
          console.log("No user found");

          return resolve({ status: false, message: "No user found" });
        }

        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

        if (user.passwordChangedAt && user.passwordChangedAt > threeDaysAgo) {
          console.log("Password was changed recently");

          return resolve({
            status: false,

            message:
              "Password can only be changed after 3 days from the last change.",
          });
        }

        // Lockout check

        if (user.failedAttempts >= 6 && user.lockUntil > Date.now()) {
          const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000);

          console.log(
            "User is locked out. Try again in",
            remainingTime,
            "seconds"
          );

          return resolve({
            status: false,
            message: `Locked out. Try again in ${remainingTime} seconds`,
            remainingTime,
          });
        }

        // Reset lockout if expired

        if (user.lockUntil && user.lockUntil <= Date.now()) {
          await db
            .get()
            .collection(collection.USER_COLLECTION)
            .updateOne(
              { _id: new ObjectId(datas.userId) },

              { $set: { failedAttempts: 0, lockUntil: null } }
            );
        }

        if (datas.isForgot) {
          // Forgot password logic

          const isSameAsOldPassword = await bcrypt.compare(
            user.Password,
            user.Password
          );

          if (isSameAsOldPassword) {
            console.log("New password matches the previous password");

            return resolve({
              status: false,

              message:
                "New password must be different from the previous password",
            });
          } else {
            const hashedPassword = await bcrypt.hash(datas.newPassword, 10);

            await db
              .get()
              .collection(collection.USER_COLLECTION)
              .updateOne(
                { _id: new ObjectId(datas.userId) },

                {
                  $set: {
                    Password: hashedPassword,

                    failedAttempts: 0,

                    lockUntil: null,

                    passwordChangedAt: Date.now(),
                  },
                }
              );

            console.log("Password updated successfully (forgot password)");

            return resolve({
              status: true,
              message: "Password updated successfully",
            });
          }
        }

        // Normal password change

        const isPrevPasswordCorrect = await bcrypt.compare(
          datas.previousPassword,
          user.Password
        );

        if (!isPrevPasswordCorrect) {
          console.log("Previous password does not match");

          const failedAttempts = (user.failedAttempts || 0) + 1;

          const updateData = { failedAttempts };

          if (failedAttempts >= 6) {
            updateData.lockUntil = Date.now() + 2 * 60 * 1000;

            console.log("User locked out for 2 minutes");
          }

          await db
            .get()
            .collection(collection.USER_COLLECTION)
            .updateOne(
              { _id: new ObjectId(datas.userId) },

              { $set: updateData }
            );

          return resolve({
            status: false,

            message:
              failedAttempts >= 6
                ? "Too many failed attempts. Locked out for 2 minutes"
                : "Previous password does not match",
          });
        }

        // Check if new password is the same as the old password

        const isSameAsOldPassword = await bcrypt.compare(
          user.Password,
          user.Password
        );

        if (isSameAsOldPassword) {
          console.log("New password matches the previous password");

          return resolve({
            status: false,

            message:
              "New password must be different from the previous password",
          });
        }

        // Hash and update the new password

        const hashedPassword = await bcrypt.hash(datas.newPassword, 10);

        await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: new ObjectId(datas.userId) },

            {
              $set: {
                Password: hashedPassword,

                failedAttempts: 0,

                lockUntil: null,

                passwordChangedAt: Date.now(),
              },
            }
          );

        console.log("Password updated successfully");

        resolve({ status: true, message: "Password updated successfully" });
      } catch (error) {
        console.error("Error changing password:", error);

        reject({
          status: false,
          message: "An error occurred. Please try again.",
        });
      }
    });
  },

  editProfile: (userId, data) => {
    console.log("server data", data);

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              Name: data.Name,

              LastName: data.LastName,

              Email: data.Email,

              Mobile: data.Mobile,

              Gender: data.Gender,
            },
          }
        )
        .then(async (response) => {
          let user = await db
            .get()
            .collection(collection.USER_COLLECTION)
            .findOne({ _id: new ObjectId(userId) });

          console.log("up user", user);

          if (user) {
            user.loggedIn = true;

            resolve(user);
          }
        });
    });
  },

  addAddress: (userId, data) => {
    console.log("data", userId, data);

    return new Promise(async (resolve, reject) => {
      try {
        let user = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ _id: new ObjectId(userId) });

        console.log("add user", user);

        if (!user) {
          resolve({ status: false, message: "User not found" });

          return reject("User not found");
        }

        if (user.Address && user.Address.length >= 3) {
          console.log("User already has 3 addresses");

          return resolve({
            status: false,
            message: "User already has 3 addresses, cannot add more",
          });
        }

        const newAddress = {
          ...data,

          _id: uuidv4(),
        };

        console.log(newAddress);

        await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: new ObjectId(userId) },

            { $push: { Address: newAddress } }
          );

        console.log("address added", newAddress);

        let updateUser = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ _id: new ObjectId(userId) });

        console.log("get address user", updateUser);

        let address = updateUser.Address;

        resolve({
          status: true,
          message: "Address added successfully",
          address,
        });
      } catch (error) {
        console.log("Error:", error);

        resolve({
          status: false,
          message: "An error occurred while adding address",
        });
      }
    });
  },

  getAddress: (userId) => {
    console.log("user in get add", userId);

    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: new ObjectId(userId) });

      console.log("get address user", user);

      let userAddress = user.Address;

      console.log("add r", userAddress);

      resolve({ status: true, userAddress });
    });
  },

  editUserAddress: (data, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const addressId = data._id;

        const result = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: new ObjectId(userId), "Address._id": addressId },

            {
              $set: {
                "Address.$": data,
              },
            }
          );

        if (result.matchedCount > 0) {
          console.log("Address updated successfully!");

          let user = await db
            .get()
            .collection(collection.USER_COLLECTION)
            .findOne({ _id: new ObjectId(userId) });

          let updatedAddress = user.Address;

          resolve({
            status: true,
            message: "Address updated successfully!",
            updatedAddress,
          });
        } else {
          resolve({ status: false, message: "User or address not found!" });
        }
      } catch (error) {
        console.error("Error updating address:", error);

        reject({ status: false, error });
      }
    });
  },

  deleteAddress: async (addressId, userId) => {
    console.log("Deleting address with ID:", addressId, "for user ID:", userId);

    try {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: new ObjectId(userId) });

      if (!user) {
        console.log("User not found");

        return { status: false, message: "User not found" };
      }

      const addresses = user.Address || [];

      const addressIndex = addresses.findIndex(
        (address) => address._id === addressId
      );

      if (addressIndex === -1) {
        console.log("Address not found");

        return { status: false, message: "Address not found" };
      }

      addresses.splice(addressIndex, 1);

      const Address = addresses;

      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },

          { $set: { Address } }
        );

      console.log("Address deleted successfully", Address);

      return { status: true, message: "Address deleted successfully", Address };
    } catch (error) {
      console.error("Error deleting address:", error);

      return { status: false, message: "Error deleting address" };
    }
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: new ObjectId(proId),

      quantity: 1,
    };

    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );

        console.log(proExist);

        if (proExist != -1) {
          /*db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },

            {

              $inc: { 'products.$.quantity': 1 }

            }

          ).then(() => {

            resolve()

          }) */

          resolve({ status: false, message: "Already In Cart" });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: new ObjectId(userId) },

              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve({ status: true, message: "Product Added To Cart" });
            });
        }
      } else {
        let cartObj = {
          user: new ObjectId(userId),

          products: [proObj],
        };

        console.log(cartObj);

        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: new ObjectId(userId) },
          },

          {
            $unwind: "$products",
          },

          {
            $project: {
              item: "$products.item",

              quantity: "$products.quantity",
            },
          },

          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,

              localField: "item",

              foreignField: "_id",

              as: "product",
            },
          },

          {
            $project: {
              item: 1,

              quantity: 1,

              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      console.log(cartItems);

      resolve(cartItems);
    });
  },

  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;

      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      if (cart) {
        count = cart.products.length;
      }

      resolve(count);
    });
  },

  changeProductQuantity: (details) => {
    details.quantity = parseInt(details.count);

    details.count = parseInt(details.count);

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .findOne(
          {
            _id: new ObjectId(details.cart),
            "products.item": new ObjectId(details.product),
          },

          { projection: { "products.$": 1 } }
        )
        .then((cart) => {
          if (cart) {
            const currentQuantity = cart.products[0].quantity;

            if (currentQuantity + details.count <= 0) {
              db.get()
                .collection(collection.CART_COLLECTION)
                .updateOne(
                  { _id: new ObjectId(details.cart) },

                  {
                    $pull: {
                      products: { item: new ObjectId(details.product) },
                    },
                  }
                )
                .then((response) => {
                  resolve({ removeProduct: true });
                });
            } else {
              db.get()
                .collection(collection.CART_COLLECTION)
                .updateOne(
                  {
                    _id: new ObjectId(details.cart),
                    "products.item": new ObjectId(details.product),
                  },

                  {
                    $inc: { "products.$.quantity": details.count },
                  }
                )
                .then((response) => {
                  resolve({ status: true });
                });
            }
          } else {
            reject("Product not found in cart");
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  getTotalAmount: (userId) => {
    console.log("database", userId);

    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: new ObjectId(userId) },
          },

          {
            $unwind: "$products",
          },

          {
            $project: {
              item: "$products.item",

              quantity: "$products.quantity",
            },
          },

          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,

              localField: "item",

              foreignField: "_id",

              as: "product",
            },
          },

          {
            $project: {
              item: 1,

              quantity: 1,

              product: { $arrayElemAt: ["$product", 0] },
            },
          },

          {
            $project: {
              item: 1,

              quantity: 1,

              price: { $toDouble: "$product.Price" },
            },
          },

          {
            $group: {
              _id: null,

              total: { $sum: { $multiply: ["$quantity", "$price"] } },
            },
          },
        ])
        .toArray();

      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      if (Array.isArray(total) && total.length > 0) {
        resolve(total[0].total);
      } else {
        resolve(0);
      }
    });
  },

  addOrders: async (
    details,
    products,
    total,
    subtotal,
    couponDiscount,
    userId,
    couponCode,
    buyNow
  ) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(
          details,
          products,
          total,
          subtotal,
          couponCode,
          couponDiscount,
          userId
        );

        let status = "Order placed";

        const date = new Date().toLocaleString("en-US", {
          year: "numeric",

          month: "long",

          day: "numeric",

          hour: "numeric",

          minute: "numeric",

          second: "numeric",

          hour12: true,
        });

        console.log(date);

        let orderObj = {
          deliveryDetails: {
            name: details.Name,

            mobile: details.Mobile,

            address: details.Address,

            pincode: details.Pincode,

            state: details.State,

            city: details.City,

            type: details.Type,
          },

          userId: new ObjectId(userId),

          paymentMethod: details["payment-method"],

          products: buyNow ? [products] : products,

          total: total,

          subtotal: subtotal,

          couponDiscount: couponDiscount,

          ...(couponCode ? { couponCode: couponCode } : {}),

          status: status,

          date: date,
        };

        if (buyNow) {
          console.log("Processing Buy Now order for:", products.Name);

          if (products.Quantity === 0) {
            return resolve({
              status: false,

              message: `${products.Name} is Out of Stock`,

              product: products._id,
            });
          }

          if (products.Quantity < products.quantity) {
            return resolve({
              status: false,

              message: `Only ${products.Quantity} units of ${products.Name} are available.`,

              product: products._id,
            });
          }

          const transformedProducts = [
            {
              _id: new ObjectId(),

              item: products._id,

              quantity: 1,

              product: {
                _id: products._id,

                adminId: products.adminId,

                Name: products.Name,

                Price: products.Price,

                Category: products.Category,

                Description: products.Description,

                Quantity: products.Quantity,

                Return: products.Return,

                Specifications: products.Specifications,

                Highlights: products.Highlights,

                thumbnailImage: products.thumbnailImage,

                images: products.images,

                CustomOptions: products.CustomOptions,

                SellingPrice: products.SellingPrice,
              },
            },
          ];

          const orderObj = {
            deliveryDetails: {
              name: details.Name,

              mobile: details.Mobile,

              address: details.Address,

              pinncode: details.Pincode,

              state: details.State,

              city: details.City,

              type: details.Type,
            },

            userId: new ObjectId(userId),

            paymentMethod: details["payment-method"],

            products: transformedProducts,

            total: products.Price,

            status: "pending",

            total: total,

            subtotal: subtotal,

            couponDiscount: couponDiscount,

            ...(couponCode ? { couponCode: couponCode } : {}),

            date: date,
          };

          const response = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .insertOne(orderObj);

          const newQuantity = products.Quantity - 1;

          await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: new ObjectId(products._id) },

              { $set: { Quantity: newQuantity } }
            );

          console.log(`Stock updated. New quantity: ${newQuantity}`);
        } else {
          console.log("Processing Cart order");

          let orderObj = {
            deliveryDetails: {
              name: details.Name,

              mobile: details.Mobile,

              address: details.Address,

              pinncode: details.Pincode,

              state: details.State,

              city: details.City,

              type: details.Type,
            },

            userId: new ObjectId(userId),

            paymentMethod: details["payment-method"],

            products: products,

            total: total,

            status: status,

            date: date,
          };

          let isQuantityInsufficient = false;

          let insufficientProduct = null;

          let isStockOut = false;

          let stockOutProduct = null;

          for (const product of products) {
            console.log("Checking product", product);

            if (product.product.Quantity === 0) {
              isStockOut = true;

              stockOutProduct = product;

              break;
            }

            if (product.product.Quantity < product.quantity) {
              isQuantityInsufficient = true;

              insufficientProduct = product;

              break;
            }
          }

          if (isStockOut) {
            return resolve({
              status: false,

              message: `${stockOutProduct.product.Name} is Out of Stock`,

              product: stockOutProduct.item,
            });
          }

          if (isQuantityInsufficient) {
            return resolve({
              status: false,

              message: `Only ${insufficientProduct.product.Quantity} units of ${insufficientProduct.product.Name} are available.`,

              product: insufficientProduct.item,
            });
          }

          console.log("All cart products have sufficient quantity.");

          const response = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .insertOne(orderObj);

          for (const product of products) {
            const proId = product.item;

            const orderedQuantity = product.quantity;

            const currentProduct = await db
              .get()

              .collection(collection.PRODUCT_COLLECTION)

              .findOne({ _id: new ObjectId(proId) });

            if (currentProduct) {
              const newQuantity = currentProduct.Quantity - orderedQuantity;

              await db
                .get()

                .collection(collection.PRODUCT_COLLECTION)

                .updateOne(
                  { _id: new ObjectId(proId) },

                  { $set: { Quantity: newQuantity } }
                );

              console.log(`Product ${product.product.Name} quantity updated.`);
            } else {
              console.error(`Product with ID ${proId} not found.`);
            }
          }

          await db
            .get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: new ObjectId(userId) });

          /*     return resolve({
          status: true,
          message: "Order placed successfully.",
        }); */
        }

        //Coupon generating
        if (total > 10000) {
          console.log("User got a coupon, start generating...");

          function generateCouponCode(prefix = "SAVE") {
            const uuid = uuidv4().replace(/-/g, "").toUpperCase();
            return `${prefix}-${uuid}`;
          }

          function getExpiryDate(days = 30) {
            const now = new Date();
            now.setDate(now.getDate() + days);
            return now;
          }

          function getRandomDiscount(min, max) {
            const presetDiscounts = [
              499, 599, 699, 799, 899, 999, 1299, 1499, 1699, 1999, 2499, 2999,
              3499, 3999, 4499, 4999, 5999, 6999, 7999, 8999, 9999, 11999,
              12999, 13999, 14999, 15999, 16999, 17999, 19999,
            ];

            const filtered = presetDiscounts.filter(
              (d) => d >= min && d <= max
            );
            if (filtered.length === 0) return min;
            return filtered[Math.floor(Math.random() * filtered.length)];
          }

          function generateDiscountByTotal(total) {
            let discount = 0;
            let minAmount = 0;

            if (total > 5000 && total < 10000) {
              discount = getRandomDiscount(500, 1000);
              minAmount = 10000;
            } else if (total > 10000 && total < 15000) {
              discount = getRandomDiscount(500, 2000);
              minAmount = 10000;
            } else if (total >= 15000 && total < 20000) {
              discount = getRandomDiscount(1000, 4000);
              minAmount = 15000;
            } else if (total >= 20000 && total < 30000) {
              discount = getRandomDiscount(2000, 5000);
              minAmount = 20000;
            } else if (total >= 30000 && total < 50000) {
              discount = getRandomDiscount(2000, 7000);
              minAmount = 30000;
            } else if (total >= 50000 && total < 100000) {
              discount = getRandomDiscount(5000, 13000);
              minAmount = 50000;
            } else if (total >= 100000) {
              discount = getRandomDiscount(10000, 20000);
              minAmount = 100000;
            }

            return { discount, minAmount };
          }

          let { discount, minAmount } = generateDiscountByTotal(total);

          // create coupon
          let coupon = {
            code: generateCouponCode(),
            discount,
            minAmount,
            expDate: getExpiryDate(),
            isUsed: false,
          };

          let couponQuery = {
            userId: new ObjectId(userId),
            coupons: [coupon],
          };

          console.log("Coupon query is ", couponQuery);

          let userCoupons = await db
            .get()
            .collection(collection.COUPONS_COLLECTION)
            .find({ userId: new ObjectId(userId) })
            .toArray();

          console.log("user coupons", userCoupons);

          if (userCoupons.length > 0) {
            // update user coupons

            let response = await db
              .get()
              .collection(collection.COUPONS_COLLECTION)
              .updateOne(
                { userId: new ObjectId(userId) },
                { $push: { coupons: coupon } }
              );
            console.log("user have coupon ", response);
          } else {
            //create a new coupon collection
            let response = await db
              .get()
              .collection(collection.COUPONS_COLLECTION)
              .insertOne(couponQuery);
            console.log("User have no coupons", response);
          }

          return resolve({
            status: true,
            isCoupon: true,
            coupon,
            message: "Order placed successfully.",
          });
        } else {
          return resolve({
            status: true,
            message: "Order placed successfully.",
          });
        }
      } catch (error) {
        console.error("Error placing order:", error);
        reject(error);
      }
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      resolve(cart.products);
    });
  },

  getOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: new ObjectId(userId) })
        .toArray();

      console.log("order sie", orders);

      resolve(orders);
    });
  },

  getTrackOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ _id: new ObjectId(userId) })
        .toArray();

      console.log(orders);

      resolve(orders);
    });
  },

  getOrderedProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orderedProduct = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: new ObjectId(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              return: "$products.return",
              date: 1,
              couponCode: 1,
              couponDiscount: 1,
              subtotal: 1,
              total: 1,
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              return: 1,
              date: 1,
              couponCode: 1,
              couponDiscount: 1,
              subtotal: 1,
              total: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      resolve(orderedProduct);
    });
  },

  getOrderAddress: (addressId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .findOne(
          { _id: new ObjectId(userId), "Address._id": addressId },

          { projection: { "Address.$": 1 } }
        )

        .then((response) => {
          if (response && response.Address && response.Address.length > 0) {
            resolve(response.Address[0]);
          } else {
            resolve(null);
          }
        })

        .catch((error) => {
          reject(error);
        });
    });
  },

  addToWishlist: (proId, userId) => {
    let proObj = {
      item: new ObjectId(proId),
    };

    return new Promise(async (resolve, reject) => {
      try {
        let userWishlist = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ user: new ObjectId(userId) });

        console.log("user wishlist ", userWishlist);

        if (userWishlist) {
          let proExist = userWishlist.products.findIndex(
            (product) => product.item.toString() === proId
          );

          console.log(proExist);

          if (proExist !== -1) {
            await db
              .get()
              .collection(collection.WISHLIST_COLLECTION)
              .updateOne(
                { user: new ObjectId(userId) },

                { $pull: { products: { item: new ObjectId(proId) } } }
              );

            resolve({ status: "Product removed from wishlist" });
          } else {
            await db
              .get()
              .collection(collection.WISHLIST_COLLECTION)
              .updateOne(
                { user: new ObjectId(userId) },

                { $push: { products: proObj } }
              );

            resolve({ status: "Product added to wishlist" });
          }
        } else {
          let wishlistObj = {
            user: new ObjectId(userId),

            products: [proObj],
          };

          console.log(wishlistObj);

          await db
            .get()
            .collection(collection.WISHLIST_COLLECTION)
            .insertOne(wishlistObj);

          resolve({ status: "New wishlist created and product added" });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getWishlist: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let wishlist = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)

          .findOne({ user: new ObjectId(userId) });

        if (wishlist) {
          resolve(wishlist);
        } else {
          resolve({ products: [] });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let WishlistItems = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: new ObjectId(userId) },
          },

          {
            $unwind: "$products",
          },

          {
            $project: {
              item: "$products.item",
            },
          },

          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,

              localField: "item",

              foreignField: "_id",

              as: "product",
            },
          },

          {
            $project: {
              item: 1,

              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      console.log("wish list items are ", WishlistItems);

      resolve(WishlistItems);
    });
  },

  cancelOrder: (orderId, userId) => {
    return new Promise(async (resolve, reject) => {
      const date = new Date().toLocaleString("en-US", {
        year: "numeric",

        month: "long",

        day: "numeric",

        hour: "numeric",

        minute: "numeric",

        second: "numeric",

        hour12: true,
      });

      console.log("data in server", orderId, userId);

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(orderId) },

          {
            $set: { cancel: true, canceledTime: date },
          }
        )
        .then(async (response) => {
          console.log("order in server ", response);

          if (response) {
            let orderTrack = await db
              .get()
              .collection(collection.ORDER_COLLECTION)
              .find({ _id: new ObjectId(orderId) })
              .toArray();

            resolve({ status: true, orderTrack });
          } else {
            resolve({ status: false });
          }
        });
    });
  },

  returnProduct: (proId, orderId, check, reason, message) => {
    console.log(check);

    return new Promise(async (resolve, reject) => {
      const currentDate = new Date();

      const date = currentDate.toLocaleString("en-US", {
        year: "numeric",

        month: "long",

        day: "numeric",

        hour: "numeric",

        minute: "numeric",

        second: "numeric",

        hour12: true,
      });

      try {
        console.log("Product ID:", proId);

        console.log("Order ID:", orderId);

        const order = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .findOne({ _id: new ObjectId(orderId) });

        if (!order) {
          return resolve({ status: false, message: "Order not found" });
        }

        console.log("Order Data:", order);

        const orderProducts = order.products;

        const productIdToMatch = new ObjectId(proId);

        const matchingProduct = orderProducts.find((product) =>
          product.item.equals(productIdToMatch)
        );

        if (!matchingProduct) {
          return resolve({
            status: false,
            message: `Product with ID ${proId} not found in the order.`,
          });
        }

        console.log("Matching Product:", matchingProduct);

        if (matchingProduct.return && matchingProduct.return.status === true) {
          return resolve({
            status: false,
            message: "Product return already Accepted",
          });
        } else if (
          matchingProduct.return &&
          matchingProduct.return.status === false
        ) {
          return resolve({
            status: false,
            message: "Product return already requested",
          });
        }

        const returnPolicy = matchingProduct.product?.Return;

        const orderDateString = order.date;

        console.log("Order Date String:", orderDateString);

        const orderDate = parseOrderDate(orderDateString);

        if (isNaN(orderDate.getTime())) {
          console.error("Invalid order date format:", orderDateString);

          return resolve({ status: false, message: "Invalid order date" });
        }

        const differenceInMs = currentDate - orderDate;

        const differenceInDays = Math.floor(
          differenceInMs / (1000 * 60 * 60 * 24)
        );

        console.log("Difference in Days:", differenceInDays);

        if (
          (returnPolicy === "3 Days" && differenceInDays <= 3) ||
          (returnPolicy === "5 Days" && differenceInDays <= 5) ||
          (returnPolicy === "7 Days" && differenceInDays <= 7)
        ) {
          console.log(
            `Product is eligible for return under the ${returnPolicy} policy.`
          );

          if (check) {
            resolve({ status: true });
          } else {
            matchingProduct.return = {
              status: true,

              date: date,
            };

            if (message) {
              matchingProduct.return.returnReason = reason;

              matchingProduct.return.returnMessage = message;
            } else {
              matchingProduct.return.returnReason = reason;
            }

            await db
              .get()
              .collection(collection.ORDER_COLLECTION)
              .updateOne(
                { _id: new ObjectId(orderId) },

                { $set: { products: orderProducts } }
              );

            resolve({
              status: true,
              message: "Product return processed successfully",
            });
          }
        } else {
          console.log("Product is not eligible for return.");

          resolve({
            status: false,
            message: `Product return time is over (${returnPolicy})`,
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getSlider: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const slides = await db
          .get()
          .collection(collection.DISPLAY_COLLECTION)

          .find({}, { projection: { slider: 1 } })

          .toArray();

        if (slides.length > 0) {
          const sliderArray = slides[0].slider;

          console.log("slider array", sliderArray);

          resolve(sliderArray);
        } else {
          resolve([]);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  addContact: (data) => {
    console.log("adta ", data);

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CONTACT_COLLECTION)
        .insertOne(data)
        .then(() => {
          resolve({ status: true });
        });
    });
  },
};
