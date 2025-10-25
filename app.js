var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const MongoStore = require("connect-mongo");
var userRouter = require("./routes/user");
var hbs = require("express-handlebars");
var app = express();
var fileUpload = require("express-fileupload");
var db = require("./config/connection");
var session = require("express-session");
require("dotenv").config();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, 
  })
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  hbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialsDir: __dirname + "/views/partials/",
    helpers: {
      lt: function (v1, v2) {
        return v1 < v2;
      },
      eq: function (v1, v2) {
        return v1 === v2;
      },
      multiply: function (v1, v2) {
        return v1 * v2;
      },
    },
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
console.log("Environment:", app.get("env")); 

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 30 * 24 * 60 * 60, // Session TTL (30 day)
    autoRemove: "native",
    touchAfter: 24 * 3600, // Time period in seconds between session updates
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dqys
  },
});

app.set("trust proxy", 1);
app.use(sessionMiddleware);
// Database connection
db.connect((err) => {
  if (err) {
    console.log("Database not connected" + err);
  } else {
    console.log("Database Connected ");
  }
});
// Route handling
app.use("/", userRouter);
// Static public directory
app.use("/public", express.static(path.join(__dirname, "public")));
// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});
// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // Render the error page
  res.status(err.status || 500);
  res.render("error");
});
module.exports = app;