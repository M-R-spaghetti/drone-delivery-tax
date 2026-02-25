const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('WEB_Dev_TestTask.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(console.error);
