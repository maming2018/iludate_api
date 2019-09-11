const { BaseModel } = require('./Base')

class CarBrand extends BaseModel {

  static get tableName() {
    return 'car_brands'
  }
}

module.exports = CarBrand
