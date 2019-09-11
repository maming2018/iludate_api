const express = require('express')
const router = express.Router()

router.get('/brands', async (req, res, next) => {

  const { CarBrand } = req.models

  const results = await CarBrand.query().orderBy('code', 'asc')

  return res.json(results)

})

router.get('/colors', async (req, res, next) => {

  const { CarColor } = req.models

  const results = await CarColor.query().orderBy('code', 'asc')

  return res.json(results)

})

module.exports = router
