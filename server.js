var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");


var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
});


// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("http://www.echojs.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    db.Article.remove({}, function(){

    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");
      result.site = $(this).children("address").text();

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

})

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {

  db.Article.find({})
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })

    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })

    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });


});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {

  // save the new note that gets posted to the Notes collection
  db.Note.create(req.body)
    // then find an article from the req.params.id
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { note: dbNote._id } },
        { new: true }
      );
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });

});


// Route for deleting note
// app.delete("/notes/delete/:note_id/:article_id", function (req, res) {

//   // save the new note that gets posted to the Notes collection
//   db.Note.findOneAndRemove({"_id": req.params.note_id }, function(err) {
//     if (err) {
//       console.log(err);
//       res.send(err);
//     }
//    else {
//     db.Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})
//     // Execute the above query
//      .exec(function(err) {
//        // Log any errors
//        if (err) {
//          console.log(err);
//          res.send(err);
    
//    }

//   });
   

// });


// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
