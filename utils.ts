import convert from 'html-to-json-data';
import { group, text } from 'html-to-json-data/definitions.js';

export const sanitize = (data) => {
    const districts = Object.keys(data);
    const dataset = {}

    for (const district in districts) {
        if (Object.prototype.hasOwnProperty.call(districts, district)) {
            const element = districts[district];
            dataset[element] = convert(data[element], {
                district: element,
                data: group('[id^=table-mauritius] tbody tr', {
                    date: text('td:nth-child(1)'),
                    locality: text('td:nth-child(2)'),
                    streets: text('td:nth-child(3)'),
                })
            });
        }
    }

    console.log(dataset)

    return dataset
} 