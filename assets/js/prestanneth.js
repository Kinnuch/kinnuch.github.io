function replaceStr(inString, inPlace, inChar) {
    let strArr = inString.split('');
    strArr[inPlace] = inChar;
    return strArr.join('');
}

function getSoftMutation(inWord, isAncient) {
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "b");
            break;
        case "t":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "d");
            break;
        case "c":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "g");
            break;
        case "b":
            if (isAncient == 1) ret = replaceStr(ret, 0, "m");
            else ret = replaceStr(ret, 0, "v");
            break;
        case "d":
            if (inWord[1] != "h") {
                if (isAncient == 1) ret = replaceStr(ret, 0, "n");
                else {
                    ret = replaceStr(ret, 0, "h");
                    ret = "d" + ret; 
                }
            }
            break;
        case "g":
            if (isAncient == 1) ret = replaceStr(ret, 0, "ñ");
            else ret = replaceStr(ret, 0, "\'");
            break;
        case "h":
            // include the "hw" case
            ret = "c" + ret;
            break;
        case "s":
            ret = replaceStr(ret, 0, "h");
            break;
        case "m":
            ret = replaceStr(ret, 0, "v");
            break;
        case "l":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "h");
                ret = replaceStr(ret, 1, "l");
                ret = "t" + ret;
            }
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "h");
                ret = replaceStr(ret, 1, "r");
                ret = "t" + ret;
            }
            break;
    }
    return ret;
}

function getNasalMutation(inParticle, inWord, isHard, isAncient) {
    let retP = inParticle;
    const pLen = retP.length;
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "p" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            else retP = retP.substr(0, pLen - 1);
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "b":
            if (isHard == 1) retP = replaceStr(retP, pLen - 1, "m");
            else {
                if (isAncient == 1) ret = "m" + ret;
                else ret = replaceStr(ret, 0, "m");
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "d":
            if (isHard == 0 && inWord[1] != "h") {
                if (isAncient == 1) ret = "n" + ret;
                else ret = replaceStr(ret, 0, "n");
                if (inWord[1] != "r") retP = retP.substr(0, pLen - 1);
            }
            break;
        case "g":
            if (isHard == 1) {
                if (inWord[1] != "w") retP = replaceStr(retP, pLen - 1, "ñ");
                else ret = replaceStr(ret, 0, "\'");
            }
            else {
                if (isAncient == 1) {
                    ret = "ñ" + ret;
                    retP = retP.substr(0, pLen - 1);
                }
                else {
                    if (inWord[1] == "l" || inWord[1] == "r" || inWord[1] == "w") retP = replaceStr(retP, pLen - 1, "ñ");
                    else {
                        ret = replaceStr(ret, 0, "ñ");
                        retP = retP.substr(0, pLen - 1);
                    }
                }
            }
            break;
        case "h":
            // include the "hw" case
            if (isHard == 1 && inWord[1] == "w") ret = replaceStr(ret, 0, "\'");
            else {
                ret = "c" + ret;
                if (isHard == 0) retP = retP.substr(0, pLen - 1);
            }
            break;
        case "s":
            if (isHard == 1) ret = replaceStr(ret, 0, "h");
            else retP = retP.substr(0, pLen - 1);
            break;
        case "m":
            if (isHard == 1) retP = replaceStr(retP, pLen - 1, "m");
            else retP = retP.substr(0, pLen - 1);
            break;
        case "f":
            if (isHard == 0) retP = retP.substr(0, pLen - 1);
            break;
        case "n":
            if (isHard == 0) retP = retP.substr(0, pLen - 1);
            break;
        case "l":
            if (inWord[1] == "h") {
                if (isHard == 1) {
                    ret = replaceStr(ret, 0, "\'");
                    ret = replaceStr(ret, 1, "l");
                }
                else {
                    ret = "l" + ret.substr(2, ret.length - 2);
                    retP = replaceStr(retP, pLen - 1, "t");
                    retP = retP + "h"; 
                }
            }
            else if (isHard == 0) retP = retP.substr(0, pLen - 1);
            break;
        case "r":
            if (inWord[1] == "h") {
                if (isHard == 1) {
                    ret = replaceStr(ret, 0, "\'");
                    ret = replaceStr(ret, 1, "r");
                }
                else {
                    ret = "r" + ret.substr(2, ret.length - 2);
                    retP = replaceStr(retP, pLen - 1, "t");
                    retP = retP + "h";
                }
            }
            else {
                retP = replaceStr(retP, pLen - 1, "d");
                retP = retP + "h";
            }
            break;
    }
    return retP + " " + ret;
}

function getMixedMutation(inWord, isAncient) {
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "b");
                ret = "e" + "-" + ret;
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "d");
                if (inWord[1] == "r") ret = "e" + "n" + "-" + ret;
                else ret = "e" + "-" + ret;
            }
            else ret = "e" + "-" + ret;
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "g");
                ret = "e" + "-" + ret;
            }
            break;
        case "b":
            if (isAncient == 1) ret = "e" + "-" + "m" + ret;
            else ret = "e" + "-" + ret;
            break;
        case "d":
            if (inWord[1] != "h") {
                if (isAncient == 1) ret = "e" + "-" + "n" + ret;
                else if (inWord[1] != "r") ret = "e" + "-" + ret;
            }
            break;
        case "g":
            if (isAncient == 1) ret = "e" + "-" + "ñ" + ret;
            else {
                if (inWord[1] == "l" || inWord[1] == "r" || inWord[1] == "w") 
                    ret = "e" + "ñ" + "-" + ret;
                else ret = "e" + "-" + ret;
            }
            break;
        case "h":
            // include the "hw" case
            if (inWord[1] == "w") {
                ret = replaceStr(ret, 0, "\'");
                ret = "e" + "-" + ret;
            }
            else ret = "e" + "-" + "c" + ret;
            break;
        case "s":
            ret = replaceStr(ret, 0, "h");
            ret = "e" + "-" + ret;
            break;
        case "m":
            ret = "e" + "-" + ret;
            break;
        case "l":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 1, "l");
            }
            ret = "e" + "-" + ret;
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 1, "r");
                ret = "e" + "-" + ret;
            }
            else ret = "e" + "d" + "h" + "-" + ret;
            break;
        default:
            ret = "e" + "n" + "-" + ret;
    }
    return ret;
}

function getMixedMutationHard(inWord) {
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "b");
            break;
        case "t":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "d");
            break;
        case "c":
            if (inWord[1] != "h") ret = replaceStr(ret, 0, "g");
            break;
        case "h":
            if (inWord[1] == "w") ret = replaceStr(ret, 0, "\'");
            else ret = "c" + ret;
            break;
        case "s":
            ret = replaceStr(ret, 0, "h");
            break;
        case "l":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 1, "l");
            }
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 0, "r");
            }
            break;
    }
    return ret;
}

function getLiquidMutation(inWord) {
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "p" + ret;
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "t" + ret;
            }
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
            }
            break;
        case "b":
            ret = replaceStr(ret, 0, "v");
            break;
        case "d":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "d" + ret;
            }
            break;
        case "g":
            ret = replaceStr(ret, 0, "\'");
            break;
        case "h":
            // include the hw case
            ret = "c" + ret;
            break;
        case "m":
            ret = replaceStr(ret, 0, "v");
            break;
        case "l":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 1, "l");
            }
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "\'");
                ret = replaceStr(ret, 1, "r");
            }
            break;
    }
    return ret;
}

function getStopMutation(inParticle, inWord, isAncient) {
    let retP = inParticle;
    const pLen = retP.length;
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "p" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            else{
                retP = replaceStr(retP, pLen - 1, "t");
                retP = retP + "h";
            }
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "b":
            if (isAncient == 1) ret = "m" + ret;
            retP = retP.substr(0, pLen - 1);
            break;
        case "d":
            if (isAncient == 1) ret = "n" + ret;
            retP = retP.substr(0, pLen - 1);
            break;
        case "g":
            if (isAncient == 1) ret = "ñ" + ret;
            retP = retP.substr(0, pLen - 1);
            break;
        case "h":
            // include the "hw" case
            if (inWord[1] == "w") {
                ret = ret.substr(1, ret.length - 1);
                retP = replaceStr(retP, pLen - 1, "t");
                retP = retP + "h";
            }
            else {
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "s":
            retP = replaceStr(retP, pLen - 1, "s");
            break;
        case "m":
            retP = retP.substr(0, pLen - 1);
            break;
        case "f":
            retP = replaceStr(retP, pLen - 1, "p");
            retP = retP + "h";
            break;
        case "n":
            retP = retP.substr(0, pLen - 1);
            break;
        case "l":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "h");
                ret = replaceStr(ret, 1, "l");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 0, "h");
                ret = replaceStr(ret, 1, "r");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
    }
    return retP + " " + ret;
}

function getHMutation(inParticle, inWord) {
    let retP = inParticle;
    const pLen = retP.length;
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "p" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "h":
            // include the hw case
            ret = "c" + ret;
            retP = retP.substr(0, pLen - 1);
            break;
        case "s":
            retP = replaceStr(retP, pLen - 1, "s");
            break;
        case "l":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "l" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "r":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "r" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
        case "i":
            const tV = inWord[1];
            if (tV == "a" || tV == "e" || tV == "o" || tV == "u" 
             || tV == "â" || tV == "ê" || tV == "ô" || tV == "û") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 1);
            }
            break;
    }
    return retP + " " + ret;
}

function getDHMutation(inParticle, inWord) {
    let retP = inParticle;
    pLen = retP.length;
    let ret = inWord;
    switch (inWord[0]) {
        case "p":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "p" + ret;
                retP = retP.substr(0, pLen - 2);
            }
            break;
        case "t":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "t" + ret;
                retP = retP.substr(0, pLen - 2);
            }
            break;
        case "c":
            if (inWord[1] != "h") {
                ret = replaceStr(ret, 0, "h");
                ret = "c" + ret;
                retP = retP.substr(0, pLen - 2);
            }
            break;
        case "h":
            if (inWord[1] == "w") {
                ret = ret.substr(1, ret.length - 1);
                retP = replaceStr(retP, pLen - 2, "t");
            }
            break;
        case "l":
            if (inWord[1] == "h") {
                ret[1] = "l";
                ret = ret.substr(1, ret.length - 1);
                retP = replaceStr(retP, pLen - 2, "t");
            }
            else retP = retP.substr(0, pLen - 1);
            break;
        case "r":
            if (inWord[1] == "h") {
                ret = replaceStr(ret, 1, "r");
                ret = ret.substr(1, ret.length - 1);
                retP = replaceStr(retP, pLen - 2, "t");
            }
            break;
    }
    return retP + " " + ret;
}

function getSyllableParsing(inWord, retPattern) {
    // retPattern: 0---parsing 1---sundóma 2---initial vowel/consonant judgement
    let tWord = inWord;
    let syllableArr = [];
    const vowels = "aeiouyáéíóúýâêîôûŷ";
    if (retPattern == 0) {
        let syllablePattern = new RegExp(`(^i(?=${vowels})|[^${vowels}]?|th|ch|^lh|^rh|^bl|^gl|^gr|^gw|^tr|^dr|ph|bh|dh|^thr|^thl|^\(m\)b|^\(n\)d|\(n\)g)?([${vowels}]|ai|au|ae|ui|oe){1}([^${vowels}])*$`,'i');
        while (tWord.length > 0) {
            let nowSyllable = tWord.match(syllablePattern);
            if (nowSyllable) {
                syllableArr.push(nowSyllable[0]);
                tWord = tWord.substr(0, tWord.length - nowSyllable[0].length);
            }
        }
        if (syllableArr) return syllableArr.reverse().join(" ");
        else return "";
    }
    else if (retPattern == 1) {
        let syllablePattern = new RegExp(`([${vowels}]){1}(?=[^${vowels}]*$)`,'i');
        let nowSyllable = tWord.match(syllablePattern);
        if (nowSyllable) return nowSyllable[0];
        else return "";
    }
    else if (retPattern == 2) {
        let syllablePattern = new RegExp(`^([^${vowels}]|i(?=${vowels}))`,'i');
        let nowSyllable = tWord.match(syllablePattern);
        if (nowSyllable) return 1; // consonant
        else return 0; // vowel
    }
}

function getPast(inWord, inPerson, specialPattern) {
    let fiWord = inWord[inWord.length - 1];
    let isWeak = fiWord == "a";
    let ret = inWord;
    if (isWeak == false) { // strong verb
        let isSgSyllable = getSyllableParsing(inWord, 0).indexOf(" ");
        let sundoma = getSyllableParsing(inWord, 1);
        let sundomaPlace = inWord.lastIndexOf(sundoma);
        let isConsonant = getSyllableParsing(inWord, 2);
        if (specialPattern == 1) {
            ret = replaceStr(ret, sundomaPlace, "u"); // o > u special
            sundoma = "u";
        }
        if (fiWord == "b" || fiWord == "d" || fiWord == "g") { // b,d,g final strong verb
            if (inPerson == 4) {
                ret = ret.substr(0, ret.length - 1);
                if (fiWord == "b") ret = ret + "mp";
                else if (fiWord == "d") ret = ret + "nt";
                else ret = ret + "nc";
            }
            else {
                ret = ret.substr(0, ret.length - 1);
                if (fiWord == "b") ret = ret + "mme";
                else if (fiWord == "d") ret = ret + "nne";
                else ret = ret + "nge";
                ret = ret + personArr[inPerson];
            }
        }
        else {
            if (inPerson != 4 && fiWord == "w") ret = ret.substr(0, ret.length - 1);
            if (sundoma == "a") {
                if (isSgSyllable == -1) {
                    if (inPerson == 4) ret = ret.substring(0, sundomaPlace + 1) + "u" + ret.substring(sundomaPlace + 1, ret.length);
                    else {
                        ret = replaceStr(ret, sundomaPlace, "ó");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
                else {
                    if (inPerson == 4) ret = replaceStr(ret, sundomaPlace, "o");
                    else {
                        ret = replaceStr(ret, sundomaPlace, "ó");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
            }
            else if (sundoma == "e" || sundoma == "i") {
                if (isSgSyllable == -1) {
                    if (inPerson == 4) ret = replaceStr(ret, sundomaPlace, "î");
                    else {
                        ret = replaceStr(ret, sundomaPlace, "í");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
                else {
                    if (inPerson == 4) ret = replaceStr(ret, sundomaPlace, "i");
                    else {
                        ret = replaceStr(ret, sundomaPlace, "í");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
            }
            else if (sundoma == "o" || sundoma == "u") {
                if (isSgSyllable == -1) {
                    if (inPerson == 4) ret = replaceStr(ret, sundomaPlace, "û");
                    else {
                        ret = replaceStr(ret, sundomaPlace, "ú");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
                else {
                    if (inPerson == 4) ret = replaceStr(ret, sundomaPlace, "u");
                    else {
                        ret = replaceStr(ret, sundomaPlace, "ú");
                        ret = ret + "e" + personArr[inPerson];
                    }
                }
            }
            else if (sundoma == "y") {
                ret = replaceStr(ret, sundomaPlace, "i");
                if (inPerson == 4) ret = ret.substring(0, sundomaPlace + 1) + "u" + ret.substring(sundomaPlace + 1, ret.length);
                else {
                    ret = ret.substring(0, sundomaPlace + 1) + "ú" + ret.substring(sundomaPlace + 1, ret.length);
                    ret = ret + "e" + personArr[inPerson];
                }
                if (sundomaPlace == 0) ret = "u" + ret;
            }
        }
        // deal the soft mutation last(string length is changed)
        if (isConsonant == 1 && isSgSyllable == -1) {
            let isAncient = 0;
            if (ret[0] == "(") {
                isAncient = 1;
                ret = ret.substr(3, ret.length - 3);
            }
            ret = getSoftMutation(ret, isAncient);
            if (ret[0] == "\'") {
                ret = ret.substr(1, ret.length - 1);
                if (ret[0] == "l" || ret[0] == "r" || ret[0] == "w") ret = sundoma + ret;
            }
            else ret = sundoma + ret;
        }
    }
    else { // weak verb, 0 for vi, 1 for vt
        if (inPerson == 4) {
            if (specialPattern == 0) ret = ret + "s";
            else ret = ret + "nt";
        } 
        else {
            if (specialPattern == 0) ret = ret + "sse" + personArr[inPerson];
            else {
                if (ret.length > 3 && ret[ret.length - 1] == "a" && ret[ret.length - 2] == "n" && ret[ret.length - 3] == "n") {
                    ret = ret.substr(0, ret.length - 1);
                    ret = ret + "e" + personArr[inPerson];
                }
                else ret = ret + "nne" + personArr[inPerson];
            }
        }
    }
    return ret;
}

function getRandomLine() {
    const randomIndex = Math.floor(Math.random() * dataArray.length);
    const randomLine = dataArray[randomIndex];
    return randomLine;
}

function updateLine() {
    const randomLine = getRandomLine();
    const questionType = document.getElementById("questionType").value;
    if (!questionType) return;
    document.getElementById("Prestanneth").innerText = "Sí: 当前：" + randomLine[0] + "\nEnglish Meaning: " + randomLine[1].trim() + "\n汉语释义：" + randomLine[2].trim();
    let isAncient = 0;
    let inWord = randomLine[0];
    if (inWord[0] == "(") {
        isAncient = 1;
        inWord = inWord.substr(3, inWord.length - 3);
    }
    switch (questionType) {
        case "2":
            currentAnswer = "i " + getSoftMutation(inWord, isAncient);
            break;
        case "3":
            currentAnswer = randomLine[3];
            break;
        case "4":
            currentAnswer = getNasalMutation("in", randomLine[3], 0, isAncient);
            break;
        case "5":
            currentAnswer = getMixedMutation(inWord, isAncient);
            break;
        case "6":
            currentAnswer = getNasalMutation("an", inWord, 1, isAncient);
            break;
        case "7":
            currentAnswer = "anin " + getMixedMutationHard(inWord);
            break;
        case "8":
            currentAnswer = "egor " + getLiquidMutation(inWord);
            break;
        case "9":
            currentAnswer = getStopMutation("od", inWord, isAncient);
            break;
        case "10":
            currentAnswer = getHMutation("ah", inWord);
            break;
        case "11":
            currentAnswer = getDHMutation("nedh", inWord);
            break;
        default:
            console.log("error");
            break;
    }
    document.getElementById("resultFeedback").innerText = "";
    document.getElementById("userInput").value = "";
}

function checkAnswer() {
    const userAnswer = document.getElementById("userInput").value.trim();
    const output = document.getElementById("resultFeedback");
    if (userAnswer == "") {
        output.innerText = "Teitho nad erui! 请先输入答案！";
        return;
    }
    if (userAnswer.toLowerCase() === currentAnswer.toLowerCase()) {
        output.innerText = "Thand! 正确！";
    }
    else {
        output.innerText = "Althand~i nangweth thand: 错误~正确答案应该是：\n" + currentAnswer;
    }
}

async function showQuestion() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        dataArray = csvData.trim().split("\n").map(line => line.split(","));
        updateLine();
        document.getElementById("refreshButton").addEventListener("click", updateLine);
        document.getElementById("checkAnswer").addEventListener("click", checkAnswer);
        document.getElementById("questionType").addEventListener("change", updateLine);
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let personArray = new Array();
personArray[0] = "我"; personArray[1] = "你和我"; personArray[2] = "（亲密）你"; personArray[3] = "（正式）你/您"
personArray[4] = "他/她/它"; personArray[5] = "（不含听话者）我们"; personArray[6] = "（包含听话者）我们";
personArray[7] = "你们"; personArray[8] = "他们/她们/它们";
let personArr = new Array();
personArr[0] = "n"; personArr[1] = "nc"; personArr[2] = "g"; personArr[3] = "l";
personArr[4] = ""; personArr[5] = "f"; personArr[6] = "b";
personArr[7] = "dh"; personArr[8] = "r";
let dataArray;
let currentAnswer = "";
showQuestion();