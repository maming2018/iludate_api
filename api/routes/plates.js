const express = require('express')
const _ = require('lodash')
const router = express.Router()
const chalk = require("chalk");
const { raw } = require('objection');

const { requireAdmin } = require('../middleware/protect')
const { APIError } = require('../modules/errors')

const validator = require('../validation/plates')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('Plate')

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.get('/:id(\\d+)', requireAdmin, crud.findById)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)
router.delete('/:id(\\d+)', requireAdmin, crud.deleteById)

router.post('/search', validator.plate, async (req, res, next) => {

    const { Match, Search, Plate, User } = req.models
    const searchRateLimit = process.env.RATE_LIMIT_SEARCH
    const myUser = req.user

    var matchedId;
    // Filters

    // NOTE: Not necessarily the best strategy. Might be better to block chat requesting instead, rather than searches

    // ? - TODO: Add to initial message
    // if (!req.user.plate) {
    // throw new APIError(400, 'Search not available', { alert: { title: 'You can\'t use search', message: 'You have to add your own plate before you can use this functionality ' } })
    // }

    if (req.body.plate == (myUser.plate && myUser.plate.value)) {
        throw new APIError(400, 'That\'s your own plate')
    }

    // TODO: Rate limit

    const searchRateCheck = await Search.query().where({ userId: myUser.id }).andWhere('created' < 'DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)').limit(searchRateLimit)

    if (searchRateCheck.length >= searchRateLimit) {

        // TODO: Notify devs

        throw new APIError(403, 'Rate limit exceeded')
    }

    console.log('search rate limit', searchRateCheck.length)

    // Check matching plate

    //let matchedPlate = await Plate.query().where({ value: req.body.plate }).whereNull('inactive').eager('user').first().orderBy('id', 'desc') // country: req.user.country
    let matchedPlate = await Plate.query().where(
        { value: req.body.plate, inactive: null }
        // raw(REPLACE(`value`,'-','')), req.body.plate
    ).eager('user').first().orderBy('id', 'desc') // country: req.user.country
    let moreResults
    var status = false;
    var alreadyMatched = false;
    if (matchedPlate) {
        var matchingData = await Match.query().where(query => query.where('plateId', matchedPlate.id).where('matcherId', myUser.id).orWhere('matchedId', myUser.id)).first().orderBy('id', 'desc')

        if ((matchingData && matchingData.matcherId == matchedPlate.user.id) || (matchingData && matchingData.matchedId == matchedPlate.user.id)) {
            status = true;
            alreadyMatched = true;
            var prevSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').where({ id: matchingData.searchId }).first().orderBy('id', 'desc')
            if (prevSearch) {
                var searchCount = prevSearch.searchcount + 1;
                await prevSearch.$query().updateAndFetch({
                    searchcount: searchCount,
                    searchdate: new Date()
                })
                searchid = prevSearch.id;
                const duplicate = !!prevSearch
                // Respond
                res.json({
                    found: status,
                    searchId: searchid,
                    alreadyMatched,
                    matchedPlate,
                    duplicate,
                    search: prevSearch
                })
            }
        } else {
            var prefrence = JSON.parse(myUser.preference);
            if (matchesPreference(matchedPlate.user, prefrence)) {
                status = true;
                //var prevSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').where({ userId: myUser.id, plate: matchedPlate.value}).orWhere({matchedUserId: myUser.id}).first().orderBy('id', 'desc')
                var prevSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').where({ userId: myUser.id, plate: matchedPlate.value }).first().orderBy('id', 'desc')
                if (prevSearch) {
                    if (prevSearch.match) {
                        alreadyMatched = true;
                        var searchCount = prevSearch.searchcount + 1;
                        await prevSearch.$query().updateAndFetch({
                            searchcount: searchCount,
                            searchdate: new Date()
                        })
                        searchid = prevSearch.id;
                        const duplicate = !!prevSearch
                        // Respond
                        res.json({
                            found: status,
                            searchId: searchid,
                            alreadyMatched,
                            matchedPlate,
                            duplicate,
                            search: prevSearch
                        })
                    } else {
                        var searchCount = prevSearch.searchcount + 1;
                        await prevSearch.$query().updateAndFetch({
                            matchedPlateId: matchedPlate && matchedPlate.id,
                            matchedUserId: matchedPlate && matchedPlate.user && matchedPlate.user.id,
                            status: status,
                            searchcount: searchCount,
                            searchdate: new Date()
                        })
                        searchid = prevSearch.id;
                        const duplicate = !!prevSearch
                        // Respond
                        res.json({
                            found: status,
                            searchId: searchid,
                            alreadyMatched,
                            matchedPlate,
                            duplicate,
                            search: prevSearch
                        })
                    }
                } else {
                    const duplicate = !!prevSearch
                    const savedSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').insertAndFetch({
                        userId: myUser.id,
                        plate: req.body.plate,
                        country: null,
                        matchedPlateId: matchedPlate && matchedPlate.id,
                        matchedUserId: matchedPlate && matchedPlate.user && matchedPlate.user.id,
                        duplicate,
                        status,
                        searchdate: new Date()
                    })

                    // Respond
                    res.json({
                        found: status,
                        searchId: savedSearch.id,
                        alreadyMatched,
                        matchedPlate,
                        duplicate,
                        search: savedSearch
                    })
                }
            } else {
                const duplicate = !!prevSearch
                status = false
                const savedSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').insertAndFetch({
                    userId: myUser.id,
                    plate: req.body.plate,
                    country: null,
                    matchedPlateId: null,
                    matchedUserId: null,
                    duplicate,
                    status,
                    searchdate: new Date()
                })

                // Respond
                res.json({
                    found: status,
                    searchId: savedSearch.id,
                    alreadyMatched,
                    matchedPlate,
                    duplicate,
                    search: savedSearch
                })
            }
        }

    } else {
        const duplicate = !!prevSearch
        const savedSearch = await Search.query().eager('[match, matchedUser, matchedPlate]').insertAndFetch({
            userId: myUser.id,
            plate: req.body.plate,
            country: null,
            matchedPlateId: matchedPlate && matchedPlate.id,
            matchedUserId: matchedPlate && matchedPlate.user && matchedPlate.user.id,
            duplicate,
            status,
            searchdate: new Date()
        })

        /*if (match) {
            await match.$query().update({ searchId: savedSearch.id })
            console.log('updated saved match with search id:', savedSearch.id)
        }*/

        // Respond
        res.json({
            found: status,
            searchId: savedSearch.id,
            alreadyMatched,
            matchedPlate,
            duplicate,
            search: savedSearch
        })
    }

})

const getTimeStampConsole = () => {
    var datetime = Date();
    console.log(chalk.magenta('=============================================================================================='));
    console.log(chalk.magenta('================= ' + datetime + ' ===================='));
    console.log(chalk.magenta('=============================================================================================='));
}

router.post('/search_normal', validator.plate, async (req, res, next) => {

    getTimeStampConsole();

    const { Match, Plate } = req.models
    const myUser = req.user

    // * Check matching plate
    let matchedPlate = await Plate.query().where(
        raw("REPLACE(`value`, '-', '')"), req.body.plate
    )
        .where('inactive', null)
        .eager('user').orderBy('id', 'desc') // country: req.user.country

    // console.log(chalk.blue("matchedPlate"))
    // console.log(matchedPlate)
    let outputResponse = [];
    if (matchedPlate) {
        matchedPlate.forEach(element => {
            // console.log("element");
            // console.log(element);

            let matchingData = Match.query()
                .where(
                    query => query.where('plateId', element.id)
                        .where('matcherId', myUser.id)
                        .orWhere('matchedId', myUser.id)
                ).first().orderBy('id', 'desc')

            if ((matchingData && matchingData.matcherId == element.user.id) || (matchingData && matchingData.matchedId == element.user.id)) {
                element.status = true;
            }
            else {
                element.status = false;
            }

            outputResponse.push(element);
        });
    }

    // console.log(chalk.blue("outputResponse"))
    // console.log(outputResponse)
    res.json(outputResponse)
})

router.post('/search_extra', async (req, res, next) => {

    getTimeStampConsole();

    const { Match, Plate } = req.models
    const myUser = req.user

    const data = _.pick(req.body, ['plate_part1', 'country_iso_code', 'car_brand_id', 'car_color_id', 'preference'])
    // console.log(data)

    // * Check matching plate
    let matchedPlate = await Plate.query().where(
        raw("REPLACE(`value`, '-', '')"), 'like', data.plate_part1 + "%"
    )
        .where('inactive', null)
        .where('country', data.country_iso_code)
        .eager('user')
        .leftJoin('users', function () {
            this.on('users.id', '=', 'plates.userId')
        })
        .where('users.car_brand_id', "=", data.car_brand_id)
        .where('users.car_color_id', "=", data.car_color_id)
        // .leftJoin('users', () => {
        //     on('plates.userId', 'users.id')
        //         .andOn('users.car_brand_id', data.car_brand_id)
        //         .andOn('users.car_color_id', data.car_color_id)
        // })
        .orderBy('id', 'desc') // country: req.user.country

    // console.log(chalk.blue("matchedPlate"))
    // console.log(matchedPlate)

    let outputResponse = [];
    if (matchedPlate) {
        matchedPlate.forEach(element => {

            // console.log("element");
            // console.log(element);

            if (matchesPreference(element.user, data.preference)) {

                let matchingData = Match.query()
                    .where(
                        query => query.where('plateId', element.id)
                            .where('matcherId', myUser.id)
                            .orWhere('matchedId', myUser.id)
                    ).first().orderBy('id', 'desc')

                if (matchingData && element.user && ((matchingData.matcherId == element.user.id) || (matchingData.matchedId == element.user.id))) {
                    element.status = true;
                }
                else {
                    element.status = false;
                }

                outputResponse.push(element);
            }
        });
    }

    // console.log(chalk.blue("outputResponse"))
    // console.log(outputResponse)
    res.json(outputResponse)
})

var matchesPreference = function (userModel, preference) {
    var result = false;

    if (!userModel) {
        return false
    }
    if (preference.genders.length > 1) {
        if (preference.age && (preference.age[0] <= userModel.age && preference.age[1] >= userModel.age)) {
            result = true;
        } else {
            //result = false;
            result = true;
        }
    } else {
        if (preference.genders && preference.genders[0] !== userModel.gender) {
            //result = false;
            result = true;
        } else {
            if (preference.age && (preference.age[0] <= userModel.age && preference.age[1] >= userModel.age)) {
                result = true;
            } else {
                //result = false;
                result = true;
            }
        }

    }

    return result
}

//update plate expiry
router.patch('/update_plate/:id(\\d+)', async (req, res, next) => {
    const { Plate } = req.models
    const plateData = req.body

    if (!req.body) {
        throw new APIError(400, 'field can not empty!')
    }

    await Plate.query().update({ expiry: plateData.expiry }).where({ id: req.params.id })

    return res.json({ success: true })
})

module.exports = router
