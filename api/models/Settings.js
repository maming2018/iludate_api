const { BaseModel } = require('./Base')
// const { Model } = require('objection')

class Settings extends BaseModel {

  static get tableName() {
    return 'settings'
  }

  static get hidden() {
    return []
  }
}

module.exports = Settings
