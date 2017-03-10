$(function () {
    "use strict";

    moment.locale("pl");

    api.config_async()
        .then(function (config) {
            store.config = config;
            return api.current_user_async();
        })
        .then(function (user) {
            store.user = user;
            return api.all_devices_async(store.user["user_id"]);
        })
        .then(function (devices) {
            store.devices = devices;
            init_page_data();
        })
        .fail(function (error) {
            store.error = error;
            init_page_login();
        });
});

// -------------------------------------------------------------------------------------------------------------------

function init_page_login() {
    "use strict";

    $("#a-login").attr("href", api.login_url_sync(store.config));
    $("#page-loading").addClass("is-hidden");
    $("#page-login").removeClass("is-hidden");
}

// -------------------------------------------------------------------------------------------------------------------

function init_page_data() {
    "use strict";

    _.init();
    $("#user-email").text(store.user["email"]);

    var pikaSelector = new Pikaday({
        field: _.$selectDay[0],
        format: "YYYY-MM-DD",
        firstDay: 1,
        maxDate: new Date(),
        defaultDate: new Date(),
        setDefaultDate: true,
        i18n: {
            previousMonth: "poprzedni miesiąc",
            nextMonth: "następny miesiąc",
            months: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
                "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
            weekdays: ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
            weekdaysShort: ["Nie", "Pon", "Wto", "Śro", "Czw", "Pią", "Sob"]
        }
    });

    for (var i = 0; i < store.devices.length; i++) {
        $("<option/>", {
            value: i,
            text: store.devices[i]["deviceName"]
        }).appendTo(_.$selectDevice);
    }
    store.map = new google.maps.Map(document.getElementById("map-area"));
    store.map.setZoom(13);
    store.map.setCenter({lat: 53.5753200, lng: 10.0153400});

    store.oms = new OverlappingMarkerSpiderfier(store.map, {legWeight: 1.2});

    $("#a-logout").attr("href", "/oauth2/logout");
    $("#page-loading").addClass("is-hidden");
    $("#page-data").removeClass("is-hidden");
}
