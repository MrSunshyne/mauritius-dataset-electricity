# Mauritius Dataset for Electricity

![ProjectImage](https://github.com/MrSunshyne/mauritius-dataset-electricity/raw/main/public/images/electricity.png)

## Dataset

### [View Dataset](https://github.com/MrSunshyne/mauritius-dataset-electricity/blob/main/data/power-outages.json)

The aim is to provide a hassle-free way to use the data to build applications.

**Additional views:**
- [Latest outages](https://github.com/MrSunshyne/mauritius-dataset-electricity/blob/main/data/power-outages.latest.json) - Today's and future outages
- [Daily files](https://github.com/MrSunshyne/mauritius-dataset-electricity/tree/main/data/daily) - Outages by date (`daily/YYYY-MM-DD.json`)
- [Locality files](https://github.com/MrSunshyne/mauritius-dataset-electricity/tree/main/data/localities) - Outages by locality (`localities/{slug}.json`)
- [Dataset index](https://github.com/MrSunshyne/mauritius-dataset-electricity/blob/main/data/index.json) - Metadata and statistics

## Example applications

- [Power Outages in Mauritius](https://power-outages-mauritius.netlify.app/) by Sandeep Ramgolam
- [Kouran](https://github.com/k3ii/kouran) A Terminal UI by Jain Ramchurn
- [Zap](https://zap-webapp.vercel.app/) NextJS Web App by Arbaaz
- [Telegram Notifications](https://github.com/reallyaditya/ceb-notification) Telegram Bot by Aditya
- [KouranBot](https://github.com/almottier/KouranBot) Telegram Bot by almottier

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
         "from": string, // "2022-03-13T05:30:00.000Z" (ISO 8601 UTC),
         "to": string, // "2022-03-13T09:00:00.000Z" (ISO 8601 UTC),
         "id": string, // Legacy identifier (MD5 hash of raw data),
         "outageId": string // Stable identifier (MD5 hash of district+locality+start_time)
     },
     {
         ...
     }
   ]
 }
 ```

 **Note about identifiers:**
 - `id`: Legacy field, may change if CEB updates outage information. Use for backwards compatibility.
 - `outageId`: Stable identifier that remains consistent even if CEB updates the outage times. Use for reliable outage tracking and deduplication.

 </details>
