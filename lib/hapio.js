var HttpClient = Java.type("http.HttpClient");
var StringEntity = Java.type("org.apache.http.entity.StringEntity");
var System = Java.type("java.lang.System");

var requestId = 0;

var HapioClient = function(database) {

    this.url = database.url;
    this.currentUser = database.defaultUser;
    this.defaultTransaction = database.defaultTransaction || "local";
    this.users = database.users;
    this.accessTokens = {};

    this.database = database;
    this.httpClient = new HttpClient();

    this.dbmsOutput = new DbmsOutput(this);

};

HapioClient.prototype.version = function () {
    return JSON.parse(Http.get(this.url + "/version").body);
};

HapioClient.prototype.getTransaction = function () {

    if (!this.activeTransaction)
        this.transaction(this.defaultTransaction, "read-committed");

    return this.activeTransaction;

};

function checkHttpError(response) {

    if (Math.floor(response.code / 100) === 2)
        return;

    var error;

    if (/application\/json/.test(response.headers["Content-Type"])) {

        try {

            var body = JSON.parse(response.body);

            //print(JSON.stringify(body.error));

            error = body.error.message;

            if (error.substring(0, 9) === "RPC-00036")
                error = error.substring(11);

            if (body.error.data.cause)
                error = error + "\nCause: " + body.error.data.cause;

        } catch(exception) {
            error = response.body;
        }

    } else

        error = response.body;

    throw error;

}

HapioClient.prototype.transaction = function(kind, isolation) {

    if (this.activeTransaction)
        throw "Before starting a new transaction, COMMIT or ROLLBACK the ongoing one!";

    if (!kind)
        kind = "global";
    else if (kind !== "global" && kind !== "local")
        throw "Invalid transaction kind \"" + kind + "\"!";

    if (!isolation)
        isolation = "read-committed";
    else if (isolation !== "read-committed" && isolation !== "serializable")
        throw "Invalid transaction isolation \"" + isolation + "\"!";

    var url = this.url + "/transaction?global=" + (kind === "global" ? "true" : "false") + "&isolation=" + isolation + "&timeout=300";

    var response = this.httpClient.post(
        url,
        {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: this.getCredentials(this.currentUser)
        }
    );

    checkHttpError(response);

    this.activeTransaction = JSON.parse(response.body);

    script.setRemoteAbortHandler(this.httpClient.deleteTask(
        `${this.url}/transactions/${this.activeTransaction.id}/call`,
        {
            Authorization: this.getCredentials(this.currentUser)
        },
        null
    ));

};

HapioClient.prototype.savepoint = function(name) {

    var transaction = this.getTransaction();

    if (!transaction.savepointUser)
        transaction.savepointUser = this.currentUser;

    if (!name)
        throw "Savepoint name not specified!";

    if (typeof(name) !== "string")
        throw "Savepoint name must be a string!";

    var url = this.url + "/savepoint?transactionId=" + transaction.id + "&name=" + name;

    var response = this.httpClient.post(
        url,
        {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: this.getCredentials(transaction.savepointUser)
        }
    );

    checkHttpError(response);

};

HapioClient.prototype.endTransaction = function(commit, savepoint) {

    if (this.activeTransaction) {

        var response = this.httpClient.delete(
            this.url +
            "/transaction/" +
            this.activeTransaction.id +
            ("?commit=" + (commit ? "true" : false)) +
            (savepoint ? "&savepoint=" + savepoint : ""),
            {
                Authorization: this.getCredentials(this.activeTransaction.savepointUser || this.currentUser)
            }
        );

        if (!savepoint) {
            this.activeTransaction = null;
            script.setRemoteAbortHandler(null);
        }

        checkHttpError(response);

    }

};

HapioClient.prototype.commit = function() {

    this.endTransaction(true);

};

HapioClient.prototype.rollback = function(savepoint) {

    if (savepoint && typeof(savepoint) !== "string")
        throw "Savepoint name must be a string!";

    this.endTransaction(false, savepoint);

};

HapioClient.prototype.user = function (user) {

    if (this.activeTransaction && !this.activeTransaction.global && user != this.currentUser)
        throw "Can't change user of a local transaction!";

    this.currentUser = user;

};

HapioClient.prototype.resetObjectCache = function() {

    try {

        var response = this.httpClient.post(
            this.url + "/resetObjectCache",
            {
                Authorization: this.getCredentials(this.currentUser)
            }
        );

        checkHttpError(response);

    } catch (error) {
        script.error(error);
        throw error;
    }

}

HapioClient.prototype.rpc = function (method, params, overload) {

    let response = this.httpClient.post(
        this.url + "/rpc?transactionId=" + this.getTransaction().id + "&rollbackOnException=false",
        {
            "Content-Type": "application/json",
            Authorization: this.getCredentials(this.currentUser)
        },
        new StringEntity(JSON.stringify(
            {
                jsonrpc: "2.0",
                id: ++requestId,
                method: method,
                overload: overload,
                params: params ? params : {}
            }
        ))
    );

    checkHttpError(response);
    return JSON.parse(response.body).result;

};

HapioClient.prototype.rpcCall = function (method, params, overload) {

    checkAborted();
    script.callStart(method, JSON.stringify(params ? params : {}), new Error());

    let result;

    try {
        result = this.rpc(method, params, overload);
    } catch (error) {

        script.error(error);
        this.dbmsOutput.display();

        throw error;

    }

    script.success(JSON.stringify(result));
    this.dbmsOutput.display();

    return result;

};

HapioClient.prototype.getCredentials = function (user) {

    if (!user)
        throw "Database user is not set!";

    if (!this.users[user])
        throw "Unknown database user " + user + "!";

    if (!this.accessTokens[user])
        this.accessTokens[user] = {
            refreshAt: System.currentTimeMillis() - 1
        };

    if (System.currentTimeMillis() >= this.accessTokens[user].refreshAt) {

        var response = this.httpClient.post(
            this.url + "/auth",
            null,
            new StringEntity(
                "user=" + user + "&password=" + this.users[user],
                ContentType.APPLICATION_FORM_URLENCODED
            )
        );

        checkHttpError(response);

        var responseBody = JSON.parse(response.body);
        this.accessTokens[user].token = responseBody.access_token;
        this.accessTokens[user].refreshAt += 120000;

    }

    return "Bearer " + this.accessTokens[user].token;

};

HapioClient.prototype.run = function (statement) {
    this.rpcCall(
        "$plsql",
        {
            statement: statement
        }
    );
};

HapioClient.prototype.select = function (params) {
    return this.rpcCall(
        "$select",
        params
    );
};

HapioClient.prototype.selectRow = function (statement) {
    return this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "object",
            return: "row"
        }
    ).object;
};

HapioClient.prototype.selectRows = function (statement) {
    return this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "objects",
            return: "rows"
        }
    ).objects;
};

HapioClient.prototype.selectObject = function (statement) {

    return this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "object",
            return: "object"
        }
    ).object;

};

HapioClient.prototype.selectObjects = function (statement) {

    return this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "objects",
            return: "objects"
        }
    ).objects;

};

HapioClient.prototype.selectValue = function (statement) {

    var value = this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "value",
            return: "value"
        }
    ).value;

    return value;

};

HapioClient.prototype.selectValues = function (statement) {

    var values = this.rpcCall(
        "$sql",
        {
            statement: "SELECT " + statement,
            as: "values",
            return: "values"
        }
    ).values;

    return values;

};

HapioClient.prototype.insert = function (statement) {

    this.rpcCall(
        "$sql",
        {
            statement: "INSERT " + statement
        }
    );

};

HapioClient.prototype.update = function (statement) {

    this.rpcCall(
        "$sql",
        {
            statement: "UPDATE " + statement
        }
    );

};

HapioClient.prototype.delete = function (statement) {

    this.rpcCall(
        "$sql",
        {
            statement: "DELETE " + statement
        }
    );

};

HapioClient.prototype.call = function (method, params, overload) {

    return this.rpcCall(
        method,
        params,
        overload
    );

};

HapioClient.prototype.call2 = function (method, params) {

    return this.call(
        method,
        params,
        2
    );

};

HapioClient.prototype.call3 = function (method, params) {

    return this.call(
        method,
        params,
        3
    );

};

HapioClient.prototype.call4 = function (method, params) {

    return this.call(
        method,
        params,
        4
    );

};

HapioClient.prototype.call5 = function (method, params) {

    return this.call(
        method,
        params,
        5
    );

};

HapioClient.prototype.metadata = function (params) {

    try {

        var url = this.url + "/metadata";

        if (params.schema) {

            url = url + "/" + params.schema;

            if (params.object)
                url = url + "/" + params.object;

        }

        var response = this.httpClient.get(
            url,
            {
                "Content-Type": "application/json",
                Authorization: this.getCredentials(this.currentUser)
            }
        );

        checkHttpError(response);

    } catch (error) {
        script.error(error);
        throw error;
    }

    var responseBody = JSON.parse(response.body);

    return responseBody;

}

var DbmsOutput = function(database) {
    this.database = database;
};

DbmsOutput.prototype.on = function() {

    this.enabled = true;

    this.database.rpc("$plsql", {
        "statement": "BEGIN dbms_output.enable; END;"
    });

};

DbmsOutput.prototype.off = function() {

    this.enabled = false;

    this.database.rpc("$plsql", {
        "statement": "BEGIN dbms_output.disable; END;"
    });

};

DbmsOutput.prototype.display = function() {

    if (this.enabled) {

        let result = this.database.rpc(
            "dbms_output.get_lines",
            {
                numlines: null
            },
            2
        );

        for (let i = 1; i <= result.numlines; i++)
            script.info(result.lines[i-1]);

    }

};

String.prototype.fromOracleDate = function() {
    return moment(this, "YYYY-MM-DD HH:mm:ss");
};

moment.fn.toOracleDate = function() {
    return this.format("YYYY-MM-DD HH:mm:ss");
};

