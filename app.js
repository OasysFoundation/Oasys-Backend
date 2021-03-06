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
    res.header("Access-Control-Allow-Headers", "Content-Type,id,Authorization");
    next();
});

// Middleware to parse JSON 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
    res.send('Documentation: https://docs.google.com/document/d/1aRe4420DifJNUmK-BPdQocBaC6b8LkowPVv4TJN0jJQ/edit?usp=sharing');
});

/*
Loads all overview data from "contents" db with published AND featured flag
*/
app.get('/GetContentsPreview', function (req, res) {
    mongo.GET.contentsPreview()
        .then(results => {
            gatherRatings(results)
                .then(ratings => {
                    //{ mean: x, count: y}
                    //merge the average rating into the original results
                    const updatedContents = results.map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    gatherViews(updatedContents)
                        .then(views=>{
                            const contents = updatedContents.map((result, idx) => Object.assign(result, {views: views[idx]}));
                            res.json(contents)
                        })                        
                })
                .catch(err => {
                    throw err
                })
        })
});

app.get('/getContentById/:contentId', function (req, res) {
    mongo.GET.contentById(req.params.contentId)
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

app.get('/getContentByUserNameAndTitle/:username/:title', function (req, res) {
    const {username, title} = req.params;
    mongo.GET.contentByUserNameAndTitle(username, title)
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
            gatherRatings(results)
                .then(ratings => {
                    //{ mean: x, count: y}
                    //merge the average rating into the original results
                    const updatedContents = results.map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    gatherViews(updatedContents)
                        .then(views=>{
                            const contents = updatedContents.map((result, idx) => Object.assign(result, {views: views[idx]}));
                            res.json(contents)
                        })                        
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
            gatherRatings(results)
                .then(ratings => {
                    //{ mean: x, count: y}
                    //merge the average rating into the original results
                    const updatedContents = results.map((result, idx) => Object.assign(result, {rating: ratings[idx]}));
                    gatherViews(updatedContents)
                        .then(views=>{
                            const contents = updatedContents.map((result, idx) => Object.assign(result, {views: views[idx]}));
                            res.json(contents)
                        })                        
                })
                .catch(err => {
                    throw err
                })
        })
});

app.get('/user/:uid/:contentId', function (req, res) {
    const {uid, contentId} = req.params;
    mongo.GET.content(uid, contentId)
        .then(result => {
            res.json(result)
        })
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


app.post('/remove', function (req, res) {
    const {uid, contentId} = req.body;
    const token = req.get("Authorization");
    verifyUser(token).then(function(user){
        mongo.SET.removeContent(user.uid, contentId)
            .then(result => res.json(result))
            .catch(err => {
                res.end('Couldnt remove content');
                throw err
            })
        }
    )
});

/*
Write rating for content into "ratings" db
*/
app.post('/rate/', function (req, res) {
    const data = req.body;
    const { uid, contentId, rating} = data;
    const token = req.get("Authorization")

    verifyUser(token).then(function(user){
        mongo.SET.rating(uid, contentId, rating, user.uid)
            .then(result => res.json(result))
            .catch(err => {
                res.end('Couldnt get average rating');
                throw err
            })
        }
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

    verifyUser(accessUserUID, accessUser, token).then(
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
        : res.json({"hyphen": true})

});

/*
upload wallet id to "users" db
*/
app.post('/postWalletId/', function (req, res) {
    const data = req.body;
    const {userId, walletId, uid} = data;
    const token = req.get("Authorization");
    verifyUser(uid, userId, token).then(
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
// user: {
//     name: null,
//         uid: null,
//         idToken: null
// },
// title: "Physics101",
//     id: 'project_1245',
//     isEditMode: true,
//     description: 'LASDIADALAIDA',
//     tags: [], //has categories


app.post('/save/', function (req, res) {
    const data = req.body;
    const username = data.user.displayName;
    const uid = data.user.uid;
    const token = req.get("Authorization");
    const isEmpty = Object.keys(data).length === 0 && data.constructor === Object;


    if (!data || isEmpty) {
        res.end("Error: Request body is empty.");
        return
    }
    else if ((!data.title || !data.description)) {
        res.end("You cannot save unless you provide the picture url, title and description");
        return;
    }
    //check if title contains hyphen

    data.title.indexOf('-') == -1
        //check if user is saving as anonymous
        ? verifyUser(token)
            .then(function (user) {
                const username = (user === "Anonymous" ? "Anonymous" : user.name);
                const uid = (user === "Anonymous" ? "Anonymous" : user.uid);
                mongo.SET.contentPost(data, uid, username)
                    .then(result => res.json(result))
                    .catch(err => {
                        res.end(`Couldnt post content ::: ${err}`);
                        throw err
                    })
            })
            .catch(err => {
                res.end("User token expired. Please login again")
            })
        : res.json({"hyphen": true})

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

    verifyUser(uid, "alwaysCheck", token).then(
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

    verifyUser(uid, userId, token).then(
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
        verifyUser(uid, username, token).then(
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
function getRating(uid, contentId, extra = "noExtra") {
    return new Promise(function (resolve, reject) {
        mongo.GET.ratingsForContent(uid, contentId)
            .then(result => {
                let mean = 0;
                console.log("result", result)
                if (result.length) {
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

/*
Helper function for getting number of views
*/
function getViews(uid,contentId){
    return new Promise(function (resolve, reject) {
        mongo.GET.analyticsFromContent(uid,contentId)
            .then(result => {
                // const count = result.reduce((acc, element) => {
                //   acc[element.accessUserId] = acc[element.accessUserId] ? null : 1;
                //   return acc;
                // }, Object.create(null));
                // resolve(Object.keys(count).length);
                resolve(result.length)
            })
            .catch(err => {
                reject(err)
                throw err;
            });
    })
}

function verifyUser(token) {
    return new Promise(function (resolve, reject) {
        !token  || token.length === 9
            ? resolve("Anonymous")
            : admin.auth().verifyIdToken(token)
                .then(function (decodedToken) {
                    decodedToken
                        ? resolve(decodedToken)
                        : reject()
                })
    })
}


//get mean ratings for ALL CONTENTS
const gatherRatings = async function (data) {
    const allRatingsAsync = data.map(async function (result) {
        const {uid, contentId} = result;
        console.log("DATA", data);
        return await getRating(uid, contentId)
    });
    const allRatings = await Promise.all(allRatingsAsync);
    return allRatings
};

//get mean ratings for ALL CONTENTS
const gatherViews = async function (data) {
    const allViewsAsync = data.map(async function (result) {
        const {uid,contentId} = result;
        console.log("DATA", data);
        return await getViews(uid,contentId)
    });
    const allViews = await Promise.all(allViewsAsync);
    return allViews 
};

app.listen(8080, () => console.log('Listening on port 8080'))
