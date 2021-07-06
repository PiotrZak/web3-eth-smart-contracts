'use strict';

module.exports = function(Fileinfo) {
    /**
     * Add file to database
     * @param {object} file Object with file data and params to add
     * @param {Function(Error, object)} callback
     */

    Fileinfo.addFile = function (options, file, callback) {
        Fileinfo.app.models.user.findOne({ where: { uid: options.uid } }, (err, user) => {
            if(err) {
                callback(err)
                return
            }
            if(!user) {
                callback(null, {status: -1, message: "Not found user"})
                return
            } else {
                user.updateAttributes({ kyc_status: "PENDING" })
                file.user_id = user.id
                Fileinfo.create(file, err => {
                    if(err) {
                        callback(err)
                        return
                    }
                    callback(null, { status: 1 })
                })
            }
        })
    };
};
