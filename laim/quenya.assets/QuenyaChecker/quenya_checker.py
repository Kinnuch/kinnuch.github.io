#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuenyaChecker — 昆雅语语法检查工具（桌面版 tkinter GUI）
"""

import tkinter as tk
from tkinter import scrolledtext, font as tkfont
from checker_engine import check_sentence, VOCAB


class QuenyaCheckerApp:
    def __init__(self, root):
        self.root = root
        root.title("QuenyaChecker — 昆雅语语法检查")
        root.geometry("800x650")
        root.minsize(600, 450)

        try:
            root.configure(bg="#1e1e2e")
        except Exception:
            pass

        style_bg = "#1e1e2e"
        style_fg = "#cdd6f4"
        style_input_bg = "#313244"
        style_result_bg = "#181825"
        style_btn_bg = "#89b4fa"
        style_btn_fg = "#1e1e2e"

        header = tk.Frame(root, bg=style_bg, pady=10)
        header.pack(fill=tk.X)

        title_font = tkfont.Font(family="Segoe UI", size=16, weight="bold")
        tk.Label(header, text="QuenyaChecker", font=title_font,
                 bg=style_bg, fg="#89b4fa").pack()
        tk.Label(header, text="昆雅语语法检查工具",
                 bg=style_bg, fg="#a6adc8",
                 font=("Segoe UI", 10)).pack()

        input_frame = tk.Frame(root, bg=style_bg, padx=20, pady=5)
        input_frame.pack(fill=tk.X)

        tk.Label(input_frame, text="输入昆雅语句子：",
                 bg=style_bg, fg=style_fg,
                 font=("Segoe UI", 10), anchor="w").pack(fill=tk.X)

        self.input_text = scrolledtext.ScrolledText(
            input_frame, height=5,
            font=("Consolas", 13),
            bg=style_input_bg, fg=style_fg,
            insertbackground=style_fg,
            relief=tk.FLAT, padx=10, pady=8,
            wrap=tk.WORD
        )
        self.input_text.pack(fill=tk.X, pady=(5, 0))
        self.input_text.bind("<Control-Return>", lambda e: self.do_check())
        self.input_text.bind("<Control-KP_Enter>", lambda e: self.do_check())

        btn_frame = tk.Frame(root, bg=style_bg, pady=8)
        btn_frame.pack()

        self.check_btn = tk.Button(
            btn_frame, text="检查 (Ctrl+Enter)",
            font=("Segoe UI", 11, "bold"),
            bg=style_btn_bg, fg=style_btn_fg,
            activebackground="#74c7ec", activeforeground=style_btn_fg,
            relief=tk.FLAT, padx=20, pady=5,
            cursor="hand2",
            command=self.do_check
        )
        self.check_btn.pack()

        result_frame = tk.Frame(root, bg=style_bg, padx=20, pady=5)
        result_frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(result_frame, text="检查结果：",
                 bg=style_bg, fg=style_fg,
                 font=("Segoe UI", 10), anchor="w").pack(fill=tk.X)

        self.result_text = scrolledtext.ScrolledText(
            result_frame, height=12,
            font=("Consolas", 11),
            bg=style_result_bg, fg=style_fg,
            relief=tk.FLAT, padx=10, pady=8,
            wrap=tk.WORD, state=tk.DISABLED
        )
        self.result_text.pack(fill=tk.BOTH, expand=True, pady=(5, 0))

        self.result_text.tag_configure("error", foreground="#f38ba8")
        self.result_text.tag_configure("warning", foreground="#fab387")
        self.result_text.tag_configure("info", foreground="#a6e3a1")
        self.result_text.tag_configure("pass", foreground="#a6e3a1")

        footer = tk.Frame(root, bg=style_bg, pady=5)
        footer.pack(fill=tk.X)
        tk.Label(footer,
                 text="基于 eldamo.org + 灰机wiki 语法规则 | Late Quenya",
                 bg=style_bg, fg="#585b70",
                 font=("Segoe UI", 8)).pack()

        vocab_count = len(VOCAB)
        tk.Label(footer,
                 text=f"词汇库: {vocab_count} 词条",
                 bg=style_bg, fg="#585b70",
                 font=("Segoe UI", 8)).pack()

    def do_check(self):
        text = self.input_text.get("1.0", tk.END).strip()
        issues = check_sentence(text)

        self.result_text.configure(state=tk.NORMAL)
        self.result_text.delete("1.0", tk.END)

        for issue in issues:
            line = str(issue) + "\n\n"
            tag = issue.level
            if "✅" in issue.message:
                tag = "pass"
            self.result_text.insert(tk.END, line, tag)

        self.result_text.configure(state=tk.DISABLED)


def main():
    root = tk.Tk()
    app = QuenyaCheckerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
