var db = require("../config/connection");
var collection = require("../config/collection");

const { ObjectId } = require("mongodb");
module.exports = {
  addProduct: (product, callback) => {
    db.get()
      .collection(collection.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => {
        console.log("Added product data", data);

        callback(data.insertedId);
      });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },
  getExploreProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .limit(8)
        .toArray();
      resolve(products);
    });
  },

  getProduct: (proId) => {
    console.log("api call to ser", proId);

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: new ObjectId(proId) })
        .then((product) => {
          console.log("product", product);

          resolve(product);
        });
    });
  },

  filterProduct: async (query) => {
    try {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find(query)
        .toArray();
      return products;
    } catch (error) {
      throw new Error("Error filtering", error);
    }
  },

  getOrdersCount: (proId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let result = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            { $match: { "products.item": new ObjectId(proId) } }, 
            { $unwind: "$products" }, 
            { $match: { "products.item": new ObjectId(proId) } }, 
            {
              $group: {
                _id: null,
                totalQuantity: { $sum: "$products.quantity" },
              },
            }, 
          ])
          .toArray();

        let totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
        resolve(totalQuantity);
      } catch (error) {
        reject(error);
      }
    });
  },

  getCategoriesName: async () => {
    try {
      const categories = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: null, 
              categories: { $addToSet: "$Category" }, 
            },
          },
          {
            $project: {
              _id: 0,
              categories: 1, 
            },
          },
        ])
        .toArray();

      console.log("cate ", categories);

      return categories[0] ? categories[0].categories : []; 
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  },

  getCategories: () => {
    return new Promise((resolve, reject) => {
      console.log("API call to server to get categories");

      db.get()
        .collection(collection.DISPLAY_COLLECTION)
        .findOne({})
        .then((result) => {
          if (result && result.categories) {
            console.log("success", result.categories);

            resolve(result.categories); 
          } else {
            console.log("no cat");

            reject("No categories found");
          }
        })
        .catch((err) => {
          console.error("Error fetching categories:", err);
          reject(err); 
        });
    });
  },

  deleteCategory: (catId) => {
    console.log("Category ID to delete:", catId);

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.DISPLAY_COLLECTION)
        .updateOne(
          {}, 
          { $pull: { categories: { id: new ObjectId(catId) } } } 
        )
        .then((result) => {
          if (result.modifiedCount > 0) {
            console.log("Deletion successful");

            db.get()
              .collection(collection.DISPLAY_COLLECTION)
              .findOne({})
              .then((result) => {
                if (result && result.categories) {
                  console.log("success", result.categories);
                  let categories = result.categories;

                  resolve({
                    status: true,
                    message: "Category deleted successfully",
                    categories,
                  });
                } else {
                  console.log("no cat");

                  resolve({
                    status: true,
                    message:
                      "Category deleted successfully, but no categories found",
                    categories: [],
                  });
                }
              })
              .catch((error) => {
                console.error("Error fetching categories:", error.message);
                reject({
                  status: "error",
                  message: "Error fetching categories after deletion",
                });
              });
          } else {
            console.log("Category not found or document missing");

            resolve({
              status: "failed",
              message: "Category not found or document missing",
            });
          }
        })
        .catch((error) => {
          console.error("Error during deletion:", error.message);

          reject({
            status: "error",
            message: error.message,
          });
        });
    });
  },

  findCategory: (thing) => {
    console.log("API call to server with category:", thing);

    return new Promise(async (resolve, reject) => {
     
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ Category: thing })
        .toArray();
      console.log("products sss s s", products);
      resolve(products);
    });
  },

  suggestedProducts: async () => {
    try {
      const response = await db
        .get()
        .collection(collection.RATING_COLLECTION)
        .aggregate([
          {
            $unwind: "$reviews",
          },
          {
            $group: {
              _id: "$productId",
              averageRating: { $avg: "$reviews.rating" },
            },
          },
          {
            $sort: { averageRating: -1 },
          },

          { $limit: 10 },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "_id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: "$productDetails",
          },
          {
            $replaceRoot: {
              newRoot: "$productDetails",
            },
          },
        ])
        .toArray();

      console.log("sugested products", response);

      return response;
    } catch (error) {
      console.error(error);

      throw new Error(error);
    }
  },
};
