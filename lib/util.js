var Thread = Java.type("java.lang.Thread");
var TextFile = Java.type("jasquel.common.TextFile");
var UUID = Java.type("java.util.UUID");
var Base64 = Java.type("java.util.Base64");
var ByteBuffer = Java.type("java.nio.ByteBuffer");

function sleep(duration) {
    Thread.sleep(duration);
}

function readFile(name) {
    return TextFile.read(name);
}

function readJSON(fileName) {
    return JSON.parse(readFile(fileName));
}

function writeFile(name, content) {
    TextFile.write(name, content);
}

function writeJSON(fileName, content, format) {
    writeFile(
        fileName,
        JSON.stringify(
            content,
            null,
            format ? "    " : undefined
        )
    );
}

function randomString(length) {
    
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
    
}

function uuidToBase64(uuid) {

    if (typeof uuid == "string")
        uuid = UUID.fromString(uuid);

    return Base64.getEncoder().encodeToString(
        ByteBuffer
            .allocate(16)
            .putLong(uuid.getMostSignificantBits())
            .putLong(uuid.getLeastSignificantBits())
            .array()
    );

}