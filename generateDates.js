var moment = require('moment');
var fs = require('fs');

var since = '2015-04-01';
var until = '2015-05-15';

var sinceDate = moment(since, 'YYYY-MM-DD');
var untilDate = moment(until, 'YYYY-MM-DD');

var dates = [];

var days = parseInt(moment.duration(untilDate.diff(sinceDate)).asDays());

var prevDate = sinceDate;
for (var i = 0; i < days; i++) {

  if (i === 0) {
    var nextDate = moment(since, 'YYYY-MM-DD').add(1, 'd');
    var interval = {
      since: sinceDate.format('YYYY-MM-DD'),
      until: nextDate.format('YYYY-MM-DD')

    };

    dates.push(interval);

  } else {

    var previous = dates[i - 1];

    var prevDate = moment(previous.since, 'YYYY-MM-DD').add(1, 'd');
    var nextDate = moment(previous.until, 'YYYY-MM-DD').add(1, 'd');

    var interval = {
      since: prevDate.format('YYYY-MM-DD'),
      until: nextDate.format('YYYY-MM-DD')

    };

    dates.push(interval);
  }
}


console.log(JSON.stringify(dates, true, '\t'));

fs.writeFileSync('dates3.json', JSON.stringify(dates, true, '\t'));