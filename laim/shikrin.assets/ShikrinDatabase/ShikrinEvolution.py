import matplotlib.pyplot as plt
import networkx as nx

# 重新创建有向图
G = nx.DiGraph()

# 更新后的语言节点
languages = {
    "Proto-Shikṛin": "原始希克林语",
    "Old Shikṛin": "古希克林语",
    "Continental Shikṛin": "大陆希克林语",
    "Insular Shikṛin": "海岛希克林语",
    "Southern Shikṛin": "南部希克林语",
    "Modern Shikṛin": "现代希克林语",
    "Elxiṛin": "亚希林语",
    "Theusṛin": "瑟乌丝林语",
    "Hor Belsham": "贝杉方言",
    "Archepelago Shikṛin": "群岛希克林语",
    "Hor Shug": "树格方言",
    "Ate Shikṛin": "荒原希克林语",
    "Itskan Shikṛin": "夜央希克林语"
}

# 添加节点
for lang in languages:
    G.add_node(lang, label=languages[lang])

# 添加演化路径
edges = [
    ("Proto-Shikṛin", "Old Shikṛin"),
    ("Old Shikṛin", "Continental Shikṛin"),
    ("Old Shikṛin", "Insular Shikṛin"),
    ("Proto-Shikṛin", "Theusṛin"),
    ("Continental Shikṛin", "Modern Shikṛin"),
    ("Continental Shikṛin", "Elxiṛin"),
    ("Insular Shikṛin", "Hor Belsham"),
    ("Insular Shikṛin", "Archepelago Shikṛin"),
    ("Archepelago Shikṛin", "Hor Shug"),
    ("Southern Shikṛin", "Ate Shikṛin"),
    ("Southern Shikṛin", "Itskan Shikṛin"),
    ("Continental Shikṛin", "Southern Shikṛin")
]

G.add_edges_from(edges)

# 设定节点位置（越现代的语言越靠下）
pos = {
    "Proto-Shikṛin": (0, 5),
    "Old Shikṛin": (0, 4),
    "Continental Shikṛin": (-1, 3),
    "Insular Shikṛin": (1, 3),
    "Southern Shikṛin": (-2, 2),
    "Modern Shikṛin": (0, 1),
    "Elxiṛin": (-1, 1),
    "Theusṛin": (-2, 4),
    "Hor Belsham": (1, 1),
    "Archepelago Shikṛin": (2, 2),
    "Hor Shug": (2, 1),
    "Ate Shikṛin": (-3, 1),
    "Itskan Shikṛin": (-2, 1)
}

# 绘制图形
plt.figure(figsize=(10, 8))
nx.draw(
    G, pos, with_labels=True, node_size=3000, node_color="lightblue", edge_color="gray", 
    font_size=9, font_weight="bold", arrows=True, arrowsize=10
)

# 显示图形
plt.title("Shikṛin Language Evolution Tree")
plt.show()
