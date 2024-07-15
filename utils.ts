import convert from 'html-to-json-data';
import { group, text } from 'html-to-json-data/definitions.js';
import { parse } from "date-fns";
import fr from "date-fns/locale/fr/index.js";
import md5 from 'md5'

interface Outage {
    date: string;
    locality: string;
    streets: string;
    district: string;
    from: string; // Date string in ISO format
    to: string;   // Date string in ISO format
    id: string;
}

interface InputData {
    [district: string]: Outage[];
}

interface OutputObject {
    today: Outage[];
    future: Outage[];
}

function parseDate(date: string, delimiter = 'from', tz = "+0400") {
    if (date.length > 0) {
        let processing: string[] = date.replace(/\s+/g, ' ').trim().split('à');

        const opt = {
            locale: fr,
        };

        const from = parse(processing[0].trim() + tz, "'Le' EEEE d MMMM yyyy 'de' HH:mm:ssxx", new Date(), opt)
        const to = parse(processing[1].trim() + tz, 'HH:mm:ssxx', from, opt)

        if (delimiter === 'from') {
            return from
        } else {
            return to
        }
    } else {
        return date
    }
}

function removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
        if (originalArray[i]['date'] !== '') { // also remove empty values when date is null
            lookupObject[originalArray[i][prop]] = originalArray[i];
        }
    }

    for (i in lookupObject) {
        newArray.push(lookupObject[i]);
    }
    return newArray;
}

export function makeUniq(obj) {
    let newObj = {}
    for (let arr in obj) {
        let newSet = removeDuplicates(obj[arr], 'id')
        newObj[arr] = [...newSet]
    }
    return newObj
}

export const extractFromSource = (data) => {
    const districts = Object.keys(data);
    const dataset = {}

    for (const district in districts) {
        if (Object.prototype.hasOwnProperty.call(districts, district)) {
            const element = districts[district];
            let currentDistrict = convert(data[element],
                group('[id^=table-mauritius] tbody tr',
                    {
                        date: text('td:nth-child(1)'),
                        locality: text('td:nth-child(2)'),
                        streets: text('td:nth-child(3)'),
                        district: element,
                    }
                )
            )

            dataset[element] = currentDistrict.map(item => {
                return {
                    ...item,
                    "from": parseDate(item.date, 'from'),
                    "to": parseDate(item.date, 'to'),
                    "id": md5(JSON.stringify(item))
                }
            })
        }
    }


    return dataset
}

// Source: ChatGPT 3.5 :smirk:
export const categorize = (inputData: InputData): OutputObject => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayOutages: Outage[] = [];
    const futureOutages: Outage[] = [];

    // Iterate over each district in the input data.
    Object.values(inputData).forEach((outages: Outage[]) => {
        outages.forEach((outage: Outage) => {
            if (!outage.from) {
                // If 'from' field is missing or empty, skip this outage.
                return;
            }

            const from = new Date(outage.from);

            // Compare outage date with today's date.
            if (from < endOfToday) {
                todayOutages.push(outage);
            } else {
                futureOutages.push(outage);
            }
        });
    });

    // Return an object with 'today' and 'future' keys.
    return {
        today: todayOutages,
        future: futureOutages
    };
}
