'use strict';
<%
    var modelName = us.capitalize(us.classify(model)) + 'Model';
%>

var <%= modelName %> = require('<%= modelPath %>');


module.exports = function (router) {

    var model = new <%= modelName %>();


    router.get('<%= route %>', function (req, res) {
        <% if (templateModule) { %>
        <% if (useJson) { %>
        res.format({
            json: function () {
                res.json(model);
            },
            html: function () {
                res.render('<%= fullname %>', model);
            }
        });<% } else { %>
        res.render('<%= fullname %>', model);
        <% } %>
        <% } else { %>
        res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
        <% } %>
    });

};
