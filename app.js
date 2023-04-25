const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize"); //protection against no sql query injection
const xss = require("xss-clean"); //protection against malicious html or js
const hpp = require("hpp"); //HTTP parameter pollution (for protection against <=)

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();
/*Global Middlewares
 first middlewares */

/*SET HTTP HEADERS
 need this to be the first "used" Mw to ensure that the HTTP headers are set
 The browser will read these headers and act on em i.e security headers */
app.use(helmet());

//DEVELOPMENT LOGGING
if (process.env.NODE_ENV === "development") {
  //returns a function/middleware similiar to other functions/middleware(logger)
  app.use(morgan("dev")); //GET /api/v1/tours 200 5.110 ms - 8810 depending on the type of request
}

/*SAME API LIMITING
allows one hundred requests onto this server/app in an hour this helps us against BRUTE FORCE ATTACKS */
const limiter = rateLimit({
  max: 100, //# of requests
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter); //only affect the routes with /api in our request url (so like all our requests lol)

//BODY PARSER, reading data form body into req.body and parses it into upto 10kb of data if it goes over, unaccepted server overflow?
//middleware function that modifies the incoming request data
//a step the request goes through while it's being processed
//this specific middleware adds data to request object very handy!
app.use(express.json({ limit: "10kb" })); //makes this middleware gives us the requests body object

/* best place to add this kind of DATA Sanitization 
becasue in our middlewares in our app architecture 
at this line/point of our code users / attackers have
access to the request body here before our router with
all our controllers, tours, user, and, auth logic*/

/*DATA SANITIZATION against NoSql query injection
looks at the req body req query string and req.params and 
then it'll filter out all th $'s and dots (monogdb operators)*/

app.use(mongoSanitize());

/*DATA SANITIZATION against XSS this will clean any malicious
user input that is in html format. i.e some attacker uses html 
and js to inject malicious codebut with this middleware we will 
make it so that the user can not use html or js as some input */

app.use(xss());

/* PREVENT PARAMETER POLLUTION 
specify whitelist[] parameters in some config
obj we pass into hpp MW allows for multiple same 
parameters without breaking our queries or app*/
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

//SERVING STATIC FILES
//use a built in express static() to serve our static html or img files etc... from a folder and not a route; dir/overview.html
app.use(express.static(`${__dirname}/public`));

//TEST middleware to get curTimeStamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// console.log(x) //uncaught exception

//3) routes
//mounted routers kind of making a sub app here
app.use("/api/v1/tours", tourRouter); //mount middleware for these specific routes (sub-app)
app.use("/api/v1/users", userRouter); //mount middleware for these specific routes (sub-app)

//OPERATIONAL ERROR HANDLER
//MIDDLEWARES ACT LIKE FUNNELS IF WE SCOPED THIS MW HIGHER IN THE DOCUMENT IT'D BREAK ALL OUR OTHER REQUESTS
//this middleware catches any uncached requests that come in that dont fit into the above middleware
// app.all runs for any incoming/funneling http request verbs that come under this request
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
  //flys this variable(originalUrl) past all other mw and sends it to the GEHMW with this error handling class to help

  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = "fail";
  // err.statusCode = 404;
});

//GLOBAL ERROR HANDLING MW (errorController)
//made a callack for this since its basically a controller() and we want THIN
//handles all our global environment(dev/prod) errors
app.use(globalErrorHandler);

module.exports = app;
