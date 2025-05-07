On the /reports page please create a new experience for building a report that can eventually be exported to PDF, optimised for A4 printing

The user should have the option of selecting one of their devices from a drop down, followed by a date/time option using a calender date range selector

There should be an "Update" button that will refresh the report with the latest data according to the users parameter selection.

Depending on the date range the user selects, the X axis formatting on the charts described below will adapt accordingly.

If only 1 day (24h) of date range is selected, the X axis should show the hour of the day at 3h intervals (3am, 6am, 9am, 12pm etc...)
If more than 1 day but less than 1 week of date range is selected, the X axis should show the day dates
If more than 1 week of data range is selected, the X axis should show the week start dates (Monday)

All data points available in wind_data_historical are always plotted.

The top of the report should be two chart components, arranged one on top of another. Each chart visualises the data in wind_data_historical. Use mui charts with AreaChartFillByValue styling. 

The first chart should display the time horizon on the X axis, and the max windspeed on the Y axis. The gradient of the mui chart AreaChartFillByValue should switch from one color to another according to the thresholds configured in the device database. Below amber threshold should be green, above amber threshold but below red threshold would be amber, above red threshold would be red

The second chart should display the time horizon on the X axis, and the average windspeed on the Y axis. The gradient of the mui chart AreaChartFillByValue should switch from one color to another according to the thresholds configured in the device database. Below amber threshold should be green, above amber threshold but below red threshold would be amber, above red threshold would be red

Beneath the charts should be a detailed breakdown table that shows the date, time, average wind speed, max windspeed. The cells in the table should be coloured according to the threshold settings of the device. Perhaps group data by day with collapsible rows for detailed views. 

Additional Requirements:

The report header should show the: 

- App logo
- Device name, location, and configured thresholds
- Report generation timestamp
- Selected date range

The report should also show some summary Statistics:
- Maximum recorded wind speed with timestamp
- Average wind speed
- Total downtime hours for the device
- Percentage of time in each alert state (green/amber/red)





