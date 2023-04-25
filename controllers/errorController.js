const AppError = require("./../utils/appError");

//we pass down our operational async error functions() to our global error handle mw that sends relevant dynammic error
//messages to the client
//change the weird operational error we got from mongoose into this nice
//tailored to client err message
const handleCastErrorDB = (err) => {
  const message = `💣Invalid ${err.path}: ${err.value}.💣`; //path: is the field so _id,  value is  www || #id
  return new AppError(message, 400);
};

/* handles duplicate values for our fields i.e name or id
extract from this nested obj from our mongo error res object err.keyValue
 "keyValue": {
   key,     value
   "name": "test tour amazing"
 }, */
const handleDuplicateFieldsDB = (err) => {
  //more genreic than using a regex that could maybe break
  const field = JSON.stringify(Object.keys(err.keyValue).join(" ")); //gets the enumerable key from our nested obj & field in this obj
  const value = JSON.stringify(Object.values(err.keyValue).join(" ")); //gets the enumerable value from our nested obj & field in this obj
  console.log(value);

  const message = `Duplicate field ${field} with value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  //loops over all these values for our errors object from mongo and extracts the message field with map()
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join("; ")}`;
  return new AppError(message, 400);
};

const handleError = () =>
  new AppError("Invalid token. please login again", 401);

const handleExpire = () =>
  new AppError("This token has expired. Please login into create a new one", 401);

//development helper()
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

//production helper()
const sendErrorProd = (err, res) => {
  //Operational, trusted error: send message to client helps between prod and dev env logic for global error handling
  if (err.isOperational) {
    //errors we create ourselves
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    //Programming or unknown error: don't leak error details
  } else {
    //1) Log error
    console.error("❌Error❌", err);

    //2)send generic message
    res.status(500).json({
      status: "Error!",
      message: "💣Something went very wrong!💣",
    });
  }
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack); //stack trace

  err.statusCode = err.statusCode || 500; //defaultilng to 500 or user specific error
  err.status = err.status || "error";

  //restrict our development logs for development and client logs for prod
  if (process.env.NODE_ENV === "development") {
    //magic function for our dev env tailored err messages
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    //we have to make a new variable for our param here like this because
    //#1 it's bad to overwrite/mutate params and the name property is reserved in js and this works
    //#2 here we implicitly say hey this error var is gonna have all the enumerable properties of this Error res object including name field we want here
    let error = Object.assign(err); //basically destructuring and storing this param into a new object

    //err type on name field is cast error so send this newly returned error to the client
    if (error.name === "CastError") error = handleCastErrorDB(error);
    //mongo error code 11000 is a duplicate field err on some post req i.e creating a tour with the same name as an existing one
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleError();
    if (error.name === "TokenExpiredError") error = handleExpire();

    //magic function for our prod env tailored err messages
    sendErrorProd(error, res);
  }
};
