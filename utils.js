


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

