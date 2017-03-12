"use strict";

var express = require("express");
var morgan = require("morgan");
var request = require("request");
var serveStatic = require("serve-static");
var requestProxy = require("express-request-proxy");
var session = require("express-session");
var fs = require("fs");
var url = require("url");

// -------------------------------------------------------------------------------------------------------------------

var app = express();
var config = JSON.parse(fs.readFileSync("config.json", "utf8"));

if (config["express_trust_proxy"]) {
    app.set("trust proxy", config["express_trust_proxy"]);
}

app.use(session({
    secret: config["express_session_secret"],
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: "/",
        httpOnly: true,
        secure: config["express_session_secure"],
        maxAge: 6 * 30 * 24 * 60 * 60 * 1000 // 6 months (ms)
    }
}));

app.use(serveStatic("static", {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 1 month (ms)
}));

app.disable("x-powered-by");
app.use(morgan("combined"));

if (config["express_debug_headers"]) {
    app.use(function (req, res, next) {
        console.log(JSON.stringify(req.headers));
        next();
    });
}

// -------------------------------------------------------------------------------------------------------------------

var apiWhiteList = [
    /^\/api\/v3\/user$/,
    /^\/api\/v3\/accounts\/[a-zA-Z0-9\-]+\/devices$/,
    /^\/api\/v3\/accounts\/[a-zA-Z0-9\-]+\/devices\/[a-zA-Z0-9\-]+\/history\?/
];

app.all("/api/*", function (req, res, next) {
    var validUrl = apiWhiteList.some(function (rx) {
        return rx.test(req.originalUrl);
    });
    if (!validUrl) {
        res.status(400).send({status: "error", code: 101, info: "Request blocked."});
        return;
    }

    var hasToken = req.session.expire_unix_ms !== undefined;
    if (!hasToken) {
        res.status(401).send({status: "error", code: 102, info: "No token."});
        return;
    }

    var validToken = req.session.expire_unix_ms > Date.now();
    if (!validToken) {
        req.session.destroy();
        res.status(401).send({status: "error", code: 103, info: "Token expired."});
        return;
    }

    requestProxy({
        url: "https://app.trackimo.com/api/*",
        headers: {
            "Authorization": "Bearer " + req.session.access["access_token"]
        }
    })(req, res, next);
});

// -------------------------------------------------------------------------------------------------------------------

app.get("/oauth2/config", function (req, res) {
    res.send({
        client_id: config["oauth2_client_id"],
        client_secret: "so_secret"
    });
});

// -------------------------------------------------------------------------------------------------------------------

app.get("/oauth2/handler", function (req, res) {
    var query = url.parse(req.url, true).query;

    var tokenRequest = {
        uri: "https://app.trackimo.com/api/v3/oauth2/token",
        method: "POST",
        json: {
            client_id: config["oauth2_client_id"],
            client_secret: config["oauth2_client_secret"],
            code: query.code
        }
    };

    request(tokenRequest, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            req.session.access = body;
            req.session.expire_unix_ms = Date.now() + req.session.access["expires_in"] * 1000;
        }

        res.redirect("/");
    });
});

// -------------------------------------------------------------------------------------------------------------------

app.get("/oauth2/logout", function (req, res) {
    var session = req.session;
    req.session.destroy();
    res.redirect("/");

    if (session.expire_unix_ms !== undefined && session.expire_unix_ms > Date.now()) {
        var token = session.access["access_token"];

        request({
            uri: "https://app.trackimo.com/api/v3/oauth2/revoke?token=" + encodeURIComponent(token)
        }, function () {
        });
    }
});

// -------------------------------------------------------------------------------------------------------------------

var _port = parseInt(process.argv[2]) || 80;
var server = app.listen(_port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Listening at http://%s:%s", host, port);
});
