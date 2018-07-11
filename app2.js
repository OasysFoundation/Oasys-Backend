#!/usr/bin/env nodejs

/****************************
Starting Point of Application
****************************/
const express = require('express')
const util = require('util');
const bodyParser = require('body-parser')
const mongo = require('./mongo.js');

const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Set S3 endpoint to DigitalOcean Spaces
const spacesEndpoint = new aws.Endpoint('nyc3.digitaloceanspaces.com');

const s3 = new aws.S3({
  endpoint: spacesEndpoint
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'oasys-space',
    acl: 'public-read',
    key: function (request, file, cb) {
      console.log(file);
      //Unique identifier
      cb(null, Date.now().toString());
    }
  })
}).array('upload', 1);

const app = express()


//Middleware for CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*,Content-Type,id");
    next();
});

// Middleware to parse JSON 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Documentation: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit?usp=sharing');
});

/*
Loads picture, title, description, tags, and url from "contents" db with published flag
*/
app.get('/GetContentsPreview', function (req, res) {
  mongo.readPreviewFromMongo(function(result, err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else {
      trueResult = [];
      console.log(result.length);
      for(i = 0; i < result.length; i++){
        //make call to avg rating .then{}
        var userId=result[i].userId;
        var contentId=result[i].contentId;

        getRating(userId,contentId, i, function(response,err){
          avg=response[0];
          i = response[1];
          console.log("response inside");
          console.log(response);
          console.log(i);
          if (err) {
            res.end("Unexpected Error from Db");
          }
          else if(avg){
            console.log("MADE IT INSIDE");
            trueResult.push({
             "picture" :      result[i].picture,
             "title" :        result[i].title,
             "description" :  result[i].description,
             "tags" :         result[i].tags,
             "userId" :       result[i].userId,
             "contentId":     result[i].contentId,
             "rating" :       avg 
            });
          }
          else{
            trueResult.push({
             "picture" :      result[i].picture,
             "title" :        result[i].title,
             "description" :  result[i].description,
             "tags" :         result[i].tags,
             "userId" :       result[i].userId,
             "contentId":     result[i].contentId,
            });
          }
          if(trueResult.length==(result.length))
            res.json(trueResult); 

        })
      }
    }
  });
});

/*
Loads full JSON of selected experience from “contents” db
*/

app.get('/user/:userId/:contentId', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;

  mongo.readContentFromMongo(userId, contentId, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else{
      res.json(result); 
    }
  });

});

/*
Loads avg rating of content from "ratings" db
*/

app.get('avgRating/:userId/:contentId', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;


  getRating(userId,contentId, "",function(response,err){
    console.log(response);
    res.json(response[0]);
  })

});

/*
Write rating for content into "ratings" db
*/
app.post('/rate/:userId/:contentId/:rating', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;
  rating = req.params.rating;

  mongo.WriteRatingToMongo(userId, contentId, rating, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else{
      res.json(result); 
    }
  });

});

/* 
Upload Unique Username into "users" db
*/
app.post('/newUsername/:userId/:username/', function (req, res) {

  userId = req.params.userId;
  username = req.params.username;

  mongo.uploadUsername(userId, username, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }

    else if (!result){
      res.json({"userNameExists":true}); 
    }
    else{
      res.json({"userNameExists":false})
    }
  });

});

/*
Write data into to “contents” db
*/
app.post('/save/:userId/:contentId', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;

   if(!req.body){
      res.end("Error: Request body is empty.");
    }
    else if(req.body.published==1){
      if(!req.body.title || !req.body.description || !req.body.tags ){
        console.log("NOSIRE");
        res.end("You cannot publish unless you provide the picture url, title, description, and tags");
      }
      else {
        jsonBody =req.body;
        mongo.writeContentToMongo("publish", jsonBody, userId, contentId, function(result,err) { 
        if (err){
          console.log(err);
          res.end("Unexpected Error from Db");
        }
        else{
          console.log(result);
          res.send(result); 
        }
      });
      }

    }
    else{
      console.log("STEP 4: NOT EXPECTED");
      jsonBody =req.body;
      mongo.writeContentToMongo("save", jsonBody, userId, contentId, function(result,err) { 
        if (err){
          console.log(err);
          res.end("Unexpected Error from Db");
        }
        else{
          console.log(result);
          res.send(result); 
        }
      });
    }

});

/*
Helper function for calculating rating avg
*/
function getRating(userId,contentId,extra,callback){
  mongo.readRatingFromMongo(userId, contentId, function(result,err) { 
      if (err){
        console.log(err);
        res.end("Unexpected Error from Db");
      }
      else {
        avg = 0;
        sum = 0;
        count = 0;

        for (var i = 0; i < result.length; i++) {
          sum += result[i].rating;
          count +=1;
        }

        if (count != 0) {
          avg = sum/count;
        }
        myResponse = [avg,extra];
        callback(myResponse); 
      }
  });
}

/*
Upload profile picture to "users" db
*/
app.post('/uploadProfilePic/:userId', function (request, response) {

  userId = request.params.userId;
  const files = request.files; // file passed from client
  const meta = request.data; // all other values passed from the client, like name, etc..

  console.log(files);
  console.log(meta);


  upload(request, response, function (error, success) {
    if (error) {
      console.log(error);
      response.end('{"error" : "Update failed", "status" : 404}');
    }
    console.log(request.files)
    console.log('File uploaded successfully.');

    var newUrl = request.files[0].location;

    mongo.uploadPicture(userId, newUrl, function(result,err) { 
      if (err){
        console.log(err);
        response.end("Unexpected Error from Db");
      }
      else {
        response.json({"success":true}); 
      }
    });
  });
});

/*
Upload picture to "contents" db for cover photo
*/
app.post('/uploadTitle/:userId/:contentId', function (request, response) {

  userId = request.params.userId;
  contentId = request.params.contentId;

  upload(request, response, function (error, success) {
    if (error) {
      console.log(error);
      response.end('{"error" : "Update failed", "status" : 404}');
    }
    console.log(request.files)
    console.log('File uploaded successfully.');

    var newUrl = request.files[0].location;
    console.log(newUrl);

    mongo.uploadTitlePicture(userId, contentId, newUrl, function(result,err) { 
      if (err){
        console.log(err);
        response.end("Unexpected Error from Db");
      }
      else {
        console.log("WE MADE IT")
        response.json({"success":true}); 
      }
    });
  });
});

/*
Get all information from "users" db
*/
app.get('profile/:userId', function (request, response) {

  userId = request.params.userId;

  mongo.getProfile(userId, function(result,err) { 
    if (err){
      console.log(err);
      response.end("Unexpected Error from Db");
    }
    else {
      response.json(result); 
    }
  });
});


/*
Write data into to "comments" db
*/

app.post('/comment/:userId/:contentId', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;

   if(!req.body){
      res.end("Error: Request body is empty.");
    }
    else{
      jsonBody =req.body;
      mongo.writeCommentToMongo(jsonBody, userId, contentId, function(result,err) { 
        if (err){
          console.log(err);
          res.end("Unexpected Error from Db");
        }
        else{
          console.log(result);
          res.send(result); 
        }
      });
    }

});

/*
Get Comments for this unique piece of content from "comments" db
*/
app.get('/comment/:userId/:contentId/:slideNumber', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;
  slideNumber = req.params.slideNumber;


  mongo.readCommentsFromMongo(userId, contentId, slideNumber, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else{
      res.json(result); 
    }
  });

});

/*
Write data into to "analytics" db
*/

app.post('/saveUserContentAccess', function (req, res) {

   if(!req.body){
      res.end("Error: Request body is empty.");
    }
    else{
      jsonBody =req.body;
      mongo.writeAnalyticsDataToMongo(jsonBody, function(result,err) { 
        if (err){
          console.log(err);
          res.end("Unexpected Error from Db");
        }
        else{
          console.log(result);
          res.send(result); 
        }
      });
    }

});

/*
Get Analytics data for content from "analytics" db
*/
app.get('/getAllContentsForUser/:userId/', function (req, res) {

  userId = req.params.userId;

  mongo.readAnalyticsFromUsersMongo(userId, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else{
      res.json(result); 
    }
  });

});

/*
Get Analytics data for user from "analytics" db
*/
app.get('/getContentInfo/:userId/:contentId', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;

  mongo.readAnalyticsFromContentsMongo(userId, contentId, function(result,err) { 
    if (err){
      console.log(err);
      res.end("Unexpected Error from Db");
    }
    else{
      res.json(result); 
    }
  });

});

//testing new slack integration

//Save editor JSON to DB
//Saves to 'graph' db in mongo

// app.post('/saveEditor', (req, res) => {
 
//  if(!req.body){
//     res.end("Please provide something in the body. For more information: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit");
//   }
//   else{
//     jsonBody =req.body;
//     mongo.writeToMongo(jsonBody, function(result,err) { 
//       if (err){
//         console.log(err);
//         res.end("Unexpected Error from Db");
//       }
//       else if (!result.insertedId){
//         res.end("Unexpected Error from Db - no inserted ID");
//       }
//       else{
//         console.log(result);
//         console.log(result.insertedId);
//         res.send(result.insertedId); 
//       }
//     });
//   }
// });

// //Save editor JSON to DB
// app.post('/updateEditor', (req, res) => {
//   if(!req.headers.id){
//     res.end("Please provide the contentID in the header. For more information: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit");
//   }
//   else if(!req.body){
//     res.end("Please provide something in the body. For more information: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit");
//   } 
//   else {
//     jsonBody =req.body;
//     mongoId = req.headers.id;
//     mongo.updateMongo(jsonBody, mongoId, function(result,err) { 
//       if (err){
//         console.log(err);
//         res.end("Unexpected Error from Db");
//       }
//       else {
//         console.log(result);
//         res.send(result);
//       } 
//     });
//   }
// });

// //Delete editor JSON from DB
// app.get('/deleteEditor', (req, res) => {
//   if(!req.headers.id){
//     res.end("Please provide the contentID in the header. For more information: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit");
//   }
//   else {
//     mongoId = req.headers.id;
//     mongo.deleteFromMongo(mongoId, function(result,err) { 
//       if (err){
//         console.log(err);
//         res.end("Unexpected Error from Db");
//       }
//       else {
//         console.log(result);
//         res.send(result); 
//       }
//     });
//   }
// });


app.listen(8080, () => console.log('Listening on port 8080'))

