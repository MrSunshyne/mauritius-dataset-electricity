import { exit } from 'process';
import fs from 'fs'
import { extractFromSource, makeUniq } from "./utils"
import request from 'request'
import deepmerge from 'deepmerge';

const URL = 'https://ceb.mu/customer-corner/power-outage-information'
const path = './data/power-outages.json'

request(URL, function (error, response, body) {
    if (error) {
        console.error('error:', error);
        exit(1)
    }

    let result = /var arDistrictLocations = ({".+"});/gm.exec(body); // THANKS @JulesMike  !!

    // The newly fetched data from CEB Website
    let newData = extractFromSource(JSON.parse(result[1]));

    //file exists
    if (fs.existsSync(path)) {
        console.log('Found file. Opening...')

        let rawdata = fs.readFileSync(path); // open file
        let oldData = JSON.parse(rawdata.toString());
        let mergedData = deepmerge(oldData, newData) // Merge old and new data
        let uniq = makeUniq(mergedData); // remove duplicate data & empty values
        fs.writeFileSync(path, JSON.stringify(uniq));

    } else {
        // Create the file
        console.log('creating file')
        fs.writeFileSync(path, JSON.stringify(newData));
    }



    exit(0);
});