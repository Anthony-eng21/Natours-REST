class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString }; //req.query from mongoose
    const excludedFields = ["page", "sort", "limit", "fields"];
    //for each of these fields delete the fields we dont want in our obj from our arr const
    excludedFields.forEach((el) => delete queryObj[el]); //delete operator it deletes specified fields in our logic

    // 1B) Advanced Filtering
    // /api/v1/tours?duration=5?etc...
    let queryStr = JSON.stringify(queryObj);
    //replace this stringified obj and replace it with a regex to add a dollar sign to each of these matched exutables&immutables in our url for filtering
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
    // console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    return this; //JS FUNDAMENTAlS
  }

  //2) SORT / possible with this query class / allows us to chain other sorting methods to our query/document obj
  sort() {
    if (this.queryString.sort) {
      // /api/v1/tours?sort=-price,-ratingsAverage
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
      //sort("price ratingsAverage")
    } else {
      this.query = this.query.sort("-createdAt"); //added id field for later sort through tours pagination logic
    }

    return this; //JS FUNDAMENTAlS
  }

  //3) Field Limiting
  limitFields() {
    if (this.queryString.fields) {
      // /api/v1/tours?fields=name,duration,price
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("_v"); //exclude this field from the client
    }

    return this;
  }

  paginate() {
    // //4) Pagination
    const page = this.queryString.page * 1 || 1; //str => num, or page 1
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit; //prev page * the limit 2 * 10 is basically 3 - 1 * 10 thats the formula here

    // //page=2&limit=10 / 1-10 page1, 11-20 page2, 21-30 page3 etc..
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;

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