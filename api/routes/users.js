const express = require('express')
const router = express.Router()
const moment = require('moment')
const knex = require('../config/database')
const _ = require('lodash')
const nodemailer = require('nodemailer');
const fs = require('fs');
const Cryptr = require('cryptr');
const Jimp = require('jimp');

const { raw } = require('objection');

const { requireAdmin } = require('../middleware/protect')
const { checkRecipient, requireCompleteProfile, requireMatch } = require('../middleware/users')
const { APIError } = require('../modules/errors')
const NotificationServices = require('../services/notifications')

const userValidator = require('../validation/users')
const plateValidator = require('../validation/plates')

const photoController = require('./photo')
const recentsController = require('../controllers/recents')
const chatController = require('../controllers/chat')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('User'/*, 'plate' */)

const cryptr = new Cryptr(process.env.CRYPTR_KEY);

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)
router.delete('/:id(\\d+)', requireAdmin, crud.deleteById)

// Get user privacy mode by id
router.get('/:id(\\d+)/privacy-modes', async (req, res, next) => {

	const { User } = req.models

	const result = await User.query().findById(req.params.id)

	const output = {
		standard_privacy: result.standard_privacy,
		instant_privacy: result.instant_privacy,
		data_request_privacy: result.data_request_privacy
	}

	return res.json(output)
})

// Get user by id
router.get('/:id(\\d+)', checkRecipient, requireMatch, async (req, res, next) => {

	const { User } = req.models

	const result = await User.query().findById(req.params.id)

	return res.json({ ...result.toJSON(), match: req.match })
})



// Get my user

router.get('/me', requireCompleteProfile, async (req, res, next) => {

	// const { User } = req.models

	// const me = await User.query().findById(req.user.id).eager('coinList')

	return res.json(req.user)

})

// Patch my user
// ALTER TABLE `users` ADD `introduce` VARCHAR(255) NOT NULL AFTER `other_photos`;
router.patch('/me', async (req, res, next) => {

	const { Invite } = req.models

	const data = _.pick(req.body, ['firstName', 'lastName', 'gender', 'birthday', 'preference', 'car_brand_id', 'car_color_id', 'res_current_city', 'res_current_country_id', 'res_from_city', 'res_from_country_id', 'hobbies', 'job', 'introduce', 'instant_visible'])

	// Birthday check

	if (data.birthday) {
		const diff = moment().diff(data.birthday, 'years', false)

		if (diff < 18) {
			throw new APIError(400, 'You must be 18 years old or older to sign up', { title: 'Can\'t sign up' })
		}
	}

	// Preference set

	if (data.preference) {
		if (!data.preference.genders ||
			!Array.isArray(data.preference.genders) ||
			data.preference.genders.length === 0
		) {
			throw new APIError(400, 'Bad request anku')
		}

		const parseAge = (age) => Math.max(18, Math.min(75, parseInt(age)))

		const preference = {
			age: [parseAge(data.preference.age[0] || 30), parseAge(data.preference.age[1] || 50)],
			genders: data.preference.genders.filter(el => ['male', 'female', 'other'].includes(el)).unique()
		}

		if (preference.age[0] >= preference.age[1]) {
			throw new APIError(400, 'Bad request')
		}

		// console.log(preference)

		data.preference = preference
	}

	// Update row

	if (!_.isEmpty(data)) {
		req.user = await req.user.$query().updateAndFetch(data)
	}



	// Invite codes

	const { firstName, invite } = req.user

	if (firstName && !invite) {
		// User has no invite entry yet
		const code = req.user.generateInviteCode()
		req.user.invite = await Invite.query().insertAndFetch({ userId: req.user.id, inviteCode: code })
	}

	return res.json(req.user)
})

// Upload photo

//router.patch('/me/photo', photoController.checkPreviousUpload, photoController.handlePhoto, async (req, res, next) => {
router.patch('/me/photo', photoController.handlePhoto, async (req, res, next) => {

	console.log('received photo');
	console.log(req.files)

	// console.log("req.user.other_photos----------")
	// console.log("-" + req.user.other_photos + "-");
	// console.log("req.user.other_photos----------")

	var error = true;
	var avatar = "";
	if (req.user.other_photos === "") {
		var other_photos = [];
	} else {
		var other_photos = JSON.parse(req.user.other_photos);
	}
	for (var key in req.files) {
		// console.log("KEY:", key, req.files[key][0].path);
		/*	if (req.files[key][0].path) {
				error = false;
				if (req.files[key][0].fieldname == "photo1") {
					avatar = req.files[key][0].path
				} else {
					other_photos.push(req.files[key][0].path)
				}
			}*/

		var image_path = req.files["photo"][0].path;
		console.log(image_path)

		// sharp(image_path).resize(300, 200).toBuffer(function (err, buffer) {
		// 	fs.writeFile(image_path, buffer, function (e) {
		// 		console.log("Image resized succeed")
		// 	});
		// });

		Jimp.read(image_path, (err, image) => {
			if (err) throw err;

			var w = image.bitmap.width; //  width of the image
			var h = image.bitmap.height; // height of the image
			console.log("width:", image.bitmap.width)
			console.log("height:", image.bitmap.height)

			newResize = resize_image(w, h)

			image
				.resize(newResize.width, newResize.height) // resize
				.write(image_path); // save
		});

		if (req.body.index == "1") {
			avatar = req.files["photo"][0].path;
			error = false;
		}
		else {
			var obj = { index: req.body.index, url: req.files["photo"][0].path };

			for (var i = 0; i < other_photos.length; i++) {
				if (other_photos[i].index == req.body.index) {
					other_photos.splice(i, 1);
				}
			}
			other_photos.push(obj);
			error = false;
		}
		break;
	}

	// console.log(avatar);
	// console.log(other_photos);

	// if (!req.file || !req.file.path) {
	if (error === true) {
		throw new APIError(400, 'Upload error')
	}

	// const url = req.file.path;

	// console.log(req.files);
	var updateData = {};
	var otherFiles = JSON.stringify(other_photos);
	if (avatar != "") {
		updateData = { photo: avatar, photoUpdate: knex.fn.now() };

	} else {
		if (other_photos.length > 0) {
			updateData = { other_photos: JSON.stringify(other_photos) };
		}
		else {
			updateData = {};
		}
	}

	// await req.user.$query().update({ photo: avatar, photoUpdate: knex.fn.now() })
	// await req.user.$query().update({ other_photos: otherFiles })
	await req.user.$query().update(updateData)

	var obj = JSON.parse(req.user.other_photos);

	return res.json({ avatar: req.user.photo, other_photos: obj })
})


const resize_image = (width, height) => {
	var maxWidth = 800;           // Max width for the image
	var maxHeight = 600;          // Max height for the image
	var ratio = 0;                // Used for aspect ratio

	// If the current width is larger than the max, scale height
	// to ratio of max width to current and then set width to max.
	if (width > maxWidth) {
		// console.log("Shrinking width (and scaling height)")
		ratio = maxWidth / width;
		height = height * ratio;
		width = maxWidth;
		// console.log("new dimensions: " + width + "x" + height);
	}

	// If the current height is larger than the max, scale width
	// to ratio of max height to current and then set height to max.
	if (height > maxHeight) {
		// console.log("Shrinking height (and scaling width)")
		ratio = maxHeight / height;
		width = width * ratio;
		height = maxHeight;
		// console.log("new dimensions: " + width + "x" + height);
	}
	return { width: width, height: height }
}

// TODO: Delete my user

router.delete('/me', async (req, res, next) => {

	const success = await req.user.$query().delete()

	return res.json({ success: !!success })
})

// Get my plate

router.get('/me/plate', async (req, res, next) => {

	const { Plate } = req.models

	const plate = await Plate.query().where({ userId: req.user.id }).first()

	return res.json(plate)
})

// Add my plate

// TODO: Plate date validation
router.put('/me/plate', plateValidator.put, async (req, res, next) => {

	const { Plate } = req.models

	//const plate = await Plate.query().where({ userId: req.user.id }).orWhere({ value: req.body.plate }).first()
	const plate = await Plate.query().where({ value: req.body.plate }).first()

	if (plate) {
		// eslint-disable-next-line eqeqeq
		/*if (plate.userId == req.user.id) {
				throw new APIError(403, 'You\'ve already set up your plate', { alert: { title: 'You\'ve already set up your plate', message: 'Remove it before you try adding a new one' } })
		} else {*/
		throw new APIError(403, 'This plate is already registered', { alert: { title: 'This plate is already registered', message: 'If this wasn\'t done by you, make sure you contact our support: contact@iludoapp.com' } })
		/*}*/
	}

	// Temp?: Deactivate old plates
	await Plate.query().where({ userId: req.user.id }).update({ inactive: 1 })

	const savedPlate = await Plate.query().insertAndFetch({ userId: req.user.id, expiry: req.body.expiry, temporary: req.body.temporary, country: req.body.country, value: req.body.plate })

	return res.json(savedPlate)
})

// Remove my plate

router.delete('/me/plate', async (req, res, next) => {

	const { Plate } = req.models

	// const plate = await Plate.query().where({ userId: req.user.id }).wh.first()
	const plate = req.user.plate

	if (!plate) {
		throw new APIError(404, 'You don\'t have a plate set up yet')
	}

	const success = await plate.$query().delete()

	return res.json({ success: !!success })
})

// Get my invite code

router.get('/me/invite', async (req, res, next) => {

	const { Invite, Coin } = req.models

	return res.json(req.user.invite)
})

// Get user is confirmed or not

router.get('/me/active', async (req, res, next) => {

	const response = { 'active': req.user.active };

	return res.json(response)
})


// Get user privacy modes

router.get('/me/privacy-modes', async (req, res, next) => {

	const response = {
		standard_privacy: req.user.standard_privacy,
		instant_privacy: req.user.instant_privacy,
		data_request_privacy: req.user.data_request_privacy
	}

	return res.json(response)
})

// Update user privacy modes
router.patch('/me/privacy-modes', async (req, res, next) => {

	const myUser = req.user

	const data = _.pick(req.body, ['standard_privacy', 'instant_privacy', 'data_request_privacy'])
	console.log(data);

	if (!data.standard_privacy || data.standard_privacy !== 1) {
		data.standard_privacy = false;
	} else {
		data.standard_privacy = true;
	}

	if (!data.instant_privacy || data.instant_privacy !== 1) {
		data.instant_privacy = false;
	} else {
		data.instant_privacy = true;
	}

	if (!data.data_request_privacy || data.data_request_privacy !== 1) {
		data.data_request_privacy = false;
	} else {
		data.data_request_privacy = true;
	}

	const updateData = await myUser.$query().update(data)

	if (!updateData) {
		throw new APIError(503, 'Something went wrong on updating data!')
	}

	const response = {
		standard_privacy: data.standard_privacy,
		instant_privacy: data.instant_privacy,
		data_request_privacy: data.data_request_privacy
	}

	return res.json(response)
})

router.get('/near-by-users', async (req, res, next) => {
	// console.log("NEAR BY USERS");

	const { User,Settings } = req.models
	const data = _.pick(req.body, ['latitude', 'longitude'])
	// console.log("data")
	// console.log(data)
	const max_distance = await Settings.query().findById(2);

	const distanceInMilesSql = `( 6371 * acos( cos( radians(${data.latitude}) ) 
          * cos( radians( location_latitude ) ) 
          * cos( radians( location_longitude ) - radians(${data.longitude}) ) 
          + sin( radians(${data.latitude}) ) 
          * sin( radians( location_latitude ) ) ) ) AS distance 
				`;

	const users = await User.query().select(['*', raw(distanceInMilesSql)]).whereNotNull('location_latitude').whereNotNull('location_longitude').having('distance', '<', max_distance.value)
	// console.log(users);

	return res.json(users)
})

// Update user Location
//ALTER TABLE `users` ADD `location_latitude` DOUBLE NULL AFTER `location`, ADD `location_longitude` DOUBLE NULL AFTER `location_latitude`;

router.patch('/me/location', async (req, res, next) => {

	const myUser = req.user
	const body = _.pick(req.body, ['latitude', 'longitude'])

	const data = {
		location_latitude: body.latitude,
		location_longitude: body.longitude
	}

	const updateData = await myUser.$query().update(data)

	if (!updateData) {
		throw new APIError(503, 'Something went wrong on updating data!')
	}

	return res.json(data)
})


// Redeem invite code
router.post('/me/invite', async (req, res, next) => {

	const { Invite, Coin } = req.models

	const { code } = _.pick(req.body, ['code'])
	const { user } = req

	// Check if already has a code set

	if (user.invitedBy) {
		throw new APIError(403, 'You\'re already invited by someone')
	}

	// Check if code exists.
	const check = await Invite.query().where({ inviteCode: code }).first()
	// ~ Bad naming: invite row of requested code. Includes the user whom the code belongs to (check.userId)

	if (!check) {
		throw new APIError(404, 'Invite code not found')
	}

	// Check if user has their own invite entry / profile set up

	if (!user.invite) {
		throw new APIError(406, 'Finish setting up your profile before redeeming an invite code')
	}

	await user.invite.$query().updateAndFetch({ inviterId: check.userId, redeemedCode: check.inviteCode })

	// Gift both parties coins!

	const invitedCoinAmount = process.env.COINS_INVITED
	const inviterCoinAmount = process.env.COINS_INVITER

	await Coin.query().insertAndFetch({ userId: user.id, type: 'invited', value: invitedCoinAmount, data: JSON.stringify({ invitedBy: check.userId, code: check.inviteCode }) })
	await Coin.query().insertAndFetch({ userId: check.userId, type: 'inviter', value: inviterCoinAmount, data: JSON.stringify({ invited: user.id }) })

	return res.json(user.invite)
})

// Add push notification device

router.post('/me/devices', async (req, res, next) => {

	const { Device } = req.models
	const token = req.body.token

	const duplicateCheck = await Device.query().where({ token }).first()

	if (!duplicateCheck) {
		await Device.query().insert({ userId: req.user.id, token, client: req.headers['x-iludo-client'], type: 'ios' })
	}

	return res.json({ success: true })
})

// Chats

router.get('/me/chats', async (req, res, next) => {
	return res.json(await chatController.grouped(req))
})

// Recent searches, matches

router.use('/me/recents', async (req, res, next) => {
	return res.json(await recentsController.get(req))
})

// Home screen Overview
// TODO: performance => not separated transactions, proper use of objection.js should save a ton of performance

router.get('/me/overview', requireCompleteProfile, async (req, res, next) => {

	return res.json({
		unknownMatches: await recentsController.unknownMatches(req),
		user: req.user,
		recents: await recentsController.get(req)
		//chats: await chatController.grouped(req)
	})

})

// [Admin] Send push notification to user
router.post('/:id(\\d+)/push', requireAdmin, async (req, res, next) => {

	const { Device } = req.models
	const userId = req.params.id

	const payload = req.body.notification

	if (!payload) {
		throw new APIError(403, 'Invalid push body')
	}

	const devices = await Device.query().where({ userId })

	if (!devices || devices.length === 0) {
		throw new APIError(404, 'No devices')
	}

	const results = await NotificationServices.send(devices, payload)

	return res.json(results)
})

module.exports = router

// eslint-disable-next-line no-extend-native
Array.prototype.unique = function () {
	return this.filter((elem, pos, arr) => {
		return arr.indexOf(elem) === pos
	})
}
