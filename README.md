# Mauritius Dataset for Electricity

![ProjectImage](https://github.com/MrSunshyne/mauritius-dataset-electricity/raw/main/public/images/electricity.png)

## Dataset

### [View Dataset](https://github.com/MrSunshyne/mauritius-dataset-electricity/blob/main/data/power-outages.json)

The aim is to provide a hassle-free way to use the data to build applications.

## Example applications

- [Power Outages in Mauritius](https://power-outages-mauritius.netlify.app/) by Sandeep Ramgolam

## Disclaimers

- The maintainer of this repository is NOT affiliated with the CEB.
- The data is automatically fetched from the CEB website but not provided directly by them.
- The page from which the data is fetched is [publicly available](https://ceb.mu/customer-corner/power-outage-information).
- The data is fetched at a rate of Once per hour betwee 6AM -6PM. ( i assume nobody updates their site after working hours)
- The data is made available here under fair use.

## FAQ

<details>
  <summary>Why not use the CEB website directly?</summary>
  
- Although the data is available publicly and for free, it is not in a suitable open format that would enable developers or students to build applications reliably

- I encourage you to use the CEB website if you wish to

</details>

<details>
  <summary>In which format is the data provided?</summary>
  
- JSON
- The shape is as follows:

```js

{
  "district_name": [
    {
        "date": string, // "Le dimanche 13 mars 2022 de  09:30:00 à  13:00:00",
        "locality": string, // "TAMARIN",
        "streets": string, // "AVE DES MARLINS, AVE DES CAMPECHES, AVE DES BONITES ET UNE PARTIE DE BLACK ROCK ROAD",
        "district": string, // "blackriver",
        "from": date: //"2022-03-13T05:30:00.000Z",
        "to": date: //"2022-03-13T09:00:00.000Z",
        "id": md5: //"e562a818d6d27163396e3c0069fd51c9"
    },
    {
        ...
    }
  ]
}
```

</details>
