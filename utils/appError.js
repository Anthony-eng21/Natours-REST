class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    /*sets our message for our error cases (failed, error)
    status depends on statusCode so dont need to pass it into an instance*/
    this.status = `${statusCode}`.startsWith("4") ? "failed" : "error";
    //help differenciates each error type and case i.e operational || programmatical
    this.isOperational = true;

    /*captureStackTrace are immediately collected, formatted, and attached 
     to the given error object. The optional constructorOpt parameter
     allows you to pass in a constructor() value. */
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
