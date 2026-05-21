#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuenyaChecker — 昆雅语语法检查工具（安卓/跨平台 Kivy GUI）
"""

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.scrollview import ScrollView
from kivy.core.window import Window
from kivy.utils import get_color_from_hex
from kivy.metrics import sp, dp

from checker_engine import check_sentence, VOCAB

# Catppuccin Mocha palette
BG = get_color_from_hex("#1e1e2e")
SURFACE = get_color_from_hex("#313244")
DARK_BG = get_color_from_hex("#181825")
TEXT = get_color_from_hex("#cdd6f4")
SUBTEXT = get_color_from_hex("#a6adc8")
BLUE = get_color_from_hex("#89b4fa")
RED = get_color_from_hex("#f38ba8")
ORANGE = get_color_from_hex("#fab387")
GREEN = get_color_from_hex("#a6e3a1")
DIM = get_color_from_hex("#585b70")

Window.clearcolor = BG


class QuenyaCheckerApp(App):
    def build(self):
        self.title = "QuenyaChecker — 昆雅语语法检查"

        root = BoxLayout(orientation="vertical", padding=dp(16), spacing=dp(10))

        root.add_widget(Label(
            text="QuenyaChecker",
            font_size=sp(24), bold=True, color=BLUE,
            size_hint_y=None, height=dp(36),
        ))
        root.add_widget(Label(
            text="昆雅语语法检查工具",
            font_size=sp(14), color=SUBTEXT,
            size_hint_y=None, height=dp(24),
        ))

        root.add_widget(Label(
            text="输入昆雅语句子：", font_size=sp(13), color=TEXT,
            size_hint_y=None, height=dp(24), halign="left",
        ))

        self.input_text = TextInput(
            hint_text="例如: i atan matë massa",
            font_size=sp(16), multiline=True,
            size_hint_y=None, height=dp(120),
            background_color=SURFACE, foreground_color=TEXT,
            hint_text_color=DIM, cursor_color=TEXT,
            padding=[dp(12), dp(10)],
        )
        root.add_widget(self.input_text)

        btn = Button(
            text="检  查",
            font_size=sp(16), bold=True,
            size_hint=(None, None), size=(dp(200), dp(48)),
            pos_hint={"center_x": 0.5},
            background_color=BLUE, color=get_color_from_hex("#1e1e2e"),
            background_normal="",
        )
        btn.bind(on_press=self.do_check)
        root.add_widget(btn)

        root.add_widget(Label(
            text="检查结果：", font_size=sp(13), color=TEXT,
            size_hint_y=None, height=dp(24), halign="left",
        ))

        scroll = ScrollView(size_hint=(1, 1))
        self.result_label = Label(
            text="", font_size=sp(14), color=TEXT,
            markup=True, halign="left", valign="top",
            size_hint_y=None,
            padding=[dp(12), dp(10)],
        )
        self.result_label.bind(texture_size=self._update_label_height)
        scroll.add_widget(self.result_label)
        root.add_widget(scroll)

        footer = Label(
            text=f"基于 eldamo.org + 灰机wiki 语法规则 | Late Quenya | 词汇库: {len(VOCAB)} 词条",
            font_size=sp(10), color=DIM,
            size_hint_y=None, height=dp(20),
        )
        root.add_widget(footer)

        return root

    def _update_label_height(self, instance, size):
        instance.height = max(size[1], dp(100))
        instance.text_size = (instance.width, None)

    def do_check(self, *args):
        text = self.input_text.text.strip()
        issues = check_sentence(text)

        lines = []
        for issue in issues:
            if issue.level == "error":
                color = "f38ba8"
            elif issue.level == "warning":
                color = "fab387"
            else:
                color = "a6e3a1"

            line = f"[color={color}]{_escape_markup(str(issue))}[/color]"
            lines.append(line)

        self.result_label.text = "\n\n".join(lines)


def _escape_markup(text):
    return text.replace("&", "&amp;").replace("[", "&#91;").replace("]", "&#93;")


if __name__ == "__main__":
    QuenyaCheckerApp().run()
