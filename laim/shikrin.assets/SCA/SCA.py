import re
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Any

@dataclass
class SoundChangeRule:
    target: str
    replacement: str
    environment: str
    exception: Optional[str] = None
    line_number: int = 0
    is_intermediate_marker: bool = False

class SoundChangeApplier:
    def __init__(self):
        self.categories: Dict[str, str] = {}
        self.rules: List[SoundChangeRule] = []
        self.rewrite_rules: List[Tuple[str, str]] = []
        self.intermediate_steps: List[int] = []
        self.previous_output: List[str] = []
        self.current_step = 0
        self.report: List[str] = []
        
    def add_category(self, definition: str):
        name, values = definition.split('=', 1)
        self.categories[name.strip()] = values.strip()
    
    def add_rewrite_rule(self, rule: str):
        if '|' in rule:
            src, tgt = rule.split('|', 1)
            self.rewrite_rules.append((src.strip(), tgt.strip()))
    
    def parse_rule(self, rule_str: str) -> SoundChangeRule:
        rule_str = rule_str.strip()
        if rule_str == '-*':
            return SoundChangeRule('', '', '', None, 0, is_intermediate_marker=True)
        
        # parsing the exception part
        exception = None
        if '|' in rule_str:
            main_part, exception = rule_str.split('|', 1)
        else:
            main_part = rule_str
        
        # parsing the target and the replacement
        if '>' in main_part:
            target, rest = main_part.split('>', 1)
            if '/' in rest:
                replacement, env = rest.split('/', 1)
            else:
                # environment is obligatory
                error_msg = f"Invalid rule format: {rule_str}"
                raise ValueError(error_msg)
        else:
            error_msg = f"Invalid rule format: {rule_str}"
            raise ValueError(error_msg)
        
        return SoundChangeRule(
            target=target,
            replacement=replacement,
            environment=env,
            exception=exception,
            line_number=len(self.rules)+1
        )
    
    def expand_pattern(self, pattern: str) -> str:
        def replace_category(match):
            cat = match.group(1)
            if cat in self.categories:
                return f'[{self.categories[cat]}]'
            if cat.startswith('[') and cat.endswith(']'):
                return cat[1:-1]
            return cat
        
        pattern = re.sub(r'(\[.*?\])', replace_category, pattern)
        pattern = pattern.replace('...', '.*')
        pattern = pattern.replace('(', '(?:')
        return f'(?:{pattern})'
    
    def apply_rewrite(self, word: str, reverse: bool = False) -> str:
        rules = self.rewrite_rules
        if reverse:
            rules = reversed(rules)
        for src, tgt in rules:
            word = re.sub(re.escape(src), tgt, word)
        return word
    
    def match_environment(self, word: str, pos: int, env: str) -> bool:
        left, right = env.split('_', 1)
        
        left_pattern = self.expand_pattern(left)
        right_pattern = self.expand_pattern(right)
        
        full_pattern = f'^{left_pattern}(.){right_pattern}$'
        return re.search(full_pattern, word[:pos] + '?' + word[pos:]) is not None
    
    def check_exception(self, word: str, pos: int, exception: str) -> bool:
        if not exception:
            return False
        return self.match_environment(word, pos, exception)
    
    def apply_sound_change(self, word: str, rule: SoundChangeRule) -> str:
        if rule.is_intermediate_marker:
            return word
        
        target = self.expand_pattern(rule.target)
        replacement = rule.replacement
        
        if replacement == '\\':
            replacement = rule.target[::-1]
        
        new_word = word
        for match in re.finditer(target, word):
            start, end = match.span()
            if self.match_environment(word, start, rule.environment):
                if not self.check_exception(word, start, rule.exception):
                    matched = word[start:end]
                    if replacement == '':
                        new_word = new_word.replace(matched, '', 1)
                    else:
                        new_word = new_word[:start] + replacement + new_word[end:]
                    self.report.append(f"{rule.target}→{rule.replacement} applies to {word} at {start}")
                    break
        
        return new_word
    
    def process_word(self, word: str, report: bool = False) -> Tuple[str, List[str]]:
        self.report.clear()
        current = self.apply_rewrite(word)
        intermediates = []
        
        for i, rule in enumerate(self.rules):
            if rule.is_intermediate_marker:
                intermediates.append(current)
                continue
            
            prev = current
            current = self.apply_sound_change(current, rule)
            
            if current != prev and report:
                self.report.append(f"Rule {i+1} applied: {prev} → {current}")
        
        current = self.apply_rewrite(current, reverse=True)
        return current, intermediates
    
    def format_output(self, original: str, transformed: str, gloss: str = None, 
                     output_format: str = 'simple', diff: str = None) -> str:
        if output_format == 'simple':
            return transformed
        elif output_format == 'dictionary':
            if gloss:
                return f"{transformed} ‣ {gloss}"
            return transformed
        elif output_format == 'comparison':
            if gloss:
                return f"{original} → {transformed} ‣ {gloss}"
            return f"{original} → {transformed}"
        return transformed
    
    def process_lexicon(self, lexicon: List[str], output_format: str = 'simple',
                       report_rules: bool = False, show_diff: bool = False) -> List[str]:
        results = []
        current_output = []
        
        for entry in lexicon:
            parts = entry.split('‣', 1)
            word = parts[0].strip()
            gloss = parts[1].strip() if len(parts) > 1 else None
            
            original_word = word
            transformed, intermediates = self.process_word(word, report_rules)
            
            if show_diff and self.previous_output:
                diff = self.calculate_diff(self.previous_output[len(results)], transformed)
                formatted_diff = self.highlight_diff(diff)
            else:
                formatted_diff = transformed
            
            output = self.format_output(
                original_word, 
                formatted_diff,
                gloss,
                output_format
            )
            
            if report_rules:
                output += '\n' + '\n'.join(self.report)
            
            current_output.append(transformed)
            results.append(output)
        
        self.previous_output = current_output
        return results
    
    def calculate_diff(self, previous: str, current: str) -> List[Tuple[str, bool]]:
        diff = []
        prev_chars = list(previous)
        curr_chars = list(current)
        
        while prev_chars or curr_chars:
            p = prev_chars.pop(0) if prev_chars else None
            c = curr_chars.pop(0) if curr_chars else None
            
            if p == c:
                diff.append((c, False))
            else:
                diff.append((c, True))
                if p and c and p != c:
                    while prev_chars and prev_chars[0] != c:
                        prev_chars.pop(0)
        
        return diff
    
    def highlight_diff(self, diff: List[Tuple[str, bool]]) -> str:
        return ''.join([f'**{char}**' if changed else char for char, changed in diff])

if __name__ == "__main__":
    sca = SoundChangeApplier()
    
    sca.add_category("V=aeiou")
    sca.add_category("F=ie")
    sca.add_category("S=ptk")
    sca.add_category("Z=bdg")
    
    sca.add_rewrite_rule("kh|x")
    sca.add_rewrite_rule("sh|ʃ")
    sca.add_rewrite_rule("ng|ŋ")
    
    rules = [
        "c>g/V_V",
        "u>o/_#",
        "S>Z/V_V",
        "-*",
        "s>/_#",
        "nt>\\/_V",
    ]
    for rule in rules:
        sca.rules.append(sca.parse_rule(rule))
    
    lexicon = [
        "focus",
        "kanta",
        "operam",
        "sensus",
    ]
    
    def replace_category(match):
            cat = match.group(1)
            if cat in sca.categories:
                return f'[{sca.categories[cat]}]'
            if cat.startswith('[') and cat.endswith(']'):
                return cat[1:-1]
            return cat
    print(re.sub(r'(\[.*?\])', replace_category, 'V'))

    output = sca.process_lexicon(
        lexicon,
        output_format='comparison',
        report_rules=True,
        show_diff=True
    )
    with open('output.txt', 'w', encoding='utf-8') as f:
        for item in output:
            f.write(item + '\n')