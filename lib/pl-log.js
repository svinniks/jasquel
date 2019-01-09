var PlLog = function(database) {
    this.database = database;
};

PlLog.prototype.level = function(level) {

    if (!this.database.dbmsOutput.enabled)
        this.database.dbmsOutput.on();

    this.database.rpc("dbms_output_handler.set_log_level", {
        p_level: level
    });

};

PlLog.prototype.all = function() {
    this.level(0);
};

PlLog.prototype.debug = function() {
    this.level(100);
};

PlLog.prototype.info = function() {
    this.level(200);
};

PlLog.prototype.warning = function() {
    this.level(300);
};

PlLog.prototype.error = function() {
    this.level(400);
};

PlLog.prototype.fatal = function() {
    this.level(500);
};

PlLog.prototype.none = function() {
    this.level(601);
};

PlLog.prototype.callStackLevel = function(level) {

    this.database.rpc("dbms_output_handler.set_call_stack_level", {
        p_level: level
    });

};