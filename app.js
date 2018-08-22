#!/usr/bin/env nodejs
require('dotenv').config()
const express = require('express')
const util = require('util');
const bodyParser = require('body-parser')
const mongo = require('./mongo.js');

const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

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

/*Initialize firebase auth*/
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://oasys-create.firebaseio.com'
});

//Middleware for CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*,Content-Type,id");
    next();
});

// Middleware to parse JSON 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
    res.send('Documentation: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit?usp=sharing');
});

/*
Loads picture, title, description, tags, and url from "contents" db with published flag
*/

app.get('/GetContentsPreview', function (req, res) {
    mongo.GET.contentsPreview()
        .then(results => {
            gatherRatings(results)
                .then(ratings => {
                    //{ mean: x, count: y}
                    //merge the average rating into the original results
                    const updatedContents = results.map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    res.json(updatedContents)
                })
                .catch(err => {
                    throw err
                })
        })
});

/*
Loads picture, title, description, tags, and url from "contents" db for personal user page
*/
app.get('/getUserContentsPreview/:uid', function (req, res) {
    const {uid} = req.params;
    console.log(uid);
    mongo.GET.contentsPreviewUserPage(uid)
        .then(results => {
            console.log(results)
;            gatherRatings(results)
                .then(ratings => {
                    //merge the average rating into the original results
                    results
                        .map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    res.json(results)
                })
                .catch(err => {
                    throw err
                })
        })
});

/*
Loads picture, title, description, tags, and url from "contents" db for public user page
*/
app.get('/contentsPreviewPublishedUserPage/:uid', function (req, res) {
    const {uid} = req.params;
    console.log(uid);
    mongo.GET.contentsPreviewPublishedUserPage(uid)
        .then(results => {
            console.log(results)
;            gatherRatings(results)
                .then(ratings => {
                    //merge the average rating into the original results
                    results
                        .map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    res.json(results)
                })
                .catch(err => {
                    throw err
                })
        })
});

app.get('/user/:userId/:contentId', function (req, res) {
    const {userId, contentId} = req.params;
    mongo.GET.content(userId, contentId)
        .then(result => {res.json(result)})
        .catch(err => res.end(`Couldnt get content  + ${err}`));
});

/*
Loads avg rating of content from "ratings" db
*/
app.get('avgRating/:userId/:contentId', function (req, res) {
    const {userId, contentId} = req.params;
    getRating(userId, contentId)
        .then(result => res.json(result))
        .catch(err => res.end('Couldnt get average rating'));
});
/*
Write rating for content into "ratings" db
*/
app.post('/rate/', function (req, res) {
    const data = req.body; 
    const {contentOwner, contentName, rating, userWhoRatesUID} = data;
    const userWhoRates = (data.userWhoRates || "Anonymous")
    const token = req.get("Authorization")

    verifyUser(userWhoRatesUID, userWhoRates, token).then(
        mongo.SET.rating(contentOwner, contentName, rating, userWhoRates)
        .then(result => res.json(result))
        .catch(err => {
            res.end('Couldnt get average rating');
            throw err
        })
    )
});

/*
Write Comment for content into "comments" db
*/
app.post('/comment/', function (req, res) {
    const data = req.body;
    const {contentUserName, contentName, accessUserUID} = data;
    const accessUser = (data.accessUser || "Anonymous")
    const token = req.get("Authorization");

    verifyUser(accessUserUID,accessUser,token).then(
        mongo.SET.comment(contentUserName, contentName, data)
        .then(result => res.json(result))
        .catch(err => {
            res.end('error posting comment');
            throw err
        })
    )
});

/* 
Upload Unique Username into "users" db
*/
app.post('/newUsername/', function (req, res) {
    const data = req.body;
    const {username, uid} = data;
    const token = req.get("Authorization");
    username.indexOf('-') == -1
    ? verifyUser(uid, username, token).then(
        mongo.SET.username(uid, username)
        .then(result => res.json(result))
        .catch(err => {
            res.end(`Couldnt set username ::: ${err}`);
            throw err
        })
      )
    : res.json({"hyphen":true})
    
});

/*
upload wallet id to "users" db
*/
app.post('/postWalletId/', function (req, res) {
    const data = req.body;
    const {userId, walletId, uid} = data;
    const token = req.get("Authorization");
    verifyUser(uid,userId,token).then(
        mongo.SET.wallet(userId, walletId)
        .then(result => res.json(result))
        .catch(err => {
            res.end(`Couldnt set walletId ::: ${err}`);
            throw err
        })
    )
 });

/*
Write data into to “contents” db
*/
app.post('/save/', function (req, res) {
    const data = req.body;
    const {username, contentId, uid} = data;
    const token = req.get("Authorization");
    const isEmpty = Object.keys(data).length === 0 && data.constructor === Object;
    if (!data || isEmpty) {
        res.end("Error: Request body is empty.");
        return
    }
    else if ((!data.title || !data.description || !data.tags)) {
        res.end("You cannot save unless you provide the picture url, title, description, and tags");
        return;
    }
    const pubOrSave = req.body.published ? 'publish' : 'save'

    //check if title contains hyphen
    contentId.indexOf('-') == -1
    //check if user is saving as anonymous
    ? verifyUser(uid,username,token).then(
            mongo.SET.contentPost(pubOrSave, data, username, contentId)
            .then(result => res.json(result))
            .catch(err => {
                res.end(`Couldnt post content ::: ${err}`);
                throw err
            })
          ).catch(err => {
                    res.end("User token expired. Please login again")
                })
    : res.json({"hyphen":true})
    
});

/*
Upload profile picture to "users" db
*/
app.post('/uploadProfilePic/:uid/', function (request, response) {

    const {uid} = request.params;
    const {token} = request.get("Authorization")
    const files = request.files; // file passed from client
    const meta = request.data; // all other values passed from the client, like name, etc..

    console.log(files);
    console.log(meta);

    verifyUser(uid,"alwaysCheck",token).then(
        upload(request, response, function (error, success) {
            if (error) {
                console.log('uploadErr ', error);
                response.end('error" : "Update failed", "status" : 404');
            }
            console.log(request.files)
            console.log('File uploaded successfully.');

            var newUrl = request.files[0].location;

            mongo.SET.profilePicture(uid, newUrl)
                .then(result => {
                    console.log(`PROFILE picture uploaded!! `)
                    return response.json(result)
                })
                .catch(err => {
                    response.end(`Unexpected Error when uploading profile Pic ::: ${err}`)
                });
        })
    )
});

/*
Upload picture to "contents" db for cover photo
*/
app.post('/uploadTitle/:uid/:userId/:contentId', function (request, response) {
    const {userId, contentId, uid} = request.params;
    const {token} = request.get("Authorization");

    verifyUser(uid,userId,token).then(
        upload(request, response, function (error, success) {
            if (error) {
                console.log(error);
                response.end('{"error" : "Update failed", "status" : 404}');
            }
            console.log(request.files)
            console.log('File uploaded successfully.');

            const newUrl = request.files[0].location;
            console.log('newURL here:  ', newUrl);

            mongo.SET.titlePicture(userId, contentId, newUrl)
                .then(result => {
                    console.log(`Title picture uploaded!! `)
                    return res.json(result)
                })
                .catch(err => {
                    console.info(err)
                    res.end(`Problem when uploading TITLE Pic ::: ${err}`)
                });
        })
    )
});

/*
Get all information from "users" db
*/
app.get('/profile/:userId', function (req, res) {
    const userId = req.params.userId;
    mongo.GET.profile(userId)
        .then(result => {
            console.log(`got profile info! `)
            return res.json(result)
        })
        .catch(err => res.end("Unexpected Error from Db " + err));
});

/*
Write data into to "analytics" db
*/


app.post('/saveUserContentAccess', function (req, res) {
    const jsonBody = req.body;
    const {uid} = req.params;
    const token = req.get("Authorization");
    const isEmpty = Object.keys(jsonBody).length === 0 && data.constructor === Object;
    if (!jsonBody || isEmpty) {
        res.end("Error: Request body is empty.");
    }
    else {
        let username = (jsonBody.accessUserId || "Anonymous")
        verifyUser(uid,username,token).then(
            mongo.SET.analyticsData(jsonBody)
                .then(result => {
                return res.json(result)
                })
                .catch(err => res.end(`Problem when saving analytics ::: ${err}`))
        )
    }
});

/*
Get Analytics data for content from "analytics" db
*/
app.get('/getAllContentsForUser/:userId/', function (req, res) {
    const userId = req.params.userId;
    mongo.GET.analyticsFromUsers(userId)
        .then(result => res.json(result))
        .catch(err => {
            console.info(err)
            res.end(`Problem when getting analytics for user ::: ${err}`)
        });
});

/*
Get Analytics data for content CREATOR from "analytics" db
*/
app.get('/getAllContentsForCreator/:userId/', function (req, res) {
    const userId = req.params.userId;
    mongo.GET.analyticsFromCreator(userId)
        .then(result => res.json(result))
        .catch(err => {
            console.info(err)
            res.end(`Problem when getting analytics for CREATOR ::: ${err}`)
        });
});


app.get('/getContentInfo/:userId/:contentId', function (req, res) {
    const {userId, contentId} = req.params;
    mongo.GET.analyticsFromContent(userId, contentId)
        .then(result => res.json(result))
        .catch(err => {
            console.info(err)
            res.end(`Problem getting analytics for Content ::: ${err}`)
        });
});


app.get('/getAllRatings/:userId', function (req, res) {
    const userId = req.params.userId;
    mongo.GET.allRatings(userId)
        .then(ratings => res.json(ratings))
        .catch(err => {
            console.info(err)
            res.end("Unexpected Error from Db")
        })
})

/*
Get Analytics data for user from "analytics" db
*/
app.get('/getAllComments/:userId', function (req, res) {
  const userId = req.params.userId;
  mongo.GET.allComments(userId)
        .then(comments => res.json(comments))
        .catch(err => {
            console.info(err)
            res.end("Unexpected Error from Db")
        })
});

app.get('/comment/:userId/:contentId/:slideNumber', function (req, res) {
    const {userId, contentId, slideNumber} = req.params;
    mongo.GET.comments(userId, contentId, slideNumber)
        .then(comments => res.json(comments))
        .catch(err => {
            console.info(err)
            res.end("Unexpected Error from Db")
        })
})

/*
Deprecated for IMGUR
*/
/*
app.post('/uploadQuillPic', function (request, response) {
    const {token} = req.get("Authorization");
    upload(request, response, function (error, success) {
        if (error) {
            console.log(error);
            response.end('{"error" : "Update failed", "status" : 404}');
        }
        console.log(request.files)
        console.log('File uploaded successfully.');

        const newUrl = request.files[0].location;
        console.log(newUrl);
        response.json(newUrl);
    });
});
*/
/*
Helper function for calculating rating avg
*/
function getRating(userId, contentId, extra = "noExtra") {
    return new Promise(function (resolve, reject) {
        mongo.GET.ratingsForContent(userId, contentId)
            .then(result => {
                let mean = 0;
                if(result.length){
                    const sum = result.reduce((acc, val) => ({rating: acc.rating + val.rating})).rating;
                    mean = result.length ? sum / result.length : -1
                }
                resolve({mean, count: result.length});
            })
            .catch(err => {
                reject(err)
                throw err;
            })
    })
}

function verifyUser(uid, username, token){
    return new Promise(function (resolve, reject) {
        username === "Anonymous"
        ? resolve()
        : admin.auth().verifyIdToken(token)
            .then(function(decodedToken) {
              decodedToken.uid==uid
              ? resolve()
              : reject()      
            })
    })    
}


//get mean ratings for ALL CONTENTS
const gatherRatings = async function (data) {
    const allRatingsAsync = data.map(async function (result) {
        const {userId, contentId} = result;
        console.log("DATA", data);
        return await getRating(userId, contentId)
    });
    const allRatings = await Promise.all(allRatingsAsync);
    return allRatings
};

app.listen(8080, () => console.log('Listening on port 8080'))
