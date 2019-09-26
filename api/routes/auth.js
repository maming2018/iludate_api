const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt-nodejs')
const moment = require('moment')
const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer');
const Cryptr = require('cryptr');

const authValidator = require('../validation/authentication')
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const { APIError, ServerError } = require('../modules/errors')
const { requireAdmin } = require('../middleware/protect')
const { verifyToken } = require('../middleware/auth')

const authResponse = (user, extra) => {

	const userJson = user.toJSON()

	const token = signToken(user)

	const ready = user.profileReady

	return { token, user: userJson, profileReady: ready ? undefined : false, ...extra }
}

const signToken = (user) => {

	if (!user) {
		throw new APIError(401, 'Forbidden', {}, 'signToken called without user. Possible breach?')
	}

	const issuer = 'iludoapi-' + require('../../package.json').version || '1.0.0'

	user.iss = issuer

	const token = jwt.sign(JSON.stringify(user), process.env.JWT_KEY)

	return token
}
String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};
const createAccount = async (req, data) => {

	const { UserMe, Coin } = req.models

	const savedUser = await UserMe.query().insertAndFetch(data)

	const giftCoinAmount = process.env.COINS_WELCOME_GIFT

	if (giftCoinAmount && giftCoinAmount > 0) {
		await Coin.query().insertAndFetch({ userId: savedUser.id, type: 'signup-gift', value: giftCoinAmount })
	}

	console.log("SEND EMAIL AS REG IS 1")
	var smtpTransport = nodemailer.createTransport({
		host: "smtp.iludate.com",
		port: 587,
		secureConnection: false, // TLS requires secureConnection to be false
		auth: {
			user: "system@iludate.com",
			pass: "FvcyWi@3ia8pFvcyWi@3ia8p"
		},
		tls: {
			// do not fail on invalid certs
			rejectUnauthorized: false
		}
	});

	var userId = savedUser.id;

	var baseUrl = process.env.BASE_URL;
	const encryptedString = cryptr.encrypt(userId);
	var html = '<!doctype html><html> <head> <meta name="viewport" content="width=device-width" /> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /> <title>ILUDATE</title> <style> /* ------------------------------------- GLOBAL RESETS ------------------------------------- */ /*All the styling goes here*/ img { border: none; -ms-interpolation-mode: bicubic; max-width: 100%; } body { background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; } table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; } table td { font-family: sans-serif; font-size: 14px; vertical-align: top; } /* ------------------------------------- BODY & CONTAINER ------------------------------------- */ .body { background-color: #f6f6f6; width: 100%; } /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */ .container { display: block; margin: 0 auto !important; /* makes it centered */ max-width: 580px; padding: 10px; width: 580px; } /* This should also be a block element, so that it will fill 100% of the .container */ .content { box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px; } /* ------------------------------------- HEADER, FOOTER, MAIN ------------------------------------- */ .main { background: #ffffff; border-radius: 3px; width: 100%; } .wrapper { box-sizing: border-box; padding: 20px; } .content-block { padding-bottom: 10px; padding-top: 10px; } .footer { clear: both; margin-top: 10px; text-align: center; width: 100%; } .footer td, .footer p, .footer span, .footer a { color: #999999; font-size: 12px; text-align: center; } /* ------------------------------------- TYPOGRAPHY ------------------------------------- */ h1, h2, h3, h4 { color: #000000; font-family: sans-serif; font-weight: 400; line-height: 1.4; margin: 0; margin-bottom: 30px; } h1 { font-size: 35px; font-weight: 300; text-align: center; text-transform: capitalize; } p, ul, ol { font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px; } p li, ul li, ol li { list-style-position: inside; margin-left: 5px; } a { color: #3498db; text-decoration: underline; } /* ------------------------------------- BUTTONS ------------------------------------- */ .btn { box-sizing: border-box; width: 100%; } .btn > tbody > tr > td { padding-bottom: 15px; } .btn table { width: auto; } .btn table td { background-color: #ffffff; border-radius: 5px; text-align: center; } .btn a { background-color: #ffffff; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; color: #3498db; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize; } .btn-primary table td { background-color: #3498db; } .btn-primary a { background-color: #3498db; border-color: #3498db; color: #ffffff; } /* ------------------------------------- OTHER STYLES THAT MIGHT BE USEFUL ------------------------------------- */ .last { margin-bottom: 0; } .first { margin-top: 0; } .align-center { text-align: center; } .align-right { text-align: right; } .align-left { text-align: left; } .clear { clear: both; } .mt0 { margin-top: 0; } .mb0 { margin-bottom: 0; } .preheader { color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0; } .powered-by a { text-decoration: none; } hr { border: 0; border-bottom: 1px solid #f6f6f6; margin: 20px 0; } /* ------------------------------------- RESPONSIVE AND MOBILE FRIENDLY STYLES ------------------------------------- */ @media only screen and (max-width: 620px) { table[class=body] h1 { font-size: 28px !important; margin-bottom: 10px !important; } table[class=body] p, table[class=body] ul, table[class=body] ol, table[class=body] td, table[class=body] span, table[class=body] a { font-size: 16px !important; } table[class=body] .wrapper, table[class=body] .article { padding: 10px !important; } table[class=body] .content { padding: 0 !important; } table[class=body] .container { padding: 0 !important; width: 100% !important; } table[class=body] .main { border-left-width: 0 !important; border-radius: 0 !important; border-right-width: 0 !important; } table[class=body] .btn table { width: 100% !important; } table[class=body] .btn a { width: 100% !important; } table[class=body] .img-responsive { height: auto !important; max-width: 100% !important; width: auto !important; } } /* ------------------------------------- PRESERVE THESE STYLES IN THE HEAD ------------------------------------- */ @media all { .ExternalClass { width: 100%; } .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; } .apple-link a { color: inherit !important; font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; text-decoration: none !important; } #MessageViewBody a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; } .btn-primary table td:hover { background-color: #34495e !important; } .btn-primary a:hover { background-color: #34495e !important; border-color: #34495e !important; } } </style> </head> <body class=""> <span class="preheader">This is preheader text. Some clients will show this text as a preview.</span> <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body"> <tr> <td>&nbsp;</td> <td class="container"> <div class="content"> <!-- START CENTERED WHITE CONTAINER --> <table role="presentation" class="main"> <!-- START MAIN CONTENT AREA --> <tr> <td class="wrapper"> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td> <p>Du hast es fast geschafft !! </p> <p>Du hast deine E-Mail-Adresse bei der Registrierung von Iludate angeben oder in den Einstellungen geändert. Bestätige bitte jetzt deine E-Mail-Adresse mit nur einem Klick:</p> <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary"> <tbody> <tr> <td align="left"> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tbody> <tr> <td> <a href="{RESET_URL}" target="_blank">Klicke hier, um deine E-Mail-Adresse zu bestätigen!</a> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table>  </td> </tr> </table> </td> </tr> <!-- END MAIN CONTENT AREA --> </table> <!-- END CENTERED WHITE CONTAINER --> <!-- START FOOTER --> <div class="footer"> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td class="content-block"> <span class="apple-link">Du erhältst diese E-Mail als registriertes Mitglied von ILUDATE. Wenn du keine neuen Nachrichten mehr von uns erhalten möchtest, dann melde dich über folgenden Link ab: <a href="http://i.imgur.com/CScmqnj.gif">Unsubscribe</a>. </td> </tr> <tr> <td class="content-block powered-by"> ILudate ist eine Marke der Iludate GmbH ,Irnkofen 3b , 93089 Aufhausen - Deutschland<br/> Geschäftsführer: XXXXXXXXXXXXXXXXXXXXXXXX<br/>Antworten auf deine Fragen erhältst du unter support@iludate.com.<br/> </td> </tr> </table> </div> <!-- END FOOTER --> </div> </td> <td>&nbsp;</td> </tr> </table> </body></html>';
	html = html.replaceAll("{RESET_URL}",baseUrl + 'api/v1/auth/emailconfirmation/token/' + encryptedString)
	var mailOptions = {
		from: 'system@iludate.com', // Sender address
		to: data.email,         // List of recipients
		subject: 'Verify account',
//		html: '<h3>Hello. Thanks for registration.</h3><p>Please confirm your account by clicking this button.</p><a href="' + baseUrl + 'api/v1/auth/emailconfirmation/token/' + encryptedString + '" style="background-color: #008CBA;border: none;padding:5px;color: white;text-align: center; text-decoration: none;display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">Confirm</a><p>If the button is not working, please copy and paste this link into browser.<a href="' + baseUrl + 'api/v1/auth/emailconfirmation/token/' + encryptedString + '">' + baseUrl + 'api/v1/auth/emailconfirmation/token/' + encryptedString + '</a></p>',
		html : html,
	}

	smtpTransport.sendMail(mailOptions, function (err, info) {
		if (err) {
			console.log(err)
		} else {
			console.log(info);
		}
	});

	return authResponse(savedUser, { signup: true, gift: true })
}

router.post('/email', authValidator.email, async (req, res, next) => {

	const { UserMe, Coin, Settings } = req.models
	const { email, password, last_imei, last_ip_address } = req.body

	const user = await UserMe.query().where({ email }).first()

	if (!user) {
		throw new APIError(404, 'Email not registered')
	}

	if (!user.password/* || user.type !== 'email' */) {
		throw new APIError(403, 'Try a different login method', { alert: { title: 'Try a different login method', message: 'You signed up using Facebook or Google' } })
	}

	const granted = await new Promise((resolve, reject) => {
		bcrypt.compare(password, user.password, (err, granted) => {
			if (err) return reject(new ServerError(`bcrypt error: ${err}`, err))
			return resolve(granted)
		})
	})

	if (!granted) {
		throw new APIError(401, 'Password doesn\'t match')
	}

	// console.log("USER IS LOGGED IN - OK");
	var todayDate = new Date().toISOString().slice(0, 10);
	// console.log(todayDate);
	// return false;
	const todayLoginCount = await Coin.query().where({ userId: user.id }).whereRaw('DATE(`created`) = "' + todayDate + '"').count('* as count').first()
	const isDailyBonusApplicable = todayLoginCount.count === 0

	console.log('isDailyBonusApplicable: ', isDailyBonusApplicable)

	if (isDailyBonusApplicable) {
		const dailyBonusCoin = await Settings.query().findById(1);
		// console.log('dailyBonusCoin', dailyBonusCoin.value)
		const data = { userId: user.id, value: dailyBonusCoin.value, type: 'daily-bonus' };
		// console.log('data: ', data)
		await Coin.query().insertAndFetch(data)
	}

	const updateData = await UserMe.query().where({ id: user.id }).update({ last_imei: last_imei, last_ip_address: last_ip_address })

	if (!updateData) {
		throw new APIError(503, 'Something went wrong on updating data!')
	}

	return res.json(authResponse(user))
})

// TODO: Validation, sanitation
router.post('/signup', authValidator.email, async (req, res, next) => {

	const { User } = req.models
	const { email, password, registration_ip_address, imei_registration } = req.body


	const existingUser = await User.query().where({ email }).first().count('* as count')
	const alreadyRegistered = !!existingUser.count

	if (alreadyRegistered) {
		throw new APIError(409, 'This email is already registered')
	}

	const pwdHash = await new Promise((resolve, reject) => {
		bcrypt.hash(password, null, null, (err, hash) => {
			if (err) return reject(new ServerError(`bcrypt error: ${err}`, err, {}))
			else return resolve(hash)
		})
	})

	return res.json(await createAccount(req, {
		...req.body, email, password: pwdHash
		, registration_ip_address, imei_registration, location: null
	}))
})

// Mark: - Facebook login

const { FB } = require('fb')

router.post('/facebook', async (req, res, next) => {

	const { UserMe } = req.models
	const { accessToken } = req.body

	if (!accessToken) {
		throw new APIError(400, 'Bad Request')
	}

	const fbProfile = await FB.api('me', { fields: 'id,first_name,last_name,picture,email' /* + ',birthday,gender' */, access_token: accessToken })

	if (!fbProfile) {
		throw new APIError(400, 'Bad Request')
	}

	const existingUser = await UserMe.query().where({ facebookId: fbProfile.id }).orWhere({ email: fbProfile.email }).first()

	const alreadyRegistered = !!existingUser

	const photo = `https://graph.facebook.com/${fbProfile.id}/picture?type=large`
	// const { gender } = fbProfile
	// const birthday = moment(fbProfile.birthday, 'MM/DD/YYYY').format('YYYY-MM-DD')

	if (alreadyRegistered) {

		const update = { facebookId: fbProfile.id }

		if (!existingUser.photoUpdate) {
			update.photo = photo
		}

		await existingUser.$query().updateAndFetch(update)

		// existingUser.birthday = birthday
		// existingUser.gender = gender

		return res.json(authResponse(existingUser))

	} else {
		return res.json(await createAccount(req, { facebookId: fbProfile.id, firstName: fbProfile.first_name, lastName: fbProfile.last_name, photo, /* birthday, gender, */ location: null }))
	}

})

// Mark: - Google login

const { google } = require('googleapis')

const oauth2Client = new google.auth.OAuth2({
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET
})

router.post('/google', async (req, res, next) => {

	const { UserMe } = req.models
	const { code } = req.body

	if (!code) {
		throw new APIError(400, 'Bad Request')
	}

	const { tokens } = await oauth2Client.getToken(code)
	oauth2Client.setCredentials(tokens)

	const peopleAPI = google.people({
		version: 'v1',
		auth: oauth2Client
	})

	const response = (await peopleAPI.people.get({
		resourceName: 'people/me',
		personFields: 'emailAddresses,names,photos,genders,birthdays'
	})).data

	if (!response) {
		throw new APIError(500, 'Couldn\'t get Google profile. Try another login method')
	}

	const tokenData = jwt.decode(tokens.id_token)

	const profile = {
		googleId: tokenData.sub,
		firstName: (tokenData.given_name || (response.names.find(n => n.metadata.primary) || response.names[0]).givenName),
		lastName: (tokenData.family_name || (response.names.find(n => n.metadata.primary) || response.names[0]).familyName),
		photo: (tokenData.picture || (response.photos.find(n => n.metadata.primary) || response.photos[0]).url).replace('/s96-c/', '/s500/').replace('/s100/', '/s500/').replace('?sz=50', ''),
		email: (tokenData.email || (response.emailAddresses.find(n => n.metadata.primary) || response.emailAddresses[0]).value)
	}

	try {
		profile.birthday = response.birthdays && response.birthdays.find(n => n.date.year && n.date.month && n.date.day).date
		profile.birthday = profile.birthday && moment(`${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`, 'YYYY-M-D').format('YYYY-MM-DD')
	} catch (e) { console.log('birthday parse err', e) }

	try {
		profile.gender = response.genders && (response.genders.find(n => n.metadata.primary) || response.genders[0]).value
	} catch (e) { console.log('gender parse err', e) }

	const existingUser = await UserMe.query().where({ googleId: profile.googleId }).orWhere({ email: profile.email }).first()

	const alreadyRegistered = !!existingUser

	if (alreadyRegistered) {

		const update = { googleId: profile.googleId }

		if (!existingUser.photoUpdate) {
			update.photo = profile.photo
		}

		await existingUser.$query().updateAndFetch(update)

		existingUser.birthday = existingUser.birthday || profile.birthday
		existingUser.gender = existingUser.gender || profile.gender

		return res.json(authResponse(existingUser))

	} else {
		return res.json(await createAccount(req, { ...profile, location: null }))
	}

})

// Update user to confirmed state
router.get('/emailconfirmation/token/:id', async (req, res, next) => {

	res.set('Content-Type', 'text/html');
	const { User } = req.models

	var token = req.params.id;
	var decryptedId;

	try {
		decryptedId = cryptr.decrypt(token);
	} catch (e) {
		res.send(new Buffer.from('<h2>User not found e</h2>'));
		return res;
	}
	// console.log(req.params.id);
	// console.log(decryptedId);

	const user = await User.query().where({ id: decryptedId }).first()

	if (!user) {
		res.send(new Buffer.from('<h2>User not found</h2>'));
		return res;
		// throw new APIError(404, 'User not found')
	}

	const updateData = await user.$query().update({ active: true });

	if (!updateData) {
		res.send(new Buffer.from('<h2>Something went wrong on updating data!</h2>'));
		return res;
		// throw new APIError(503, 'Something went wrong on updating data!')
	}

	res.set('Content-Type', 'text/html');
	res.send(new Buffer.from('<h2>You are verified now.</h2>'));
	return res;
})

// MARK: - Admin only

router.get('/token/:id(\\d+)/', verifyToken, requireAdmin, async (req, res, next) => {

	const { User } = req.models

	const user = await User.query().where({ id: req.params.id }).first()

	if (!user) {
		throw new APIError(404, 'User not found')
	}

	return res.json({ user, token: signToken(user) })
})

module.exports = router
