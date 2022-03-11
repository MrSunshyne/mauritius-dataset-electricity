import { exit } from 'process';
import fs from 'fs'
import { sanitize } from "./utils"
import request from 'request'

const URL = 'https://ceb.mu/customer-corner/power-outage-information'

request(URL, function (error, response, body) {
    console.error('error:', error);
    console.log('statusCode:', response && response.statusCode);

    let result = /var arDistrictLocations = ({".+"});/gm.exec(body); // THANKS @JulesMike  !!

    let data = JSON.parse(result[1])

    let processsed = sanitize(data);
    let filname_with_timestamp = new Date().toISOString().slice(0, 10);
    let stringified = JSON.stringify(processsed);
    fs.writeFileSync('./data/latest.json', stringified);
    fs.writeFileSync(`./data/history/${filname_with_timestamp}.json`, stringified);
    exit(0);
});