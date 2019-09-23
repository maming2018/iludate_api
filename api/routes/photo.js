const multer = require('multer')
// const AWS = require('aws-sdk')
// const multerS3 = require('multer-s3')

const { APIError } = require('../modules/errors')

const path = require('path')
const fs = require('fs')
const url = require('url')

const localTestStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './uploads/profile/')
	},
	filename: function (req, file, cb) {
		// console.log("MULTER FILE");
		// console.log(file);
		var randomNum = Math.floor(Math.random() * 1000) + 999;

		cb(null, `${req.user.id}-${Date.now().toString()}-${randomNum}${path.extname(file.originalname)}`)
	}
})

const upload = multer({
	storage: localTestStorage,
	limits: {
		fileSize: 8 * 1024 * 1024
	},
	fileFilter: function (req, file, cb) {
		const ext = path.extname(file.originalname).toLowerCase()
		if (!ext.match(/\.(jpg|jpeg|png|heic|bmp)$/)) {
			return cb(new APIError(400, 'Only image files are allowed'))
		}
		cb(null, true)
	}
})

const handlePhoto = async (req, res, next) => {

	return upload.fields([{
		name: 'photo',
		maxCount: 1
	}])(req, res, (err) => {
		try {

			if (err instanceof multer.MulterError) {
				// A Multer error occurred when uploading.
				console.error(err)
				throw new APIError(400, err.message, {}, err, err)
			} else if (err) {
				// An unknown error occurred when uploading.
				throw err
			}

			next()

		} catch (err) {
			next(err)
		}
	})
}

const checkPreviousUpload = async (req, res, next) => {

	if (!req.user) {
		throw new APIError(403, 'Not authorized')
	}

	if (!req.user.photo) {
		return next()
	}

	// TODO: Rate limit: Query users where id = id, and timestamp - some time <? photoUpdate

	const location = req.user.photo
	let key = url.parse(location).pathname

	if (key.charAt(0) === '/uploads/profile/') {
		key = key.substr(1)
	}
}

module.exports = { multer: upload, handlePhoto, checkPreviousUpload }
