
/***************************************************************
Module for Connecting, Reading, Writing, and Deleting from Mongo
***************************************************************/
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const f = require('util').format;
const assert = require('assert');
const user = encodeURIComponent(process.env.USER_ID);
const password = encodeURIComponent(process.env.PASSWORD);
const authMechanism = 'DEFAULT';
const url = f('mongodb://%s:%s@localhost:27017/oasysTest?authMechanism=%s',
  user, password, authMechanism);

var exports = module.exports = {};

/***************************
Reading from Mongo (helper functions)
***************************/


// Gets profile data from "users" db 
const getProfileData = function(db, userId, callback) {
  const collection = db.collection('users');
  collection.find({'UID': userId}).toArray(function(err, docs) {
    if (err) throw err;
    callback(docs);
  });    
};

// Uploads picture to "users" db 
const newPicture = function(db, userId, newUrl, callback) {
  const collection = db.collection('users');
  collection.update({"UID": userId}, { $set: { "PIC" : newUrl } }, {"upsert": true}, function(err, result) {
    if (err) throw err;
    else{
      console.log("Update successful");
      callback(result);
    }
  });      
};

const newTitlePic = function(db, userId, contentId, newUrl, callback) {
  const collection = db.collection('contents');
  console.log("BOUT TO UPDATE");

  collection.update({"contentId": contentId, "userId":userId}, { $set: { "picture" : newUrl } }, {"upsert": true}, function(err, result) {
    if (err) {
      console.log(err);
      throw err;
    }
    else{
      console.log("Update successful");
      callback(result);
    }
  });     
};

// Uploads username to "users" db 
const newUsername = function(db, userId, username, callback) {
  const collection = db.collection('users');
  collection.find({'NAME': username}).toArray(function(err, docs) {
    if (err) throw err;
    
    if(docs.length>0) {
      console.log("my docs");
      console.log(docs);
      callback();
    }
    else{
      collection.insertOne({"UID": userId, 'NAME': username, "PIC": ''}, function(err, result) {
        if (err) throw err;
        console.log(result);
        callback(result);
      });  
    }
  });  
};


// Returns picture, title, description, tags, and url from "contents" db with published flag
const getPreview = function(db, callback) {
  const collection = db.collection('contents');
  collection.find({'published': 1}).toArray(function(err, result) {
      if (err) throw err;
      console.log("db response: ")
      console.log(result)
      callback(result);
    });
}

// Returns full JSON of specified user id and content id
const findContent = function(userId, contentId, db, callback) {
  const collection = db.collection('contents');
  collection.find({'userId': userId , 'contentId': contentId}).toArray(function(err, result) {
      if (err) throw err;
      console.log("db response: ")
      console.log(result)
      callback(result);
    });
}

// Returns full JSON of specified user id and content id
const findComments = function(userId, contentId, db, callback) {
  const collection = db.collection('comments');
  collection.find({'contentId': contentId}).toArray(function(err, result) {
      if (err) throw err;
      console.log("db response: ")
      console.log(result)
      callback(result);
    });
}



// Returns all ratings for given content Id
const findRating = function(db, userId, contentId, callback) {
  const collection = db.collection('ratings');
  collection.find({'userId': userId ,'contentId': contentId}).toArray(function(err, result) {
    if (err) throw err;
    console.log(result)
    callback(result);
  });
}

// writes rating to ratings db
const writeRating = function(db, userId, contentId, rating, callback) {
  const collection = db.collection('ratings');
  rating = parseInt(rating);
  collection.insertOne({"contentId": contentId, 'userId': userId, "rating": rating}, function(err, result) {
    if (err) throw err;
    console.log(result);
    callback(result);
  });  
}

// saves content to "contents" db
const saveContent = function(db, userId, contentId, data, callback) {
  console.log(data);
  newData = data.data;
  const collection = db.collection('contents');
  collection.update({"contentId": contentId}, {"userid":userId}, { $set: { "data" : newData } }, {"upsert": true}, function(err, result) {
    if (err) throw err;
    else{
      console.log("Update successful");
      callback(result);
    }
  });  
}

// saves content to "contents" db
const saveComment = function(db, userId, contentId, data, callback) {
  console.log(data);
  var time = data.time;
  var newComment = data.comment;
  var parent = data.parent;
  const collection = db.collection('comments');
  collection.insertOne({"contentId": contentId, 'userId': userId, "time": time, "comment":newComment, "parent": parent}, function(err, result) {
    if (err) throw err;
    console.log(result);
    callback(result);
  });  
}

// saves content including title,picture,url etc. and publishes content so preview mode can grab it
const publishContent = function(db, userId, contentId, data, callback) {
  console.log(data);
  newData = data.data;
  title = data.title;
  picture = data.picture;
  published = data.published;
  description = data.description;
  tags = data.tags;

  const collection = db.collection('contents');
  collection.update({"contentId": contentId, "userId": userId}, { $set: { "data" : newData, "title": title, "picture": picture, "description" : description, "published" : published, "tags":tags} }, {"upsert": true}, function(err, result) {
    if (err) throw err;
    else{
      console.log("Update successful");
      callback(result);
    }
  });  
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


// Write to "contents" db
exports.writeContentToMongo = function(status, data, userId, contentId, callback) {
  if (status == "save"){
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      else {
        console.log("Connected successfully to server");
        saveContent(db, userId, contentId, data, function(result,err) {
          if (err) throw err;
           db.close();
           callback(result);
          });
      }
    });
  }
  else{
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      else {
        console.log("Connected successfully to server");
        publishContent(db, userId, contentId, data, function(result,err) {
          if (err) throw err;
           db.close();
           callback(result);
          });
      }
    });

  }
};

// Write to "contents" db
exports.writeCommentToMongo = function(data, userId, contentId, callback) {
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      else {
        console.log("Connected successfully to server");
        saveComment(db, userId, contentId, data, function(result,err) {
          if (err) throw err;
           db.close();
           callback(result);
          });
      }
    });
};


// Write to "ratings" db
exports.WriteRatingToMongo = function(userId, contentId, rating, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else {
      console.log("Connected successfully to server");
      writeRating(db, userId, contentId, rating, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};


// Reads from "contents" db
exports.readPreviewFromMongo = function(callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else {   
      console.log("Connected successfully to db");
      getPreview(db, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

// Reads from "contents" db
exports.readContentFromMongo = function(userId, contentId, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else {   
      console.log("Connected successfully to db");
      findContent(userId, contentId, db, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

exports.readCommentsFromMongo = function(userId, contentId, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else {   
      console.log("Connected successfully to db");
      findComments(userId, contentId, db, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

//Reads from "ratings" db
exports.readRatingFromMongo = function(userId, contentId, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else{
      console.log("Connected successfully to server");
      findRating(db, userId, contentId, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

exports.uploadUsername = function(userId, username, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else{
      console.log("Connected successfully to server");
      newUsername(db, userId, username, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

exports.uploadPicture = function(userId, newUrl, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else{
      console.log("Connected successfully to server");
      newPicture(db, userId, newUrl, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

exports.uploadTitlePicture = function(userId, contentId, newUrl, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else{
      console.log("Connected successfully to server");
      newTitlePic(db, userId, contentId, newUrl, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};

exports.getProfile = function(userId, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    else{
      console.log("Connected successfully to server");
      getProfileData(db, userId, function(result,err) {
        if (err) throw err;
        db.close();
        callback(result);
        });
    }
  });
};