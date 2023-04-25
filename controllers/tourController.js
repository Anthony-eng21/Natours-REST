const AppError = require("../utils/appError");
const Tour = require("./../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");

//TESTING WITH JSON
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// ); //read and convert all this data as JSON when reading this file

//param middleware with param(id, middleware(and val of each objects param id field))
//checks through the stack if we have a valid ID upon some request below in our pipeline
//if not returns some status(404) field and a message field

// exports.checkID = (req, res, next, val) => {
//   //id validator
//   console.log(`Tour id is ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: "fail",
//       message: "Invalid ID",
//     });
//   }
//   next();
// };

//another validator that checks the incoming request for the name and price
// field if they dont exist return a bad request and dont execute the
//the next middleware in our route

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: "fail",
//       message: "missing name or price",
//     });
//   }
//   next();
// };

//2) route handlers/controllers

exports.aliasTopTours = (req, res, next) => {
  //sets these properties of the query object prefilling parts of the query string before we then get the getAllTours
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
};

//OLD CODE
//BUILD QUERY
// // 1A) Filtering
// const queryObj = { ...req.query };
// const excludedFields = ["page", "sort", "limit", "fields"];
// //for each of these fields delete the fields we dont want in our obj from our arr const
// excludedFields.forEach((el) => delete queryObj[el]); //delete operator it deletes specified fields in our logic

// // 1B) Advanced Filtering
// // /api/v1/tours?duration=5?etc...
// let queryStr = JSON.stringify(queryObj);
// //replace this stringified objand replace it with a regex to add a dollar sign to each of these matched exutables&immutables in our url for filtering
// queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
// console.log(JSON.parse(queryStr));
// //promise with all the tours in some array with objects for each Tour data object
// let query = Tour.find(JSON.parse(queryStr)); // read this as an object again
// //GET /api/v1/tours?duration=23&difficulty=easy 200 132.840 ms - 9429 response query format //{ difficulty: "easy", duration: { $gte: 5 } }

// //2) SORT / possible with this query class / allows us to chain other sorting methods to our query/document obj
// if (req.query.sort) {
//   // /api/v1/tours?sort=-price,-ratingsAverage
//   const sortBy = req.query.sort.split(",").join(" ");
//   query = query.sort(sortBy);
//   //sort("price ratingsAverage")
// } else {
//   query = query.sort("-createdAt _id"); //added id field for later sort through tours pagination logic
// }

// //3) Field Limiting
// if (req.query.fields) {
//   // /api/v1/tours?fields=name,duration,price
//   const fields = req.query.fields.split(",").join(" ");
//   query = query.select(fields);
// } else {
//   query = query.select("-__v"); //exclude this field from the client
// }

// // //4) Pagination
// const page = req.query.page * 1 || 1; //str => num, or page 1
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit; //prev page * the limit 2 * 10 is basically 3 - 1 * 10 thats the formula here

// // //page=2&limit=10 / 1-10 page1, 11-20 page2, 21-30 page3 etc..
// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numTours = await Tour.countDocuments(); //returns amount of documents in a db in a promise
//   //compare skip and limit agains our numTours in our collection
//   if (skip >= numTours) throw new Error("This page does not exist"); }
//   //return error here it will stop this try block and go to catch
exports.getAllTours = catchAsync(async (req, res, next) => {
  /*EXECUTE QUERY
  //passes query object and query string from express that can get mutated overtime in the class methods
  //query.sort().select().skip().limit() */
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(); //only possible because after each method in the class we chained this to it which is the query variable
  const tours = await features.query; // EXECUTE the query variable we manipulate alot with our object back to the client

  //SEND RESPONSE
  res.status(200).json({
    status: "Success!",
    requestedAt: req.requestTime,
    results: tours.length,
    data: {
      tours: tours,
    },
  });
});

//helper() callback
exports.getTour = catchAsync(async (req, res, next) => {
  // TESTING WITH JSON
  // const id = req.params.id * 1; //similliar to ++stringToNumVar conversion
  // const tour = tours.find((el) => el.id === id);
  // //loops through array and in each iteration we have access
  // //to current element and we will either return true or false if the two elements match or not

  // //   // if (id > tours.length) {
  // //   if (!tour) {
  // //     return res.status(404).json({
  // //       status: "fail",
  // //       message: "Invalid Id",
  // //     });
  // //   }
  // res.status(200).json({
  //   status: "success",
  //   data: {
  //     tours: tour,
  //   },
  // });
  const tour = await Tour.findById(req.params.id); //:id in our URL Dynamic/specific param
  //Tour.findOne({_id: req.params.id}) thanks mongoose

  if (!tour) {
    //stop execution here immediately return this next(error) to our global error mw if this condition is met
    return next(new AppError("No tour found with that id", 404));
  }

  res.status(200).json({
    status: "Success!",
    data: {
      tour: tour,
    },
  });
});

//dont need try catch here so lets basically implement one
exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body); //returns a promise newTour when we create this document

  res.status(201).json({
    status: "Success!",
    data: {
      tour: newTour, //send that promise to the client here
    },
  });
});

//helper() callback
exports.patchTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true, //returns the modified the document/ovewrites
    runValidators: true, //validates update operation field types against our models schema
  });

  if (!tour) {
    //stop execution here immediately return this next(error) to our global error mw if this condition is met
    return next(new AppError("No tour found with that id", 404));
  }

  res.status(200).json({
    status: "Success!",
    data: {
      tour: tour,
    },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  //dont need to store this promises value because we dont need to show back to the client

  if (!tour) {
    //stop execution here immediately return this next(error) to our global error mw if this condition is met
    return next(new AppError("No tour found with that id", 404));
  }

  res.status(204).json({
    status: "Success!",
    data: null
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  //manipulate data through an array of stages with our aggregation pipeline (check mongodb docs for more)
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, //preliminary querey/stage to prepare for next stages ahead
    },
    {
      $group: {
        // allows us to group documents together using accumulators
        _id: { $toUpper: "$difficulty" }, ////calculate against speciefied field for our documents (accumulations)
        numTours: { $sum: 1 }, //this field mutates like a counter and shows us the data for each specified above document field criteria
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 }, //sorts documents by cheapest prices ascending
    },
  ]);

  res.status(200).json({
    status: "Success!",
    data: {
      stats: stats,
    },
  });
});

//pretty real business problem
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021
  //unwinding
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates", //unwind here will force a tour document to one of these startDates in that array/field of isos
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), //our queried docs are between the first day and last day of 2021
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        //magic happens in the grouping stage
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" }, //creates array of tour names for the months
      },
    },
    {
      $addFields: { month: "$_id" }, //our id here is technically our value for this operation lol
    },
    {
      $project: {
        //get rid of id field
        _id: 0, //set this value to all our fields named id
      },
    },
    {
      $sort: { numTourStarts: -1 }, //sorts descending starting with the highest number of tours/starts per tour
    },
    {
      $limit: 12, // allows only 12 documents(mos)
    },
  ]);
  
  const moCount = plan.length + " months"

  res.status(200).json({
    status: "Success!",
    data: {
      monthsAccountedFor: moCount,
      plan: plan,
    },
  });
});
