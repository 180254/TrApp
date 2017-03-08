"use strict";

var store = {
    config: null,
    user: null,
    devices: null,
    error: null,
    map: null,
    oms: null
};

var _ = {
    init: function () {
        _.$overlay = $("#overlay");
        _.$selectDevice = $("#select-device");
        _.$selectDay = $("#select-day");
        _.$selectButton = $("#select-button");
        _.$tableData = $("#table-data");
        _.$tableDataBody = _.$tableData.find("tbody");
        _.$currentDevice = $("#current-device");
        _.$currentDate = $("#current-date");
    }
};
