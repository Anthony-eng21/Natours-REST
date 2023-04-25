const mongoose = require("mongoose");
const slugify = require("slugify");
// const validator = require("validator");
const User = require("./userModel");

const tourSchema = new mongoose.Schema(
  //definition of our schema
  {
    name: {
      type: String,
      required: [true, "A tour must have a name!"],
      unique: true,
      trim: true,
      maxlength: [40, "A tour name must have less or equal than 40 characters"],
      minlength: [10, "A tour name must have more or equal than 10 characters"],
      /*VALIDATOR JS EXAMPLE 
      point to this as soon as the data is validated but dont call it immediately
      validate: [validator.isAlpha, "Tour name must only contain characters"] */
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration!"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size!"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty!"],
      //BUILT IN VALIDATOR
      enum: {
        //like typescript super nice easy validator
        values: ["easy", "medium", "difficult"], //restricts user input value on this field to only these string values
        message: "Difficulty is either: easy, medium, or difficult!",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, //!rating field set this def
      //BUILT IN VALIDATOR
      min: [1, "Rating must be above 1.0!"],
      max: [5, "Rating must be below 5.0!"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price!"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //point to this as soon as the data is validated but dont call it immediately
          // this only ponts to current doc on NEW document creation
          return val < this.price; // 100 < 200 true EXECUTE : false
        },
        message: "Discount price ({VALUE}) should be below the regular price",
      },
    },
    summary: {
      type: String,
      //removes all white space at beginning or end of a string
      trim: true,
      required: [true, "A tour must have a description!"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //hide this data from the client in the output
    },
    //array of date object with our start stamps for each instance of this model
    startDates: [Date],
    secretTour: { type: Boolean, default: false },
    startLocation: {
      /* GEOJSON to let mongodb know that this is geospatial data is
    we use the type and coordinate fields in this embedded object */
      type: {
        type: String,
        default: "Point", //this is the geometry we specify for our location but mongodb supports so many geometries
        enum: ["Point"], //ensure it keeps Point geometry
      },
      coordinates: [Number], //numArr in geo json its longitude, latitude weird lol
      address: String,
      description: String,
    },
    //multiple docs for this array of objects that creeates new documents into this parent doc
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      //embedded sub documents
      {
        type: mongoose.Schema.ObjectId, //mongo us document id lol
        ref: "User"//reference to our user model dont need to import the other model actually
      }
    ],
  },
  //2ND OBJECT are options for our schema
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//virtual properties are calculations on the fly but their values are never saved in our db
//do it in our models instead of our controllers because we want
//to use it for primarily separating client and business logic
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7; //calculates duration in weeks
});

//DOCUMENT MIDDLEWARE: => current document / ONLY runs before the .save() and .create();
//PRE & POST SAVE HOOKS: RUNS MIDDLEWARE BEFORE OR AFTER AN EVENT
// tourSchema.pre("save", function(next) {
//   console.log("Will save document...");
//   next();
// })

// tourSchema.post("save", function(doc, next) {
//   console.log(doc);
//   next();
// })

tourSchema.pre("save", function (next) {
  //string of what we want to name our slug based off a name field and then an options arg
  this.slug = slugify(this.name, { lower: true });
  next();
});

//EMBEDDING USERS INTO TOUR DOCUMENTS NO GO!
/*
tourSchema.pre("save", async function (next) {
  //Basically an arr full of promises for each map iteration of this field's nested data so we need to get it with Promise.all
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises); //overwrite that field some id referencers for entire user objects
  next();
});
*/

//QUERY MIDDLEWARE  => current query / secret tours executed before the getAllTours(Tour.find()) query
//this regex checks for all strings that start with find so we can use findById etc... now in this pre-find hook
// tourSchema.pre("find", function (next) {
tourSchema.pre(/^find/, function (next) {
  //in THEORY pass another Tour.find() to our MW (getAllTours) and filter out our secretTour document lol
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: "guides",//field to tie these documents and some data
    select: "-__v -passwordChangedAt"
  })
  next()
})

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  // console.log(docs); // our docs
  next();
});

//AGGREGATION MIDDLEWARE => to the current aggregation object
tourSchema.pre("aggregate", function (next) {
  //add another fn() to pre-aggregate hook mw that adds/removes a stage to our aggregation array
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //remove all the secret tour docs with $ne: true / false

  // console.log(this.pipeline());
  next();
});

const Tour = mongoose.model("Tour", tourSchema); //created tour object out of a schema we just made

module.exports = Tour;
