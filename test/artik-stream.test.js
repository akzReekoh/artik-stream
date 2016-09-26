'use strict';

const PORT = 8080;

var cp     = require('child_process'),
	assert = require('assert'),
	artikStream;

describe('Stream', function () {
	this.slow(5000);

	after('terminate child process', function () {
		artikStream.kill('SIGKILL');
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(artikStream = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			artikStream.on('message', function (message) {
				if (message.type === 'ready')
					done();
				else if (message.type === 'requestdeviceinfo') {
					if (message.data.deviceId === 'fc8ecc16e42446be9411b07d2f10c260') {
						artikStream.send({
							type: message.data.requestId,
							data: {
								_id: message.data.deviceId
							}
						});
					} else {
						artikStream.send({
							type: message.data.requestId
						});
					}
				}
			});

			artikStream.send({
				type: 'ready',
				data: {
					options: {
						client_id: 'b13c60dd1f264224a34d1e9c3d44ec27',
						client_secret: '7c08cea3447442acb7bef36dcdb99fb6',
						user_id: 'a103bd5381bc4d18b8dee8a728a5e0a2'
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});

		describe('#sync', function () {
			this.timeout(10000);
			it('should sync latest data of every device', function(done) {
				artikStream.send({
					type: 'sync',
					data: {
						last_sync_dt: new Date('12-12-1970')
					}
				}, function() {
					done();
				});
			});
		});
	});
});