var api = {
    config_async: function () {
        "use strict";

        return $.ajax({
            url: "/oauth2/config"
        });
    },

    login_url_sync: function (config) {
        "use strict";

        var clientId = config.client_id;
        var redirectUrl = window.location.protocol + "//" + window.location.host + "/oauth2/handler";
        var scope = "devices";
        var responseType = "code";
        var state = "10";
        var approvalPrompt = "auto";

        return "https://app.trackimo.com/oauth2/auth" +
            "?client_id=" + encodeURIComponent(clientId) +
            "&redirect_uri=" + encodeURIComponent(redirectUrl) +
            "&scope=" + encodeURIComponent(scope) +
            "&response_type=" + encodeURIComponent(responseType) +
            "&state=" + encodeURIComponent(state) +
            "&approval_prompt=" + encodeURIComponent(approvalPrompt);
    },

    current_user_async: function () {
        "use strict";

        return $.ajax({
            url: "/api/v3/user"
        });
    },

    all_devices_async: function (accountId) {
        "use strict";

        return $.ajax({
            url: "/api/v3/accounts/" + encodeURIComponent(accountId) + "/devices"
        });
    },

    device_history_async: function (accountId, deviceId, momentDay) {
        "use strict";

        return $.ajax({
            url: "/api/v3/accounts/" + encodeURIComponent(accountId) +
            "/devices/" + encodeURIComponent(deviceId) +
            "/history" +
            "?from=" + momentDay.startOf("day").unix() +
            "&to=" + momentDay.endOf("day").unix() +
            "&limit=512"
        });
    }
};
