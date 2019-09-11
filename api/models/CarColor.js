const { BaseModel } = require('./Base')

class CarColor extends BaseModel {

  static get tableName() {
    return 'car_color'
  }
}

module.exports = CarColor
