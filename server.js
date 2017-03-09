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
    app.enable("trust proxy");
}

app.disable("x-powered-by");

app.use(session({
    secret: config["express_session_secret"],
    resave: false,
    saveUninitialized: true,
    cookie: {}
}));

app.use(morgan("combined"));
app.use(serveStatic("view"));

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
        req.session.expire_unix_ms = undefined;
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
            // console.log("expire_unix_ms: " + new Date(req.session.expire_unix_ms));
        }

        res.redirect("/");
    });
});

// -------------------------------------------------------------------------------------------------------------------

app.get("/oauth2/logout", function (req, res) {
    req.session.destroy();
    res.redirect("/");
});

// -------------------------------------------------------------------------------------------------------------------

var _port = parseInt(process.argv[2]) || 80;
var server = app.listen(_port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Listening at http://%s:%s", host, port);
});
