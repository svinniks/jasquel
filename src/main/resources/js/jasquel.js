// Loads and sets up environment

var environment = JSON.parse(script.getEnvironment());

// Main methods for test units

function checkAborted() {

    if (script.isAborted())
        throw "Execution aborted by the user!";

}

function checkSkip() {

    if (script.skip())
        throw "Skipped due to setup/teardown failure!"

}

function suite(description, body) {
    
    checkAborted();

    script.suiteStart(description, new Error());
    
    try {

        body(); 
        script.success(null);
        
    } catch(error) {
        script.error(error);
        checkAborted();
    } 
    
};

function testf(description, body) {
    
    checkAborted();

    script.testStart(description, new Error());
    
    try {

        checkSkip();
        body();
        script.success(null);
        
    } catch(error) {
        
        // COMMIT has been called in a global transaction!
        if (/HTP-00059/.test(error))
            throw error;
        
        script.error(error);
        checkAborted();
        
    }
    
};

function test(description, body) {

    if (!script.isForce())
        testf(description, body);

};

function setup(description, body) {
    
    checkAborted();

    script.setupStart(description, new Error());
    
    try {

        checkSkip();
        body();
        script.success(null);
        
    } catch(error) {
        
        script.error(error);
        checkAborted();

        //throw "Setup has failed!";
        
    }
    
};

function teardown(description, body) {
    
    checkAborted();

    script.teardownStart(description, new Error());
    
    try {

        checkSkip();
        body();
        script.success(null);
        
    } catch(error) {
        
        script.error(error);
        checkAborted();

    }
    
};

function step(description, body) {

    checkAborted();

    script.stepStart(description, new Error());

    try {

        body();
        script.success(null);

    } catch(error) {

        script.error(error);
        throw error;

    }

};

function info(message) {
    
    if (typeof(message) === "string")
        script.info(message);
    else
        script.info(JSON.stringify(message, "    "));
    
};

// XML-to-JSON conversion tool

var XmlConverter = Java.type("jasquel.common.XmlConverter");

var Xml = function() {
};

Xml.prototype.stringify = function(value) {
    return XmlConverter.fromJSON(JSON.stringify(value));
};

Xml.prototype.parse = function(xml, arrayPaths) {
    return JSON.parse(XmlConverter.toJSON(xml, arrayPaths));
};

var XML = new Xml();
