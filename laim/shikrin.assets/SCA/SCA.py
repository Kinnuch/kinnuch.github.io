import os
import regex
import zipfile
from pathlib import Path
from dataclasses import dataclass

def load_categories(category_file: str) -> dict:
    """
    读取 Category.txt，返回音类字典
    格式：{"V": "aeiou", "C": "bcdfg...", ...}
    """
    categories = {}
    try:
        with open(category_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):  # 跳过空行和注释
                    continue
                
                # 分割键值对
                if '=' not in line:
                    continue  # 或抛出错误
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().replace(' ', '')  # 移除空格
                
                # 验证键是否为单个大写字母
                if len(key) != 1 or not key.isupper():
                    continue  # 或抛出错误
                
                # 去重并保留顺序（例如 "aab" -> "ab"）
                seen = set()
                unique_value = ''.join([c for c in value if not (c in seen or seen.add(c))])
                
                categories[key] = unique_value
    except FileNotFoundError:
        raise Exception(f"Category file {category_file} not found")
    
    return categories

def load_replacements(replace_file: str) -> list[tuple[str, str]]:
    """
    读取 Replace.txt，返回替换规则列表，按原始字符长度降序排列
    格式：[(原始字符, 替换字符), ...]
    """
    replacements = []
    try:
        with open(replace_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "|" not in line:
                    continue  # 或抛出错误
                original, replacement = line.split("|", 1)
                original = original.strip()
                replacement = replacement.strip()
                replacements.append((original, replacement))
                
        # 按原始字符长度降序排列，确保长模式优先匹配
        replacements.sort(key=lambda x: -len(x[0]))
    except FileNotFoundError:
        raise Exception(f"Replace file {replace_file} not found")
    return replacements

def apply_replacements(text: str, replacements: list) -> str:
    """应用替换规则（原始→临时字符）"""
    for original, replacement in replacements:
        text = text.replace(original, replacement)
    # 然后去掉用于隔开字符的点号
    text = text.replace(".", "")
    return text

def revert_replacements(text: str, replacements: list) -> str:
    """恢复替换规则（临时字符→原始）"""
    for original, replacement in reversed(replacements):
        text = text.replace(replacement, original)
    return text

def load_lexicon(lexicon_file: str) -> list[str]:
    """
    读取 Lexicon.txt，返回待处理词汇列表
    格式：["word1", "word2", ...]
    """
    lexicon = []
    try:
        with open(lexicon_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                lexicon.append(line)
    except FileNotFoundError:
        raise Exception(f"Lexicon file {lexicon_file} not found")
    return lexicon

@dataclass
class Rule:
    target: str          # 目标音素（可能包含类别或临时类别）
    replacement: str     # 替换音素（支持特殊符号如 \\, 2）
    left_context: list[str]    # 左上下文正则模式
    right_context: list[str]   # 右上下文正则模式
    left_exception: str = ""    # 需要排除的左正则模式
    right_exception: str = ""    # 需要排除的右正则模式
    is_intermediate: bool = False  # 是否为中间体标记
    period_name: str = "" # 中间体名称

def parse_rule(rule_str: str, categories: dict, replacements: list) -> Rule:
    """
    解析单条音变规则，返回 Rule 对象
    格式：目标 > 替换 / 左上下文_右上下文
    """
    # 判断中间体
    if "-*" in rule_str:
        tmp_period_name = rule_str.split("-*")[1].strip()
        return Rule("", "", [""], [""], "", "", is_intermediate=True, period_name=tmp_period_name)

    # 分割目标/替换和上下文
    left_context, right_context = [], []
    if "/" in rule_str:
        rule_part, context_part = rule_str.split("/", 1)    # 先分出替换部分和上下文部分
        if "-" in context_part:
            context_part, exception_part = context_part.strip().split("-", 1) # 再分出排除部分
        else:
            exception_part = ""
        if "," in context_part:
            context_array = context_part.strip().split(",")     # 再分出各条上下文
            for each_context in context_array:
                now_left_context, now_right_context = each_context.strip().split("_", 1)
                left_context.append(now_left_context)
                right_context.append(now_right_context)
        else:
            now_left_context, now_right_context = context_part.strip().split("_", 1)
            left_context.append(now_left_context)
            right_context.append(now_right_context)
    else:
        rule_part = rule_str
        left_context, right_context = [""], [""]
        exception_part = ""
    
    # 分割目标和替换
    target, replacement = rule_part.strip().split(">", 1)
    if exception_part != "":
        left_e, right_e = exception_part.strip().split("_", 1)
    else:
        left_e, right_e = "", ""
    target = target.strip()
    replacement = replacement.strip()

    # 替换目标中满足规则的连字
    target = apply_replacements(target, replacements)
    replacement = apply_replacements(replacement, replacements)
    left_e = apply_replacements(left_e, replacements)
    right_e = apply_replacements(right_e, replacements)
    left_context = [apply_replacements(each_context, replacements) for each_context in left_context]
    right_context = [apply_replacements(each_context, replacements) for each_context in right_context]

    # 处理目标/替换中的类别（如 V, [aei]）
    target = _expand_category(target, categories)
    # replacement = _expand_category(replacement, categories)

    # 处理左/右上下文中的符号（# 词边界、... 跨位置、() 可选元素）
    left_pattern = [_context_to_regex(each_context.strip(), categories, 0) for each_context in left_context]
    right_pattern = [_context_to_regex(each_context.strip(), categories, 1) for each_context in right_context]
    left_e = _context_to_regex(left_e.strip(), categories, 0)
    right_e = _context_to_regex(right_e.strip(), categories, 1)

    return Rule(target, replacement, left_pattern, right_pattern, left_e, right_e)

def _expand_category(s: str, categories: dict) -> str:
    """
    将字符串中的音类符号（如 V 或 [aei]）展开为字符集合
    示例：V → aeiou，[ao] → ao
    """
    return regex.sub(r'[A-Z]', lambda m: '[' + categories[m.group(0)] + ']', s)

def _context_to_regex(context: str, categories: dict, direction: int) -> str:
    """
    将上下文描述（如 "a(...)b#..."）转换为正则表达式模式
    """
    regex = []
    i = 0
    while i < len(context):
        c = context[i]
        if c == '#':
            if direction == 0:
                regex.append('^')
            else:
                regex.append('$')
        elif c == '?': 
            # 原...跨位置匹配，但.用于区分非二合字母导致去点时误伤，现改为?
            regex.append('.*')  # 跨位置匹配
        elif c == '(':
            # 可选元素，如 (c) → (?:c)?
            j = i + 1
            while j < len(context) and context[j] != ')':
                j += 1
            inner = _expand_category(context[i+1:j], categories)
            regex.append(f'(?:{inner})?')
            i = j
        else:
            # 普通字符或类别
            expanded = _expand_category(c, categories)
            regex.append(expanded)
        i += 1
    return ''.join(regex)

def systematical_replacement(waitingstr: str, pos: int) -> str:
    """
    系统化替换，返回替换后的字符串
    pos 是形如[aeiou]中本次匹配到的具体字符
    waitingstr 是替换音素中被展开的范畴，等待将对应的字符替换，形如aei
    """
    if pos > len(waitingstr):
        return ""
    else:
        return waitingstr[pos]

def _apply_replacement(target: str, replacement: str, original: str, categories: dict) -> str:
    """
    根据替换规则生成实际替换结果
    """
    if replacement == "\\":
        return target[::-1]  # 翻转
    elif replacement == "2":
        return target * 2    # 双写
    elif replacement == "":
        return ""           # 脱落
    else:
        lbrac = original.find('[')
        rbrac = original.find(']')
        pos = 9999
        if (lbrac == -1 and rbrac == -1):
            pos = original.find(target)
        else:
            lpart, temp = original.strip().split('[')
            mpart, rpart = temp.strip().split(']')
            for sel_index, sel in enumerate(mpart):
                real_original = lpart + sel + rpart
                if real_original.find(target) != -1:
                    pos = sel_index
                    break
        replacement = regex.sub(r'[A-Z]', lambda m: systematical_replacement(categories[m.group(0)], pos), replacement)
        return replacement   # 直接替换或增生

def load_rules(rule_file: str, categories: dict, replacements: list) -> list[Rule]:
    """
    读取 Rule.txt，返回解析后的规则列表
    """
    rules = []
    try:
        with open(rule_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                rule = parse_rule(line, categories, replacements)
                rules.append(rule)
    except FileNotFoundError:
        raise Exception(f"Rule file {rule_file} not found")
    return rules

def pack_files(files_to_pack, output_dir='.', status=0):
    if status == 0:
        return
    zip_name = input("Please input the name of the zip file: ").strip()
    if not zip_name:
        zip_name = 'archive'
    zip_name = zip_name if zip_name.endswith('.zip') else f'{zip_name}.zip'
    zip_path = os.path.join(output_dir, zip_name)

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in files_to_pack:
                if os.path.exists(file):
                    zf.write(file, os.path.basename(file))
                    print(f"Added {file} to {zip_path}")
                else:
                    print(f"File {file} not found, skipped.")
        print(f"Done! The zip file has been saved to {zip_path}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    # 加载输入文件
    categories = load_categories("Category.txt")
    replacements = load_replacements("Replace.txt")
    lexicon = load_lexicon("Lexicon.txt")
    rules = load_rules("Rule.txt", categories, replacements)
    output_list = []
    debug_output = []
    #column_name = ['Proto-Lang']
    column_name = []
    column_row = []

    # 处理每个词汇
    for word in lexicon:
        # 预处理：应用字符替换（如 th→θ）
        temp_word = apply_replacements(word, replacements)
        current = temp_word
        intermediates = []  # 记录中间体
        
        # 逐条应用规则
        for rule_index, rule in enumerate(rules):
            # 构建正则表达式
            lst_current = current
            for i in range(len(rule.left_context)):
                pattern = regex.compile(
                    f"(?<={rule.left_context[i]})({rule.target})(?={rule.right_context[i]})"
                )
                if rule.left_exception != "" or rule.right_exception != "":
                    pattern_exclude = regex.compile(
                        f"(?<={rule.left_exception})({rule.target})(?={rule.right_exception})"
                    )
                    exclude_ranges = [(m.start(), m.end()) for m in pattern_exclude.finditer(lst_current)]

                    def replacer(match):
                        start, end = match.start(), match.end()
                        for ex_start, ex_end in exclude_ranges:
                            if start >= ex_start and end <= ex_end:
                                return match.group(0)
                        return _apply_replacement(match.group(0), rule.replacement, rule.target, categories)

                    new_current = pattern.sub(replacer, lst_current)
                    lst_current = new_current
                # 执行替换
                else:
                    new_current = pattern.sub(
                        lambda m: _apply_replacement(m.group(0), rule.replacement, rule.target, categories),
                        lst_current
                    )
                    lst_current = new_current
            # Todo: 排除规则

            # 如果规则是中间体标记，记录当前状态
            if rule.is_intermediate:
                intermediates.append(revert_replacements(new_current, replacements))
                if rule.period_name in column_name:
                    continue
                else:
                    column_name.append(rule.period_name)
            # 记录调试信息
            if new_current != current:
                debug_output.append(f"{current} → {new_current} ({rule.target} → {rule.replacement}) at {rule_index + 1} line")
            
            current = new_current
            
        # 后处理：恢复原始字符（如 θ→th）
        final_word = revert_replacements(current, replacements)
        
        # 构建输出格式：原始词 → 中间体1 → 中间体2 → ... → 最终词
        # output_parts = [word] + intermediates + [final_word]
        output_parts = intermediates
        output_list.append(' → '.join(output_parts))
        
    # 输出最终结果
    # column_name.append('Target-Lang')
    with open("Output.txt", 'w', encoding='utf-8') as f:
        f.write(' | '.join(column_name) + '\n')
        f.write('\n'.join(output_list))
    with open("Debug.txt", 'w', encoding='utf-8') as f:
        f.write('\n'.join(debug_output))

    files_to_pack = ['Category.txt', 'Replace.txt', 'Lexicon.txt', 'Rule.txt', 'Output.txt', 'Debug.txt']
    pack_files(files_to_pack, status=0)

if __name__ == "__main__":
    main()