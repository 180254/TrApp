$("#select-button").click(function () {
    "use strict";

    _.$overlay.removeClass("is-hidden");

    var accountId = store.user["user_id"];
    var deviceIndex = _.$selectDevice.find("option:selected").attr("value");
    var deviceId = store.devices[deviceIndex]["deviceId"];
    var momentDay = moment(_.$selectDay.val(), "YYYY-MM-DD", true);

    if (!momentDay.isValid()) {
        momentDay = moment();
        _.$selectDay.val(momentDay.format("YYYY-MM-DD"));
    }

    api.device_history_async(accountId, deviceId, momentDay)
        .then(function (deviceHistory) {
            set_device_history(deviceHistory);
            _.$currentDevice.text(store.devices[deviceIndex]["deviceName"]);
            _.$currentDate.text(momentDay.format("dddd, YYYY-MM-DD"));
            _.$overlay.addClass("is-hidden");
        })
        .fail(function (error) {
            console.log(".");
            store.error = error;
            _.$overlay.addClass("is-hidden");
        });
});

// -------------------------------------------------------------------------------------------------------------------

function set_device_history(deviceHistory) {
    "use strict";

    _.$tableDataBody.empty();
    _.$tableData.scrollTop(0);
    marker.clear();

    deviceHistory.forEach(function (item, i) {
        deviceHistory[i]["time"] = moment(deviceHistory[i]["time"], "X", true);

        var current = deviceHistory[i];
        var previous = i === 0 ? null : deviceHistory[i - 1];
        var diffTime = i === 0 ? moment.duration(0) : moment.duration(current["time"].diff(previous["time"]));
        var distance = i === 0 ? 0 : computeDistance(current, previous);

        var tr = _.$tableDataBody
            .append(
                $("<tr>")
                    .append($("<td>").text(i + 1))
                    .append($("<td>").text(current["type"]))
                    .append($("<td>").text(current["time"].format("YYYY-MM-DD\xa0HH:mm:ss")))
                    .append($("<td>").text(diffTime.asMinutes().toFixed(1)))
                    .append($("<td>").text(distance.toFixed(2)))
                    .append($("<td>").text(current["speed"]))
                    .click(function () {
                        marker.mark(i, current.lat, current.lng);
                    })
            );

        marker.new(i, current);
    });

    if (deviceHistory.length > 0) {
        marker.mark(0, deviceHistory[0].lat, deviceHistory[0].lng);

        _.$tableData.floatThead(
            $(".floatThead-table").length == 0 ? undefined : "reflow"
        );
    }
}

// -------------------------------------------------------------------------------------------------------------------

function computeDistance(row1, row2) {
    "use strict";
    return computeDistance1(row1.lat, row1.lng, row2.lat, row2.lng);
}

function computeDistance1(lat1, lon1, lat2, lon2) {
    "use strict";
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    "use strict";
    return deg * (Math.PI / 180);
}

// -------------------------------------------------------------------------------------------------------------------

var marker = {
    array: [],
    marked: null,

    colors: {
        normal: "#FE6256".substring(1),
        selected: "#2c6b2c".substring(1),
        neighbour: "#7fe07f".substring(1)
    },

    new: function (index, item) {
        "use strict";

        var gmMarker = new google.maps.Marker({
            icon: marker.icon(index, marker.colors.normal),
            position: {lat: item.lat, lng: item.lng},
            map: store.map,
            title: (index + 1).toString() + "/" + item["type"] + "/" + item["time"].format("HH:mm:ss")
        });

        store.oms.addMarker(gmMarker);
        marker.array.push(gmMarker);
    },

    mark: function (index, lat, lng) {
        "use strict";

        store.map.setCenter({lat: lat, lng: lng});

        if (marker.marked !== index) {
            _.$tableDataBody.find("tr:nth-of-type(" + (index + 1) + ")").addClass("current");

            // reset marked
            if (marker.marked !== null) {
                var resetFrom = Math.max(0, marker.marked - 1);
                var resetTo = Math.min(marker.array.length - 1, marker.marked + 1);
                for (var reset = resetFrom; reset <= resetTo; reset++) {
                    if (reset >= index - 1 && reset <= index + 1) {
                        continue;
                    }
                    marker.array[reset].setIcon(marker.icon(reset, marker.colors.normal));
                }

                _.$tableDataBody.find("tr:nth-of-type(" + (marker.marked + 1) + ")").removeClass("current");
            }

            // set current
            marker.array[index].setIcon(marker.icon(index, marker.colors.selected));

            // set neighbours
            if (index - 1 >= 0) {
                marker.array[index - 1].setIcon(marker.icon(index - 1, marker.colors.neighbour));
            }
            if (index + 1 < marker.array.length) {
                marker.array[index + 1].setIcon(marker.icon(index + 1, marker.colors.neighbour));
            }

            marker.marked = index;
        }
    },

    clear: function () {
        "use strict";

        store.oms.clearMarkers();
        marker.array.forEach(function (item, i) {
            marker.array[i].setMap(null);
        });

        marker.array = [];
        marker.marked = null;
    },

    icon: function (index, color) {
        "use strict";

        return "https://chart.apis.google.com/chart" +
            "?chst=d_map_pin_letter" +
            "&chld=" + (index + 1) + "|" + color + "|000000";
    }
};
