var ScriptObject = Java.type("jdk.nashorn.internal.runtime.ScriptObject");
var HttpClient = Java.type("http.HttpClient");
var HttpEntity = Java.type("org.apache.http.HttpEntity");
var StringEntity = Java.type("org.apache.http.entity.StringEntity");
var ContentType = Java.type("org.apache.http.entity.ContentType");

var HttpEndpoint = function(http) {

    this.url = http.url;

    this.auth = http.auth;

    if (this.auth)

        if (this.auth.protocol == "openid-connect") {

            if (!this.auth.url)
                throw "OIDC endpoint not specified!";

            this.authEndpoint = new HttpEndpoint({
                url: this.auth.url
            })

            if (!this.auth.realm)
                throw "Realm not specified!";

            if (!this.auth.clientId)
                throw "Client ID not specified!";

            if (!this.auth.clientSecret)
                throw "Client secret not specified!";

        } else

            throw "Authentication protocol " + this.auth.protocol + " not supported!";

    this.httpClient = new HttpClient();

};

HttpEndpoint.prototype.OIDCLogin = function(user, password) {

    var response = this.authEndpoint.post({
        path: "/token",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new StringEntity("grant_type=password&client_id=" + this.auth.clientId + "&client_secret=" + this.auth.clientSecret + "&username=" + user + "&password=" + password)
    });

    if (!/2.*/.test(response.code))
        throw response.body.error_description;

    this.session = response.body;
    this.authHeader = "Bearer " + this.session.access_token;

};

HttpEndpoint.prototype.login = function(user, password) {

    if (!this.auth)
        throw "Authentication not enabled!";

    if (this.auth.protocol == "openid-connect")
        this.OIDCLogin(user, password);

};

HttpEndpoint.prototype.OIDCLogout = function() {

    var response = this.authEndpoint.get({
        path: "/logout?id_token_hint=" + this.session.refresh_token
    });

};

HttpEndpoint.prototype.logout = function() {

    if (!this.auth)
        throw "Authentication not enabled!";

    if (!this.session)
        throw "Not logged in!"

    if (this.auth.protocol == "openid-connect")
        this.OIDCLogout();

    this.session = undefined;
    this.authHeader = undefined;

};

HttpEndpoint.prototype.executeRequest = function(method, params) {

    var response;

    try {

        // TODO: params check

        if (!params.path)
            params.path = "";

        if (!params.headers)
            params.headers = {};
        
        if (this.authHeader && !params.headers.Authorization)
            params.headers.Authorization = this.authHeader;
    
        var body = params.body;

        if (typeof body == "undefined")
            body = null;
        else if (body instanceof ScriptObject)
            body = new StringEntity(JSON.stringify(body), ContentType.APPLICATION_JSON);
        else if (!(body instanceof HttpEntity))
            body = new StringEntity(body.toString());
        
        script.callStart(method, JSON.stringify(params), new Error());

        var responseObj;

        if (method == "GET")
            responseObj = this.httpClient.get(this.url + params.path, params.headers);
        else if (method == "POST")
            responseObj = this.httpClient.post(this.url + params.path, params.headers, body);
        else if (method == "PUT")
            responseObj = this.httpClient.put(this.url + params.path, params.headers, body);
        else if (method == "DELETE")
            responseObj = this.httpClient.delete(this.url + params.path, params.headers, body);

        var response = {
            code: responseObj.code,
            headers: {},
            body: responseObj.body
        };

        for (var header in responseObj.headers)
            response.headers[header] = responseObj.headers[header];

        if (response.headers && /^application\/json.*$/.test(response.headers["Content-Type"])) 
             response.body = JSON.parse(response.body);
        
    } catch (error) {
        script.error(error);
        throw error;
    }

    script.success(JSON.stringify(response));
    return response;

}

HttpEndpoint.prototype.get = function(params) {
    return this.executeRequest("GET", params);
}

HttpEndpoint.prototype.post = function(params) {
    return this.executeRequest("POST", params);
}

HttpEndpoint.prototype.put = function(params) {
    return this.executeRequest("PUT", params);
}

HttpEndpoint.prototype.delete = function(params) {
    return this.executeRequest("DELETE", params);
}
