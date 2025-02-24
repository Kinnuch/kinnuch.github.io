import json
import os
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

os.chdir(os.path.dirname(__file__))

class DictionaryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sindarin Dictionary")
        self.root.iconbitmap("Sindarin.ico")
        self.data_file = "dictionary.json"
        self.entries = []
        self.filtered_entries = []
        self.current_selection = None
        self.morphology_options = {
            "noun" : ["Soft", "Plural", "NasalⅠ", "NasalⅡ", "MixedⅠ", "MixedⅡ", "Liquid", "Stop", "H", "DH"],
            "verb" : ["Present", "Past", "Future", "Imperative", "Gerund", "PastParticiple", "PresentParticiple", "PeferctParticle"],
            "adjective" : ["Soft", "Plural", "Comparative", "Superlative"],
            "adverb" : [],
            "preposition" : [],
            "conjunction" : [],
            "pronoun" : [],
            "affix" : [],
            "other" : []
        }
        
        # 初始化数据
        self.load_data()
        
        # 创建主界面
        self.create_widgets()
        self.update_listbox()

    def create_widgets(self):
        # 搜索框
        self.search_frame = ttk.Frame(self.root)
        self.search_frame.pack(padx=10, pady=5, fill=tk.X)
        
        self.search_var = tk.StringVar()
        self.search_entry = ttk.Entry(self.search_frame, textvariable=self.search_var)
        self.search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.search_entry.bind("<KeyRelease>", self.update_search)
        
        # 列表框
        self.listbox = tk.Listbox(self.root)
        self.listbox.pack(padx=10, pady=5, fill=tk.BOTH, expand=True)
        self.listbox.bind("<<ListboxSelect>>", self.show_details)
        
        # 按钮框架
        self.button_frame = ttk.Frame(self.root)
        self.button_frame.pack(padx=10, pady=5, fill=tk.X)
        
        ttk.Button(self.button_frame, text="添加单词", command=self.add_word).pack(side=tk.LEFT)
        ttk.Button(self.button_frame, text="编辑单词", command=self.edit_word).pack(side=tk.LEFT)
        ttk.Button(self.button_frame, text="删除单词", command=self.delete_word).pack(side=tk.LEFT)
        
        # 详情框架
        self.details_frame = ttk.LabelFrame(self.root, text="详情")
        self.details_frame.pack(padx=10, pady=5, fill=tk.BOTH, expand=True)
        
        self.details_text = tk.Text(self.details_frame, wrap=tk.WORD, height=10)
        self.details_text.pack(padx=5, pady=5, fill=tk.BOTH, expand=True)

    def load_data(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r', encoding='utf-8') as f:
                self.entries = json.load(f)
                self.entries.sort(key=lambda x: x["dict_form"])
        else:
            self.entries = []
        print("已经收录", self.entries.__len__(), "个词条")

    def save_data(self):
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.entries, f, ensure_ascii=False, indent=2)

    def update_listbox(self, filter_text=None):
        self.listbox.delete(0, tk.END)
        self.filtered_entries = []
        for entry in self.entries:
            if not filter_text or filter_text.lower() in entry["dict_form"].lower():
                self.filtered_entries.append(entry)
                display_text = f"{entry['dict_form']} - {entry['part']} - {entry['english']} - {entry['definition']}"
                self.listbox.insert(tk.END, display_text)

    def update_search(self, event=None):
        self.current_selection = None
        filter_text = self.search_var.get()
        self.update_listbox(filter_text)

    def show_details(self, event=None):
        selection = self.listbox.curselection()
        if not selection:
            return
        index = selection[0]
        if 0 <= index < len(self.filtered_entries):
            entry = self.filtered_entries[index]
            self.current_selection = self.entries.index(entry)
        else:
            return
        
        self.details_text.delete(1.0, tk.END)
        self.details_text.insert(tk.END, f"辛达语: {entry['dict_form']}\n\n")
        self.details_text.insert(tk.END, f"词性: {entry['part']}\n\n")
        self.details_text.insert(tk.END, f"英语: {entry['english']}\n\n")
        self.details_text.insert(tk.END, f"释义: {entry['definition']}\n\n")
        self.details_text.insert(tk.END, f"例句: {entry['sentence']}\n\n")
        self.details_text.insert(tk.END, f"备注: {entry['other']}\n\n")
        
        if entry.get("morphology"):
            self.details_text.insert(tk.END, "形态变化:\n")
            headers = ["变化类型", "形式"]
            col_width = [20, 30]
            
            # 创建表格头
            header_line = "".join([h.ljust(w) for h, w in zip(headers, col_width)]) + "\n"
            self.details_text.insert(tk.END, header_line)
            self.details_text.insert(tk.END, "-"*sum(col_width) + "\n")
            
            # 添加数据行
            for morph in entry["morphology"]:
                line = "".join([
                    morph["type"].ljust(col_width[0]),
                    morph["form"].ljust(col_width[1]),
                ]) + "\n"
                self.details_text.insert(tk.END, line)

    def add_word(self):
        self.word_dialog(is_edit=False)

    def edit_word(self):
        if self.current_selection is None:
            messagebox.showwarning("提示", "请先选择要编辑的词条")
            return
        self.word_dialog(is_edit=True)

    def delete_word(self):
        if self.current_selection is None:
            messagebox.showwarning("提示", "请先选择要删除的词条")
            return
        if messagebox.askyesno("确认", "确定要删除该词条吗？"):
            del self.entries[self.current_selection]
            self.save_data()
            self.update_listbox()
            self.details_text.delete(1.0, tk.END)

    def word_dialog(self, is_edit=False):
        dialog = tk.Toplevel(self.root)
        dialog.iconbitmap("Sindarin.ico")
        dialog.title("编辑词条" if is_edit else "添加新词")
        
        dialog.geometry(f"+{self.root.winfo_x() + 50}+{self.root.winfo_y() + 50}")

        entries_frame = ttk.Frame(dialog)
        entries_frame.pack(padx=10, pady=10)

        pos_frame = ttk.Frame(dialog)
        pos_frame.pack(padx=10, pady=5, fill=tk.X)
        
        # 初始化数据
        entry_data = self.entries[self.current_selection] if is_edit else None
        
        # 必填字段
        ttk.Label(entries_frame, text="辛达语*:").grid(row=0, column=0, sticky=tk.W)
        dict_form = ttk.Entry(entries_frame)
        dict_form.grid(row=0, column=1, pady=5)

        ttk.Label(entries_frame, text="英语*:").grid(row=2, column=0, sticky=tk.W)
        english = ttk.Entry(entries_frame)
        english.grid(row=2, column=1, pady=5)
        
        ttk.Label(entries_frame, text="释义*:").grid(row=3, column=0, sticky=tk.W)
        definition = ttk.Entry(entries_frame)
        definition.grid(row=3, column=1, pady=5)

        # 选填字段
        ttk.Label(entries_frame, text="例句:").grid(row=4, column=0, sticky=tk.W)
        sentence = tk.Text(entries_frame, height=7, width=30)
        sentence.grid(row=4, column=1, pady=5)

        ttk.Label(entries_frame, text="备注:").grid(row=5, column=0, sticky=tk.W)
        other = ttk.Entry(entries_frame)
        other.grid(row=5, column=1, pady=5)
        
        # 预填充编辑数据
        if is_edit:
            dict_form.insert(0, entry_data["dict_form"])
            english.insert(0, entry_data["english"])
            definition.insert(0, entry_data["definition"])
            sentence.insert(1.0, entry_data["sentence"])
            other.insert(0, entry_data["other"])
        
        morphology_frame = ttk.LabelFrame(dialog, text="形态")
        morphology_frame.pack(padx=10, pady=5, fill=tk.X)
        
        self.morphology_entries = []
        
        def create_morphology_rows():
            # 清空现有形态输入框
            for widget in morphology_frame.winfo_children():
                widget.destroy()
            
            # 根据当前词性创建对应选项
            current_pos = self.pos_var.get()
            options = self.morphology_options.get(current_pos, [])
            
            if not options:
                ttk.Label(morphology_frame, text="该词性没有预定义形态").pack()
                return
            
            # 创建形态选择行
            for i, morph_type in enumerate(options):
                row_frame = ttk.Frame(morphology_frame)
                row_frame.pack(fill=tk.X, pady=3)
                
                ttk.Label(row_frame, text=f"{morph_type}:").pack(side=tk.LEFT, padx=2)
                entry = ttk.Entry(row_frame, width=25)
                entry.pack(side=tk.LEFT, padx=2)
                
                # 预填充数据
                if entry_data and entry_data.get("morphology"):
                    for morph in entry_data["morphology"]:
                        if morph["type"] == morph_type:
                            entry.insert(0, morph["form"])
                
                self.morphology_entries.append((morph_type, entry))
            
        def update_morphology_options(event=None):
            # 当词性改变时更新形态输入框
            create_morphology_rows()

        ttk.Label(pos_frame, text="词性*:").pack(side=tk.LEFT)
        self.pos_var = tk.StringVar()
        if is_edit:
            self.pos_var.set(entry_data["part"])
        pos_combo = ttk.Combobox(pos_frame, textvariable=self.pos_var, values=list(self.morphology_options.keys()))
        pos_combo.pack(side=tk.LEFT, padx=5)
        pos_combo.bind("<<ComboboxSelected>>", update_morphology_options)

        create_morphology_rows()

        # 确认按钮
        def save_entry():
            if not all([dict_form.get(), self.pos_var.get(), english.get(), definition.get()]):
                messagebox.showerror("错误", "请填写所有必填字段")
                return
            
            new_entry = {
                "dict_form": dict_form.get(),
                "part": self.pos_var.get(),
                "english": english.get(),
                "definition": definition.get(),
                "sentence": sentence.get(1.0, tk.END),
                "other": other.get(),
                "morphology": []
            }
            
            for morph_type, entry_widget in self.morphology_entries:
                new_entry["morphology"].append({
                    "type": morph_type,
                    "form": entry_widget.get()
                })
            
            if is_edit:
                self.entries[self.current_selection] = new_entry
            else:
                self.entries.append(new_entry)
            
            self.save_data()
            self.update_listbox()
            dialog.destroy()
        
        ttk.Button(dialog, text="保存", command=save_entry).pack(pady=10)
        
if __name__ == "__main__":
    root = tk.Tk()
    app = DictionaryApp(root)
    root.mainloop()