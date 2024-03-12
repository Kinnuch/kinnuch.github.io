var SindarinSeason = ["Orvinui", "Ethuil", "Laer", "Iavas", "Enedhin", "Narbeleth", "Rhîw", "Echuir", "Penninor"];
var SindarinDay = ["Orgilion", "Oranor", "Orithil", "Orgaladhad", "Ormenel", "Rodyn"];
var SindarinWeek = ["vain", "daid", "nail", "gannui", "lemmui", "engui", "othui", "dollui", "nedrui", "baenui", "vinibui", "ynegui"];
var MandarinSeason = ["新年", "春季", "夏季", "秋季", "年半", "落季", "冬季", "苏季", "除夕"];
var MandarinDay = ["星辰日", "太阳日", "月亮日", "双树日", "天穹日", "维拉日"];
var MandarinWeek = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function showCalendar(Year, Month, Day){
    var Season = -1;
    var Ac = -1;
    var SDay = -1;
    var SWeek = -1;
    var SYear;
    var sy = String(Year);
    SYear = sy[3] + sy[2] + sy[1] + sy[0];
    switch(Month){
        case 1:{
            if (Day >= 27) {Season = 7;}
            else {Season = 6;}
            break;
        }
        case 2:{Season = 7; break;}
        case 3:{
            if (Day <= 21) {Season = 7;}
            else{
                if (Day == 22) {Season = 8;}
                else{
                    if (Day == 23) {Season = 0;}
                    else {Season = 1;}
                }
            }
            break;
        }
        case 4:{Season = 1; break;}
        case 5:{
            if (Day <= 16) {Season = 1;}
            else {Season = 2;}
            break;
        }
        case 6:{Season = 2;break;}
        case 7:{
            if (Day <= 27) {Season = 2;}
            else {Season = 3;}
            break;
        }
        case 8:{Season = 3; break;}
        case 9:{
            if (Day <= 19) {Season = 3;}
            else{
                if (Day > 19 && Day <= 22) {Season = 4;}
                else {Season = 5;}
            }
            break;
        }
        case 10:{Season = 5; break;}
        case 11:{
            if (Day <= 15) {Season = 5;}
            else {Season = 6;}
            break;
        }
        case 12:{Season = 6; break;}
    }
    if (Season != 0 && Season != 4 && Season != 8){
        switch(Season){
            case 1:{
                switch(Month){
                    case 3: Ac = Day - 24;
                    break;
                    case 4: Ac = Day + 7;
                    break;
                    case 5: Ac = Day + 37;
                    break;
                }
                break;
            }
            case 2:{
                switch(Month){
                    case 5: Ac = Day - 17;
                    break;
                    case 6: Ac = Day + 14;
                    break;
                    case 7: Ac = Day + 44;
                    break;
                }
                break;
            }
            case 3:{
                switch(Month){
                    case 7: Ac = Day - 28;
                    break;
                    case 8: Ac = Day + 3;
                    break;
                    case 9: Ac = Day + 34;
                    break;
                }
                break;
            }
            case 5:{
                switch(Month){
                    case 9: Ac = Day - 23;
                    break;
                    case 10: Ac = Day + 7;
                    break;
                    case 11: Ac = Day + 38;
                    break;
                }
                break;
            }
            case 6:{
                switch(Month){
                    case 11: Ac = Day - 16;
                    break;
                    case 12: Ac = Day + 14;
                    break;
                    case 1: Ac = Day + 45;
                    break;
                }
                break;
            }
            case 7:{
                switch(Month){
                    case 1: Ac = Day - 27;
                    break;
                    case 2: Ac = Day + 4;
                    break;
                    case 3: Ac = Day + 32;
                    break;
                }
                break;
            }
        }
    }
    else{

    }
    if (Ac != -1){
        SDay = Ac % 6;
        SWeek = (Ac - SDay) / 6;
    }
    var tsHtml = "<td>" + SindarinDay[SDay] + "</td>";
    tsHtml += "<td>Odlad " + SindarinWeek[SWeek] + "</td>";
    tsHtml += "<td>" + SindarinSeason[Season] + "</td>";
    tsHtml += "<td>" + SYear + "</td>";
    var tsbody = document.getElementById('Sindarin');
    tsbody.innerHTML = tsHtml;
    var tmHtml = "<td>" + String(Year) + "年</td>";
    tmHtml += "<td>" + MandarinSeason[Season] + "</td>";
    tmHtml += "<td>第" + MandarinWeek[SWeek] + "周</td>";
    tmHtml += "<td>" + MandarinDay[SDay] + "</td>";
    var tmbody = document.getElementById('Mandarin');
    tmbody.innerHTML = tmHtml;
}

var curDate = new Date();
var curYear = curDate.getFullYear();
var curMonth = curDate.getMonth() + 1;
var curDay = curDate.getDate();
showCalendar(curYear, curMonth, curDay);
