'use strict';

var platform = require('./platform'),
	request = require('request'),
	async = require('async'),
	client_id,
	client_secret,
	user_id;

/**
 * Emitted when the platform issues a sync request. Means that the stream plugin should fetch device data from the 3rd party service.
 * @param {date} lastSyncDate Timestamp from when the last sync happened. Allows you to fetch data from a certain point in time.
 */
platform.on('sync', function (lastSyncDate) {

	let startDate = new Date(lastSyncDate).getTime();
	let endDate = Date.now();
	let count = 100;

	async.waterfall([
		(done) => {
			let clientCredentialsOptions = {
				method: 'POST',
				url: 'https://accounts.artik.cloud/token',
				headers: {
					'content-type': 'application/x-www-form-urlencoded'
				},
				form: { grant_type: 'client_credentials' },
				auth: {
					user: client_id,
					pass: client_secret
				}
			};
			request(clientCredentialsOptions,  (error, response, body) => {
				if (!error && response.statusCode === 200) {
					let token = JSON.parse(body).access_token;
					done(null, token);
				} else {
					error = error ? error : new Error(body.error);
					done(error);
				}
			});
		},
		(token, done) => {
			let userDevicesOptions = {
				url: `https://api.artik.cloud/v1.1/users/${user_id}/devices`,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				}
			};

			request(userDevicesOptions,  (error, response, body) => {
				if (!error && response.statusCode === 200) {
					let data = JSON.parse(body).data;
					let devices = [];

					data.devices.forEach( (device) => {
						devices.push(device.id);
					});
					done(null, token, devices);
				} else {
					error = error ? error : new Error(body.error);
					done(error);
				}
			});
		},
		(token, devices, done) => {
			async.eachSeries(devices, (device, callback) => {
				let messagesOptions = {
					url: `https://api.artik.cloud/v1.1/messages?count=${count}&startDate=${startDate}&endDate=${endDate}&sdid=${device}`,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					}
				};
				request(messagesOptions, (error, response, body) => {
					if (!error && response.statusCode === 200) {
						let data = JSON.parse(body).data;
						data.forEach(function (datum) {
							platform.requestDeviceInfo(datum.sdid, function (error, requestId) {
								platform.once(requestId, function (deviceInfo) {
									if (deviceInfo) {
										platform.processData(datum.sdid, JSON.stringify(datum));
									} else {
										platform.handleException(new Error(`Device ${datum.sdid} not registered`));
									}
								});
							});
						});
						callback();
					} else {
						error = error ? error : new Error(body.error);
						callback(error);
					}
				});
			}, (error) => {
				done(error);
			});
		}
	], (error) => {
		platform.handleException(error);
	});
});

/**
 * Emitted when the platform shuts down the plugin. The Stream should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		// TODO: Release all resources and close connections etc.
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The parameters or options. Specified through config.json.
 */
platform.once('ready', function (options) {
	client_id = options.client_id;
	client_secret = options.client_secret;
	user_id = options.user_id;

	platform.notifyReady();
	platform.log('Stream has been initialized.');
});