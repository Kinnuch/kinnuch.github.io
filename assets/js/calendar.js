var SindarinSeason = ["Orvinui", "Ethuil", "Laer", "Iavas", "Enedhin", "Narbeleth", "Rhîw", "Echuir", "Penninor"];
var SindarinDay = ["Orgilion", "Oranor", "Orithil", "Orgaladhad", "Ormenel", "Rodyn"];
var SindarinWeek = ["vain", "daid", "nail", "gannui", "lemmui", "engui", "othui", "dollui", "nedrui", "baenui", "vinibui", "ynegui"];
var MandarinSeason = ["新年", "春季", "夏季", "秋季", "年半", "落季", "冬季", "苏季", "除夕"];
var MandarinDay = ["星辰日", "太阳日", "月亮日", "双树日", "天穹日", "维拉日"];
var MandarinWeek = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

var SeasonDays = [1, 54, 72, 54, 3, 54, 72, 54, 1];
var SeasonOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];

var REPO_OWNER = "Kinnuch";
var REPO_NAME = "kinnuch.github.io";
var COMMITS_URL = "/assets/data/commits.json";

function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function pad2(n) { return n < 10 ? "0" + n : "" + n; }

function dateKey(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function addDays(d, n) {
    var r = new Date(d.getTime());
    r.setDate(r.getDate() + n);
    return r;
}

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

// Reverse: (sindarinYear, season, dayIdx) -> Gregorian Date
// sindarinYear = the Gregorian year in which Orvinui (3/23) of this year occurred.
function seasonDayToDate(year, season, dayIdx) {
    if (season === 0) return new Date(year, 2, 23);
    if (season === 1) return addDays(new Date(year, 2, 24), dayIdx);
    if (season === 2) return addDays(new Date(year, 4, 17), dayIdx);
    if (season === 3) return addDays(new Date(year, 6, 28), dayIdx);
    if (season === 4) return new Date(year, 8, 20 + dayIdx);
    if (season === 5) return addDays(new Date(year, 8, 23), dayIdx);
    if (season === 6) return addDays(new Date(year, 10, 16), dayIdx);
    if (season === 7) {
        var d = new Date(year + 1, 0, 27);
        var leap = isLeap(year + 1);
        for (var i = 0; i < dayIdx; i++) {
            d.setDate(d.getDate() + 1);
            if (leap && d.getMonth() === 1 && d.getDate() === 29) {
                d.setDate(d.getDate() + 1);
            }
        }
        return d;
    }
    if (season === 8) return new Date(year + 1, 2, 22);
    if (season === 9) return new Date(year + 1, 1, 29);
    return null;
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

// Sindarin-year of "today": for seasons 6 (after Nov 16), 7, 9, 8 in Jan-Mar,
// the actual Sindarin year is the previous Gregorian year (Orvinui hasn't fired yet).
var todaySindarinYear = curYear;
if (todaySeason >= 6 && curMonth <= 3) todaySindarinYear = curYear - 1;
var todayKey = dateKey(curDate);

var viewSeason = todaySeason;
var viewYear = todaySindarinYear;

var commitsByDate = null;
var commitsLoadPromise = null;

function loadCommits() {
    if (commitsLoadPromise) return commitsLoadPromise;
    commitsLoadPromise = fetch(COMMITS_URL, { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
            var map = {};
            for (var i = 0; i < rows.length; i++) {
                var c = rows[i];
                var k = (c.date || "").slice(0, 10);
                if (!k) continue;
                (map[k] = map[k] || []).push(c);
            }
            commitsByDate = map;
            return map;
        })
        .catch(function () { commitsByDate = {}; return {}; });
    return commitsLoadPromise;
}

function getYearStr(y) {
    var sy = String(y);
    return sy[3] + sy[2] + sy[1] + sy[0];
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function renderDetail(targetEl, dateObj, season, dayIdx) {
    var key = dateKey(dateObj);
    var sDay = -1, sWeek = -1;
    if (season !== 0 && season !== 4 && season !== 8 && season !== 9) {
        sDay = dayIdx % 6;
        sWeek = (dayIdx - sDay) / 6;
    }
    var html = '';
    html += '<p class="cal-detail-date">' + key + '</p>';
    if (sDay !== -1) {
        html += '<p>' + SindarinDay[sDay] + ' / ' + MandarinDay[sDay] + '</p>';
        html += '<p>Odlad ' + SindarinWeek[sWeek] + ' / 第' + MandarinWeek[sWeek] + '周</p>';
    } else if (season === 4) {
        html += '<p>Arad ' + MandarinWeek[dayIdx] + ' / 年半第' + MandarinWeek[dayIdx] + '天</p>';
    } else if (season === 9) {
        html += '<p>Penninor / 闰日</p>';
    } else if (season === 0) {
        html += '<p>Orvinui / 新年</p>';
    } else if (season === 8) {
        html += '<p>Penninor / 除夕</p>';
    }

    var commits = (commitsByDate && commitsByDate[key]) || [];
    if (commits.length) {
        html += '<div class="cal-commits">';
        html += '<p class="cal-commits-title">本日 ' + commits.length + ' 条更新</p>';
        html += '<ul>';
        for (var i = 0; i < commits.length; i++) {
            var c = commits[i];
            var url = 'https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/commit/' + encodeURIComponent(c.hash);
            html += '<li><a href="' + url + '" target="_blank" rel="noopener">'
                  + '<code>' + escapeHtml(c.short) + '</code> '
                  + escapeHtml(c.msg) + '</a></li>';
        }
        html += '</ul></div>';
    } else {
        html += '<p class="cal-commits-empty">本日无更新</p>';
    }

    targetEl.innerHTML = html;
}

function renderCalendar(season, year) {
    var SYear = getYearStr(year);
    var totalDays = SeasonDays[season] || 1;
    var weeks = Math.ceil(totalDays / 6);
    var isCurrentSeason = (season === todaySeason && year === todaySindarinYear);

    var html = '<div class="cal-header">';
    html += '<button class="cal-nav-btn" id="cal-prev" title="上一季">&#10094;</button>';
    html += '<div class="cal-nav"><span class="cal-season">' + SindarinSeason[season] + ' / ' + MandarinSeason[season] + '</span></div>';
    html += '<button class="cal-nav-btn" id="cal-next" title="下一季">&#10095;</button>';
    html += '</div>';
    html += '<div class="cal-year-bar">' + SYear + '</div>';

    function cellAttrs(season, dayIdx) {
        var d = seasonDayToDate(year, season, dayIdx);
        if (!d) return '';
        var key = dateKey(d);
        var classes = [];
        if (key === todayKey) classes.push('cal-today');
        if (commitsByDate && commitsByDate[key] && commitsByDate[key].length) classes.push('cal-has-commit');
        var attr = ' data-date="' + key + '"';
        attr += ' data-season="' + season + '"';
        attr += ' data-day-idx="' + dayIdx + '"';
        if (classes.length) attr += ' class="' + classes.join(' ') + '"';
        return attr;
    }

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
                    html += '<td' + cellAttrs(season, dayNum)
                          + ' title="第' + MandarinWeek[w] + '周' + MandarinDay[d] + '">'
                          + '<span class="cal-day-num">' + (dayNum+1) + '</span></td>';
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
            html += '<span class="cal-special-day"' + cellAttrs(4, i) + '>Arad ' + MandarinWeek[i] + '</span>';
        }
        html += '</div>';
    } else {
        var label = (season == 0) ? 'Orvinui / 新年' : (season == 8) ? 'Penninor / 除夕' : 'Penninor / 闰日';
        html += '<div class="cal-special"><span class="cal-special-day"' + cellAttrs(season, 0) + '>' + label + '</span></div>';
    }

    html += '<div class="cal-detail" id="cal-detail" style="display:none;"></div>';

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

    var detail = document.getElementById('cal-detail');
    var cells = frame.querySelectorAll('[data-date]');
    var openKey = null;
    for (var i = 0; i < cells.length; i++) {
        cells[i].style.cursor = 'pointer';
        cells[i].addEventListener('click', (function (cell) {
            return function () {
                var key = cell.getAttribute('data-date');
                var s = parseInt(cell.getAttribute('data-season'), 10);
                var di = parseInt(cell.getAttribute('data-day-idx'), 10);
                if (openKey === key && detail.style.display === 'block') {
                    detail.style.display = 'none';
                    openKey = null;
                    return;
                }
                renderDetail(detail, seasonDayToDate(year, s, di), s, di);
                detail.style.display = 'block';
                openKey = key;
            };
        })(cells[i]));
    }
}

loadCommits().then(function () {
    renderCalendar(viewSeason, viewYear);
});
