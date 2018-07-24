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

