/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comnauti/controller_portal/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
