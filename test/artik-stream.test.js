'use strict'

const amqp = require('amqplib')

let _channel = null
let _conn = null
let app = null

describe('Artik Stream Test', () => {
  before('init', () => {
    process.env.ACCOUNT = 'adinglasan'
    process.env.CONFIG = JSON.stringify({
      clientId: 'b13c60dd1f264224a34d1e9c3d44ec27',
      clientSecret: '7c08cea3447442acb7bef36dcdb99fb6',
      userId: 'a103bd5381bc4d18b8dee8a728a5e0a2'
    })
    process.env.OUTPUT_PIPES = 'op.artik1, op.artik2'
    process.env.PLUGIN_ID = 'artik.stream'
    process.env.COMMAND_RELAYS = 'cr1, cr2'
    process.env.LOGGERS = 'logger1, logger2'
    process.env.EXCEPTION_LOGGERS = 'ex.logger1, ex.logger2'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('close connection', function (done) {
    _conn.close()
    done()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      app = require('../app')
      app.once('init', done)
    })
  })

  describe('#sync', () => {
    it('should sync latest data of every device', function (done) {
      done()
    })
  })
})

// 'use strict';
//
// var cp     = require('child_process'),
// 	assert = require('assert'),
// 	artikStream;
//
// describe('Stream', function () {
// 	this.slow(5000);
//
// 	after('terminate child process', function (done) {
// 		console.log('Running after');
// 		this.timeout(20000);
//
// 		setTimeout(() => {
// 			console.log('Killing...');
// 			artikStream.kill('SIGKILL');
// 			done();
// 		}, 19000);
// 	});
//
// 	describe('#spawn', function () {
// 		it('should spawn a child process', function () {
// 			assert.ok(artikStream = cp.fork(process.cwd()), 'Child process not spawned.');
// 		});
// 	});
//
// 	describe('#handShake', function () {
// 		it('should notify the parent process when ready within 5 seconds', function (done) {
// 			this.timeout(5000);
//
// 			artikStream.on('message', function (message) {
// 				if (message.type === 'ready')
// 					done();
// 				else if (message.type === 'requestdeviceinfo') {
// 					if (message.data.deviceId === 'fc8ecc16e42446be9411b07d2f10c260' ||
// 						message.data.deviceId === '5ccc04ef21d246c4bdb68373b7289433' ||
// 						message.data.deviceId === 'cd563817829f407f81928a551d869f1d') {
//
// 						artikStream.send({
// 							type: message.data.requestId,
// 							data: {
// 								_id: message.data.deviceId
// 							}
// 						});
// 					} else {
// 						artikStream.send({
// 							type: message.data.requestId
// 						});
// 					}
// 				}
// 				else if (message.type === 'data') {
// 					console.log(message.data);
// 				}
// 			});
//
// 			artikStream.send({
// 				type: 'ready',
// 				data: {
// 					options: {
// 						client_id: 'b13c60dd1f264224a34d1e9c3d44ec27',
// 						client_secret: '7c08cea3447442acb7bef36dcdb99fb6',
// 						user_id: 'a103bd5381bc4d18b8dee8a728a5e0a2'
// 					}
// 				}
// 			}, function (error) {
// 				assert.ifError(error);
// 			});
// 		});
//
// 		describe('#sync', function () {
// 			it('should sync latest data of every device', function (done) {
// 				artikStream.send({
// 					type: 'sync',
// 					data: {
// 						last_sync_dt: new Date('12-12-1970')
// 					}
// 				}, done);
// 			});
// 		});
// 	});
// });