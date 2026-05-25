var SindarinSeason = ["Orvinui", "Ethuil", "Laer", "Iavas", "Enedhin", "Narbeleth", "Rhîw", "Echuir", "Penninor"];
var SindarinDay = ["Orgilion", "Oranor", "Orithil", "Orgaladhad", "Ormenel", "Rodyn"];
var SindarinWeek = ["vain", "daid", "nail", "gannui", "lemmui", "engui", "othui", "dollui", "nedrui", "baenui", "vinibui", "ynegui"];
var MandarinSeason = ["新年", "春季", "夏季", "秋季", "年半", "落季", "冬季", "苏季", "除夕"];
var MandarinDay = ["星辰日", "太阳日", "月亮日", "双树日", "天穹日", "维拉日"];
var MandarinWeek = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

var SeasonDays = [1, 54, 72, 54, 3, 54, 72, 54, 1];
var SeasonOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function getSeason(Year, Month, Day) {
    var Season = -1;
    switch(Month){
        case 1: Season = (Day >= 27) ? 7 : 6; break;
        case 2: Season = (Day == 29) ? 9 : 7; break;
        case 3:
            if (Day <= 21) Season = 7;
            else if (Day == 22) Season = 8;
            else if (Day == 23) Season = 0;
            else Season = 1;
            break;
        case 4: Season = 1; break;
        case 5: Season = (Day <= 16) ? 1 : 2; break;
        case 6: Season = 2; break;
        case 7: Season = (Day <= 27) ? 2 : 3; break;
        case 8: Season = 3; break;
        case 9:
            if (Day <= 19) Season = 3;
            else if (Day <= 22) Season = 4;
            else Season = 5;
            break;
        case 10: Season = 5; break;
        case 11: Season = (Day <= 15) ? 5 : 6; break;
        case 12: Season = 6; break;
    }
    return Season;
}

function getAc(Season, Month, Day) {
    var Ac = -1;
    if (Season == 0 || Season == 4 || Season == 8 || Season == 9) return Ac;
    switch(Season){
        case 1:
            if (Month==3) Ac=Day-24; else if(Month==4) Ac=Day+7; else if(Month==5) Ac=Day+37;
            break;
        case 2:
            if (Month==5) Ac=Day-17; else if(Month==6) Ac=Day+14; else if(Month==7) Ac=Day+44;
            break;
        case 3:
            if (Month==7) Ac=Day-28; else if(Month==8) Ac=Day+3; else if(Month==9) Ac=Day+34;
            break;
        case 5:
            if (Month==9) Ac=Day-23; else if(Month==10) Ac=Day+7; else if(Month==11) Ac=Day+38;
            break;
        case 6:
            if (Month==11) Ac=Day-16; else if(Month==12) Ac=Day+14; else if(Month==1) Ac=Day+45;
            break;
        case 7:
            if (Month==1) Ac=Day-27; else if(Month==2) Ac=Day+4; else if(Month==3) Ac=Day+32;
            break;
    }
    return Ac;
}

var curDate = new Date();
var curYear = curDate.getFullYear();
var curMonth = curDate.getMonth() + 1;
var curDay = curDate.getDate();
var todaySeason = getSeason(curYear, curMonth, curDay);
var todayAc = getAc(todaySeason, curMonth, curDay);
var todaySDay = -1, todaySWeek = -1;
if (todayAc != -1) {
    todaySDay = todayAc % 6;
    todaySWeek = (todayAc - todaySDay) / 6;
}

var viewSeason = todaySeason;
var viewYear = curYear;

function getYearStr(y) {
    var sy = String(y);
    return sy[3] + sy[2] + sy[1] + sy[0];
}

function renderCalendar(season, year) {
    var SYear = getYearStr(year);
    var totalDays = SeasonDays[season] || 1;
    var weeks = Math.ceil(totalDays / 6);
    var isCurrentSeason = (season === todaySeason && year === curYear);

    var html = '<div class="cal-header">';
    html += '<button class="cal-nav-btn" id="cal-prev" title="上一季">&#10094;</button>';
    html += '<div class="cal-nav"><span class="cal-season">' + SindarinSeason[season] + ' / ' + MandarinSeason[season] + '</span></div>';
    html += '<button class="cal-nav-btn" id="cal-next" title="下一季">&#10095;</button>';
    html += '</div>';
    html += '<div class="cal-year-bar">' + SYear + '</div>';

    if (totalDays > 1 && season != 4 && season != 9) {
        html += '<table class="cal-grid"><thead><tr>';
        for (var d = 0; d < 6; d++) {
            html += '<th title="' + MandarinDay[d] + '">' + SindarinDay[d].substring(0,3) + '</th>';
        }
        html += '</tr></thead><tbody>';
        for (var w = 0; w < weeks; w++) {
            html += '<tr>';
            for (var d = 0; d < 6; d++) {
                var dayNum = w * 6 + d;
                if (dayNum < totalDays) {
                    var isToday = isCurrentSeason && (w === todaySWeek && d === todaySDay);
                    var cls = isToday ? ' class="cal-today"' : '';
                    html += '<td' + cls + ' title="第' + MandarinWeek[w] + '周' + MandarinDay[d] + '"><span class="cal-day-num">' + (dayNum+1) + '</span></td>';
                } else {
                    html += '<td></td>';
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
    } else if (season == 4) {
        html += '<div class="cal-special">';
        for (var i = 0; i < 3; i++) {
            var isToday2 = isCurrentSeason && (curDay - 20 === i);
            var cls2 = isToday2 ? ' cal-today' : '';
            html += '<span class="cal-special-day' + cls2 + '">Arad ' + MandarinWeek[i] + '</span>';
        }
        html += '</div>';
    } else {
        var label = (season == 0) ? 'Orvinui / 新年' : (season == 8) ? 'Penninor / 除夕' : 'Penninor / 闰日';
        var todayCls = isCurrentSeason ? ' cal-today' : '';
        html += '<div class="cal-special"><span class="cal-special-day' + todayCls + '">' + label + '</span></div>';
    }

    if (isCurrentSeason) {
        html += '<div class="cal-detail" id="cal-detail" style="display:none;">';
        if (todaySDay != -1) {
            html += '<p>' + SindarinDay[todaySDay] + ' / ' + MandarinDay[todaySDay] + '</p>';
            html += '<p>Odlad ' + SindarinWeek[todaySWeek] + ' / 第' + MandarinWeek[todaySWeek] + '周</p>';
        } else if (season == 4) {
            html += '<p>Arad ' + MandarinWeek[curDay - 20] + ' / 年半第' + MandarinWeek[curDay - 20] + '天</p>';
        } else if (season == 9) {
            var leap = ((curYear % 100) % 12) / 4;
            if (leap == 0) leap = 3;
            html += '<p>Arad ' + SindarinWeek[2 + leap] + ' / 闰日</p>';
        }
        html += '<p>' + SindarinSeason[season] + ' ' + SYear + '</p>';
        html += '</div>';
    }

    var frame = document.getElementById('CalendarFrame');
    frame.innerHTML = html;

    document.getElementById('cal-prev').addEventListener('click', function() {
        var idx = SeasonOrder.indexOf(viewSeason);
        if (idx > 0) { viewSeason = SeasonOrder[idx - 1]; }
        else { viewSeason = SeasonOrder[8]; viewYear--; }
        renderCalendar(viewSeason, viewYear);
    });
    document.getElementById('cal-next').addEventListener('click', function() {
        var idx = SeasonOrder.indexOf(viewSeason);
        if (idx < 8) { viewSeason = SeasonOrder[idx + 1]; }
        else { viewSeason = SeasonOrder[0]; viewYear++; }
        renderCalendar(viewSeason, viewYear);
    });

    if (isCurrentSeason) {
        var todayCells = frame.querySelectorAll('.cal-today');
        var detail = document.getElementById('cal-detail');
        for (var i = 0; i < todayCells.length; i++) {
            todayCells[i].style.cursor = 'pointer';
            todayCells[i].addEventListener('click', function() {
                detail.style.display = (detail.style.display === 'none') ? 'block' : 'none';
            });
        }
    }
}

renderCalendar(viewSeason, viewYear);
