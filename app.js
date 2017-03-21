'use strict'

const TOKEN_ENDPOINT = 'https://accounts.artik.cloud/token'
const ARTIK_CLOUD_ENDPOINT = 'https://api.artik.cloud/v1.1'

let reekoh = require('reekoh')
let _plugin = new reekoh.plugins.Stream()
let get = require('lodash.get')
let async = require('async')
let request = require('request')
let isEmpty = require('lodash.isempty')

let processDeviceData = (data, callback) => {
  async.each(data, (data, cb) => {
    _plugin.requestDeviceInfo(data.sdid)
      .then((deviceInfo) => {
        if (!deviceInfo) return cb(new Error(`Device ${data.sdid} is not registered.`))

        _plugin.pipe(data)
          .then(() => {
            cb()
          })
          .catch((error) => {
            cb(error)
          })
      })
      .catch((error) => {
        cb(error)
      })
  }, callback)
}

_plugin.on('sync', () => {
  let startDate = null
  let endDate = Date.now()

  _plugin.getState()
    .then((state) => {
      startDate = state.lastSyncDate
    })
    .catch((err) => {
      return _plugin.logException(err)
    })

  async.waterfall([
    (done) => {
      request.post({
        url: TOKEN_ENDPOINT,
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          'grant_type': 'client_credentials'
        },
        json: true,
        auth: {
          user: _plugin.config.clientId,
          pass: _plugin.config.clientSecret
        }
      }, (error, response, body) => {
        if (error) done(error)
        else if (body.error || response.statusCode !== 200) done(new Error(body.error.message || body.error))
        else if (isEmpty(body['access_token'])) done(new Error('Invalid Credentials. No access token was received.'))
        else done(null, body['access_token'])
      })
    },
    (token, done) => {
      let devices = []
      let hasMoreResults = true
      let offset = 0

      async.whilst(() => {
        return hasMoreResults
      }, (cb) => {
        request({
          url: `${ARTIK_CLOUD_ENDPOINT}/users/${_plugin.config.userId}/devices?offset=${100 * offset}&count=100`,
          json: true,
          auth: {
            bearer: token
          }
        }, (error, response, body) => {
          if (error) cb(error)
          else if (body.error || response.statusCode !== 200) done(new Error(body.error.message || body.error))
          else {
            let devicesTmp = get(body, 'data.devices')

            if (isEmpty(devicesTmp)) {
              hasMoreResults = false
              return cb()
            }

            offset++

            async.map(devicesTmp, (device, next) => {
              next(null, device.id)
            }, (mapError, devicesIds) => {
              devices = devices.concat(devicesIds)
              cb()
            })
          }
        })
      }, (err) => {
        done(err, token, devices)
      })
    },
    (token, devices, done) => {
      async.each(devices, (device, cb) => {
        request({
          url: `${ARTIK_CLOUD_ENDPOINT}/messages?count=100&startDate=${startDate}&endDate=${endDate}&sdid=${device}`,
          json: true,
          auth: {
            bearer: token
          }
        }, (error, response, body) => {
          if (error) cb(error)
          else if (body.error || response.statusCode !== 200) done(new Error(body.error.message || body.error))
          else {
            let data = get(body, 'data')

            if (isEmpty(data)) cb()
            else processDeviceData(data, cb)
          }
        })
      }, done)
    }
  ], (error) => {
    if (error) return _plugin.logException(error)

    _plugin.setState({lastSyncDate: endDate})
      .then(() => {
        //  do nothing
      })
      .catch((err) => {
        _plugin.logException(err)
      })
  })
})

_plugin.once('ready', () => {
  _plugin.log('Artik Stream has been initialized.')
  _plugin.emit('init')
})

module.exports = _plugin
