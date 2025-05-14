import re
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
    left_context: str    # 左上下文正则模式
    right_context: str   # 右上下文正则模式
    is_intermediate: bool = False  # 是否为中间体标记

def parse_rule(rule_str: str, categories: dict) -> Rule:
    """
    解析单条音变规则，返回 Rule 对象
    格式：目标 > 替换 / 左上下文_右上下文
    """
    # 判断中间体
    if rule_str == "-*":
        return Rule("", "", "", "", is_intermediate=True)

    # 分割目标/替换和上下文
    if "/" in rule_str:
        rule_part, context_part = rule_str.split("/", 1)
        left_context, right_context = context_part.strip().split("_", 1)
    else:
        rule_part = rule_str
        left_context, right_context = "", ""
    
    # 分割目标和替换
    target, replacement = rule_part.strip().split(">", 1)
    target = target.strip()
    replacement = replacement.strip()

    # 处理目标/替换中的类别（如 V, [aei]）
    target = _expand_category(target, categories)
    replacement = _expand_category(replacement, categories)

    # 处理左/右上下文中的符号（# 词边界、... 跨位置、() 可选元素）
    left_pattern = _context_to_regex(left_context.strip(), categories)
    right_pattern = _context_to_regex(right_context.strip(), categories)

    return Rule(target, replacement, left_pattern, right_pattern)

def _expand_category(s: str, categories: dict) -> str:
    """
    将字符串中的音类符号（如 V 或 [aei]）展开为字符集合
    示例：V → aeiou，[ao] → ao
    """
    expanded = []
    i = 0
    while i < len(s):
        if s[i] == '[':
            # 临时类别 [ao]
            j = i + 1
            while j < len(s) and s[j] != ']':
                j += 1
            expanded.append(s[i+1:j])
            i = j + 1
        elif s[i].isupper() and s[i] in categories:
            # 预定义类别（如 V=aeiou）
            expanded.append(categories[s[i]])
            i += 1
        else:
            # 普通字符
            expanded.append(s[i])
            i += 1
    return ''.join(expanded)

def _context_to_regex(context: str, categories: dict) -> str:
    """
    将上下文描述（如 "a(...)b#..."）转换为正则表达式模式
    """
    regex = []
    i = 0
    while i < len(context):
        c = context[i]
        if c == '#':
            regex.append(r'\b')  # 词边界
        elif c == '.' and i+2 < len(context) and context[i:i+3] == '...':
            regex.append(r'.*')  # 跨位置匹配
            i += 2
        elif c == '(':
            # 可选元素，如 (c) → (?:c)?
            j = i + 1
            while j < len(context) and context[j] != ')':
                j += 1
            inner = _expand_category(context[i+1:j], categories)
            regex.append(f'(?:{re.escape(inner)})?')
            i = j
        else:
            # 普通字符或类别
            expanded = _expand_category(c, categories)
            regex.append(re.escape(expanded))
        i += 1
    return ''.join(regex)

def apply_rules(word: str, rules: list[Rule]) -> str:
    """
    对单个词汇按顺序应用所有音变规则
    """
    current = word
    for rule in rules:
        # 构建完整正则表达式：左上下文 + 目标 + 右上下文
        pattern = re.compile(
            f"({rule.left_context})({rule.target})({rule.right_context})"
        )
        # 执行替换
        current = pattern.sub(
            lambda m: _apply_replacement(m.group(2), rule.replacement),
            current
        )
    return current

def _apply_replacement(target: str, replacement: str) -> str:
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
        return replacement   # 直接替换或增生

def load_rules(rule_file: str, categories: dict) -> list[Rule]:
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
                rule = parse_rule(line, categories)
                rules.append(rule)
    except FileNotFoundError:
        raise Exception(f"Rule file {rule_file} not found")
    return rules

def main():
    # 加载输入文件
    categories = load_categories("Category.txt")
    replacements = load_replacements("Replace.txt")
    lexicon = load_lexicon("Lexicon.txt")
    rules = load_rules("Rule.txt", categories)
    output_list = []

    # 处理每个词汇
    for word in lexicon:
        # 预处理：应用字符替换（如 th→θ）
        temp_word = apply_replacements(word, replacements)
        current = temp_word
        intermediates = []  # 记录中间体
        
        # 逐条应用规则
        for rule in rules:
            # 构建正则表达式
            pattern = re.compile(
                f"({rule.left_context})({rule.target})({rule.right_context})"
            )
            # 执行替换
            new_current = pattern.sub(
                lambda m: _apply_replacement(m.group(2), rule.replacement),
                current
            )
            # 如果规则是中间体标记，记录当前状态
            if rule.is_intermediate:
                intermediates.append(new_current)
            current = new_current
        
        # 后处理：恢复原始字符（如 θ→th）
        final_word = revert_replacements(current, replacements)
        
        # 构建输出格式：原始词 → 中间体1 → 中间体2 → ... → 最终词
        output_parts = [word] + intermediates + [final_word]
        output_list.append(' → '.join(output_parts))
        
    # 输出最终结果    
    with open("Output.txt", 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_list))

if __name__ == "__main__":
    main()