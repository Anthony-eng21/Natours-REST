//TERMINAL COMM. node ./dev-data/data/import-dev-data.js --delete || --import
///good script to populate some db cluster  with documents from a local json file
const fs = require("fs");
const mongoose = require("mongoose");
//read and save our variable as node env vars
const dotenv = require("dotenv");
const Tour = require("./../../models/tourModel");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    //mongodb connection constructor
    //deprecation warning config object
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connected Successfully!"));

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours.json`, "utf-8")
);

//import Data into db fn()

const importData = async () => {
  try {
    await Tour.create(tours); //creates a new document for each object in the array
    console.log("Data successfully loaded");
  } catch (err) {
    console.log(err.message);
  }
  process.exit(); //quit this process in the terminal 
};

//DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Tour.deleteMany(); // delete all documents in the tours collection
    console.log("Data successfully deleted ");
  } catch (err) {
    console.log(err.message);
  }
  process.exit(); //quit this process
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}

console.log(process.argv);
