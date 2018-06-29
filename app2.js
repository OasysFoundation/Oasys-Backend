#!/usr/bin/env nodejs

/****************************
Starting Point of Application
****************************/
const express = require('express')
const util = require('util');
const bodyParser = require('body-parser')
const mongo = require('./mongo.js');
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

//TODO: Setup https
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
        var userAndContent = result[i].url.split('/');
        console.log(userAndContent);
        userId=userAndContent[2];
        contentId=userAndContent[3];

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
             "url" :          result[i].url,
             "rating" :       avg 
            });
          }
          else{
            trueResult.push({
             "picture" :      result[i].picture,
             "title" :        result[i].title,
             "description" :  result[i].description,
             "tags" :         result[i].tags,
             "url" :          result[i].url 
            });
          }
          if(i==(result.length-1))
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

app.get('/:userId/:contentId/avgRating', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;


  getRating(userId,contentId, "",function(response,err){
    console.log(response);
    res.json(response[0]);
  })
  //console.log(getRating(userId,contentId));
  //getRating(userId,contentId,res);

});

/*
Write rating for content into "ratings" db
*/

app.post('/:userId/:contentId/rate/:rating', function (req, res) {

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
Write data into to “contents” db
*/

app.post('/:userId/:contentId/save', function (req, res) {

  userId = req.params.userId;
  contentId = req.params.contentId;

   if(!req.body){
      res.end("Error: Request body is empty.");
    }
    else if(req.body.published==1){
      if(!req.body.picture || !req.body.title || !req.body.description || !req.body.tags || !req.body.url)
        res.end("You cannot publish unless you provide the picture url, title, description, tags, and url");
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

