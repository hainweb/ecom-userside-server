
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");

exports.list = async (req, res, next) => {
  try {
    const user = req.session.user;
    const products = await productModel.getAllProducts();

    if (user) {
      const cartCount = await userModel.getCartCount(user._id);
      const wishlist = await userModel.getWishlist(user._id);
      products.forEach((p) => {
        p.isInWishlist = wishlist.products.some(
          (item) => item.item.toString() === p._id.toString()
        );
      });
      return res.json({ products, user, cartCount });
    }

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

exports.getExploreProducts = async (req, res, next) => {
  try {
    const products = await productModel.getExploreProducts();

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const product = await productModel.getProduct(req.params.id);
    const wishlist = await userModel.getWishlist(req.session.user._id);
    product.isInWishlist = wishlist.products.some(
      (item) => item.item.toString() === product._id.toString()
    );
    res.json(product);
  } catch (err) {
    next(err);
  }
};

exports.filterProduct = async (req, res) => {
  try {
    const { search, categories, minPrice, maxPrice, sort } = req.query;

    let query = {};

    
    if (search) {
      query.$or = [
        { Name: { $regex: search, $options: "i" } },
        { Category: { $regex: search, $options: "i" } },
      ];
    }

   
    if (categories) {
      const categoryList = Array.isArray(categories)
        ? categories
        : categories.split(",");
      query.Category = { $in: categoryList };
    }

   
    let useExpr = false;
    const exprConditions = [];

    if (minPrice !== undefined && minPrice !== "") {
      exprConditions.push({
        $gte: [{ $toDouble: "$Price" }, parseFloat(minPrice)],
      });
      useExpr = true;
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      exprConditions.push({
        $lte: [{ $toDouble: "$Price" }, parseFloat(maxPrice)],
      });
      useExpr = true;
    }

   
    if (useExpr) {
      query.$expr = { $and: exprConditions };
    }

    console.log("Query", query);

    let products = await productModel.filterProduct(query);
    console.log("Filtered products", products);

    
    if (sort === "price-low-high") {
      products.sort((a, b) => a.Price - b.Price);
    } else if (sort === "price-high-low") {
      products.sort((a, b) => b.Price - a.Price);
    } else if (sort === "name-a-z") {
      products.sort((a, b) => a.Name.localeCompare(b.Name));
    } else if (sort === "name-z-a") {
      products.sort((a, b) => b.Name.localeCompare(a.Name));
    }

    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

exports.suggestedProducts = async (req, res) => {
  const userId = req.session.user?._id;
  try {
    const response = await productModel.suggestedProducts();
  if(userId){
    const wishlist = await userModel.getWishlist(userId);
    response.forEach((p) => {
      p.isInWishlist = wishlist.products.some(
        (item) => item.item.toString() === p._id.toString()
      );
    });
  }
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};
