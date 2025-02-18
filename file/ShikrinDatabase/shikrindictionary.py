import json
import os
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

class DictionaryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Shikrin Dictionary")
        self.root.iconbitmap("Shikrin.ico")
        self.data_file = "dictionary.json"
        self.entries = []
        self.current_selection = None
        
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
        ttk.Button(self.button_frame, text="编辑", command=self.edit_word).pack(side=tk.LEFT)
        ttk.Button(self.button_frame, text="删除", command=self.delete_word).pack(side=tk.LEFT)
        
        # 详情框架
        self.details_frame = ttk.LabelFrame(self.root, text="详情")
        self.details_frame.pack(padx=10, pady=5, fill=tk.BOTH, expand=True)
        
        self.details_text = tk.Text(self.details_frame, wrap=tk.WORD, height=10)
        self.details_text.pack(padx=5, pady=5, fill=tk.BOTH, expand=True)

    def load_data(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r', encoding='utf-8') as f:
                self.entries = json.load(f)
        else:
            self.entries = []

    def save_data(self):
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.entries, f, ensure_ascii=False, indent=2)

    def update_listbox(self, filter_text=None):
        self.listbox.delete(0, tk.END)
        for entry in self.entries:
            if not filter_text or filter_text.lower() in entry["dict_form"].lower():
                display_text = f"{entry['dict_form']} - {entry['root']} - {entry['definition']}"
                self.listbox.insert(tk.END, display_text)

    def update_search(self, event=None):
        filter_text = self.search_var.get()
        self.update_listbox(filter_text)

    def show_details(self, event=None):
        selection = self.listbox.curselection()
        if not selection:
            return
        self.current_selection = selection[0]
        entry = self.entries[self.current_selection]
        
        self.details_text.delete(1.0, tk.END)
        self.details_text.insert(tk.END, f"字典型: {entry['dict_form']}\n")
        self.details_text.insert(tk.END, f"词根: {entry['root']}\n")
        self.details_text.insert(tk.END, f"释义: {entry['definition']}\n\n")
        self.details_text.insert(tk.END, f"OS: {entry['os_form']}\n")
        self.details_text.insert(tk.END, f"MIS: {entry['mis_form']}\n\n")
        
        if entry.get("morphology"):
            self.details_text.insert(tk.END, "形态变位表:\n")
            headers = ["语态", "人称", "时态", "形式"]
            col_width = [10, 25, 12, 20]
            
            # 创建表格头
            header_line = "".join([h.ljust(w) for h, w in zip(headers, col_width)]) + "\n"
            self.details_text.insert(tk.END, header_line)
            self.details_text.insert(tk.END, "-"*sum(col_width) + "\n")
            
            # 添加数据行
            for morph in entry["morphology"]:
                line = "".join([
                    morph["voice"].ljust(col_width[0]),
                    morph["person"].ljust(col_width[1]),
                    morph["tense"].ljust(col_width[2]),
                    morph["form"].ljust(col_width[3])
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
        dialog.iconbitmap("Shikrin.ico")
        dialog.title("编辑词条" if is_edit else "添加新词")
        
        entries_frame = ttk.Frame(dialog)
        entries_frame.pack(padx=10, pady=10)
        
        # 初始化数据
        entry_data = self.entries[self.current_selection] if is_edit else None
        
        # 必填字段
        ttk.Label(entries_frame, text="字典型*:").grid(row=0, column=0, sticky=tk.W)
        dict_form = ttk.Entry(entries_frame)
        dict_form.grid(row=0, column=1)
        
        ttk.Label(entries_frame, text="词根*:").grid(row=1, column=0, sticky=tk.W)
        root = ttk.Entry(entries_frame)
        root.grid(row=1, column=1)
        
        ttk.Label(entries_frame, text="释义*:").grid(row=2, column=0, sticky=tk.W)
        definition = ttk.Entry(entries_frame)
        definition.grid(row=2, column=1)

        # 选填字段
        ttk.Label(entries_frame, text="古希克林语:").grid(row=3, column=0, sticky=tk.W)
        os_form = ttk.Entry(entries_frame)
        os_form.grid(row=3, column=1)

        ttk.Label(entries_frame, text="海岛希克林语:").grid(row=4, column=0, sticky=tk.W)
        mis_form = ttk.Entry(entries_frame)
        mis_form.grid(row=4, column=1)
        
        # 预填充编辑数据
        if is_edit:
            dict_form.insert(0, entry_data["dict_form"])
            root.insert(0, entry_data["root"])
            definition.insert(0, entry_data["definition"])
            os_form.insert(0, entry_data["os_form"])
            mis_form.insert(0, entry_data["mis_form"])
        
        # 形态输入框架
        morphology_frame = ttk.LabelFrame(dialog, text="形态")
        morphology_frame.pack(padx=10, pady=5, fill=tk.X)
        
        self.morphology_entries = []
        
        def add_morphology_row(morph_data=None):
            row_frame = ttk.Frame(morphology_frame)
            row_frame.pack(fill=tk.X, pady=2)
            
            voice = ttk.Combobox(row_frame, values=["ᴅɪʀ", "ɪɴᴠ", "ᴄᴀᴜꜱ", "ɪɴᴠ.ᴄᴀᴜꜱ"], width=8)
            voice.pack(side=tk.LEFT, padx=2)
            
            person = ttk.Combobox(row_frame, values=[
                "3ꜱɢ.ɢᴅ", "1ꜱɢ", "2ꜱɢ.ꜰᴀᴍ", 
                "2ꜱɢ.ʀᴇꜱ", "3ꜱɢ.ᴀɴ", "1ᴘʟ.ᴇxᴄʟ",
                "1ᴘʟ.ɪɴᴄʟ", "2ᴘʟ", "3ᴘʟ", "3ꜱɢ.ɪɴᴀɴ"
            ], width=20)
            person.pack(side=tk.LEFT, padx=2)
            
            tense = ttk.Combobox(row_frame, values=["ᴘꜱᴛ", "ɴᴘꜱᴛ", "ʀᴇᴍ.ᴘꜱᴛ", "other"], width=10)
            tense.pack(side=tk.LEFT, padx=2)
            
            form = ttk.Entry(row_frame, width=20)
            form.pack(side=tk.LEFT, padx=2)
            
            # 预填充编辑数据
            if morph_data:
                voice.set(morph_data["voice"])
                person.set(morph_data["person"])
                tense.set(morph_data["tense"])
                form.insert(0, morph_data["form"])
            
            self.morphology_entries.append((voice, person, tense, form))
        
        # 初始化现有形态数据
        if is_edit and entry_data.get("morphology"):
            for morph in entry_data["morphology"]:
                add_morphology_row(morph)
        else:
            add_morphology_row()  # 默认添加空行
        
        ttk.Button(morphology_frame, text="添加形态", command=add_morphology_row).pack(pady=5)
        
        # 确认按钮
        def save_entry():
            if not all([dict_form.get(), root.get(), definition.get()]):
                messagebox.showerror("错误", "请填写所有必填字段")
                return
            
            new_entry = {
                "dict_form": dict_form.get(),
                "root": root.get(),
                "definition": definition.get(),
                "os_form": os_form.get(),
                "mis_form": mis_form.get(),
                "morphology": []
            }
            
            for voice, person, tense, form in self.morphology_entries:
                new_entry["morphology"].append({
                    "voice": voice.get(),
                    "person": person.get(),
                    "tense": tense.get(),
                    "form": form.get()
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