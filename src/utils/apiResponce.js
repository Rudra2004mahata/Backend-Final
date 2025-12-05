class apiResponce {
    constructor(statusCode, data, message = "request successful") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
        this.errors = [];
    }
}