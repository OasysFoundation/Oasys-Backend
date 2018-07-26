
exports.readCommentsFromMongo = function (userId, contentId, slideNumber, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to db");
            findComments(userId, contentId, slideNumber, db, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};




// Write to "contents" db
exports.writeCommentToMongo = function (data, userId, contentId, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to server");
            saveComment(db, userId, contentId, data, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};
//phase out
exports.readAllCommentsFromMongo = function (userId, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to db");
            findAllComments(userId, db, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};



// saves content to "contents" db
const saveComment = function (db, userId, contentId, data, callback) {
    console.log(data);
    var time = data.time;
    var newComment = data.comment;
    var parent = data.parent;
    var slideNumber = data.slideNumber;
    var accessUser = data.accessUser;
    const collection = db.collection('comments');
    collection.insertOne({
        "contentId": contentId,
        'userId': userId,
        "accessUser": accessUser,
        "time": time,
        "comment": newComment,
        "parent": parent,
        "slideNumber": slideNumber
    }, function (err, result) {
        if (err) throw err;
        console.log(result);
        callback(result);
    });
}
// Returns full JSON of specified user id and content id
const findAllComments = function (userId, db, callback) {
    const collection = db.collection('comments');
    collection.find({'userId': userId}).toArray(function (err, result) {
        if (err) throw err;
        console.log("db response: ")
        console.log(result)
        callback(result);
    });
}
// Returns full JSON of specified user id and content id
const findComments = function (userId, contentId, slideNumber, db, callback) {
    const collection = db.collection('comments');
    collection.find({
        'contentId': contentId,
        'userId': userId,
        'slideNumber': slideNumber
    }).toArray(function (err, result) {
        if (err) throw err;
        console.log("db response: ")
        console.log(result)
        callback(result);
    });
}


// JUST FOR ME TO REMEMBER --> nothing used in the build right now
function markusDo(collection, operation, ...params) {
    //Genius
    return new Promise(function (resolve, reject) {
        const query = operation === 'find'
            ? () => collection[operation](...params).toArray()
            : () => collection[operation](...params)

        query()
            .then(resolve)
            .catch(err => {
                reject(err)
                throw err
            })
    })
}

const delayerWrap = function (queryFunc) {
    return new Promise(function (resolve, reject) {
        queryFunc()
            .then(dat => {
                console.log('HHAA', dat);
                resolve(dat)
            })
            .catch(error => {
                throw error;
                reject(error)
            })
    })
}

// /***************************
// Deleting from Mongo (helpers)
// ****************************/
// const removeDocument = function(db, mongoId, callback) {
//   const collection = db.collection('graph');
//   collection.deleteOne({"_id": ObjectId(mongoId)}, function(err, result) {
//     if (err) throw err;
//     assert.equal(err, null);
//     callback(result);
//   });
// }

async function fetchRepoInfos () {
    // load repository details for this array of repo URLs
    const repos = [
        {
            url: 'https://api.github.com/repos/fs-opensource/futureflix-starter-kit'
        },
        {
            url: 'https://api.github.com/repos/fs-opensource/android-tutorials-glide'
        }
    ]

    // map through the repo list
    const promises = repos.map(async repo => {
        // request details from GitHub’s API with Axios
        const response = await Axios({
            method: 'GET',
            url: repo.url,
            headers: {
                Accept: 'application/vnd.github.v3+json'
            }
        })

        return {
            name: response.data.full_name,
            description: response.data.description
        }
    })

    // wait until all promises resolve
    const results = await Promise.all(promises)

    // use the results
}
