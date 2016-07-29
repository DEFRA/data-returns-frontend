module.exports = {
    errBitMessage: function (message, fileName, method, lineNumber) {
        this.message = message;
        this.fileName = fileName;
        this.method = method;
        this.lineNumber = lineNumber;
    }
};