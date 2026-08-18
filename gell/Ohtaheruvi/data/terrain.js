// 地形表（设计文档 01 章第二节）
// kind: land 普通陆地 / mountain 山地（仅山地系与飞行可入）/ river 河流（仅飞行与船）/ water 海洋（仅船与飞行）
// cost: 基础移动消耗；飞行单位一律 1

export const TERRAIN = {
  R: { id: 'R', name: '道路', cost: 1, kind: 'land',     color: '#b39a6d', dark: '#6b5b3f' },
  P: { id: 'P', name: '草原', cost: 2, kind: 'land',     color: '#8fa05c', dark: '#4e5a31' },
  F: { id: 'F', name: '农地', cost: 2, kind: 'land',     color: '#a8a856', dark: '#5d5d2c' },
  W: { id: 'W', name: '荒原', cost: 3, kind: 'land',     color: '#a08a63', dark: '#584a33' },
  T: { id: 'T', name: '森林', cost: 4, kind: 'land',     color: '#4c6b3c', dark: '#26361d' },
  H: { id: 'H', name: '丘陵', cost: 4, kind: 'land',     color: '#9c8b5a', dark: '#544a2e' },
  M: { id: 'M', name: '山地', cost: 6, kind: 'mountain', color: '#7d7266', dark: '#413b33' },
  S: { id: 'S', name: '沼泽', cost: 5, kind: 'land',     color: '#6b7a55', dark: '#39412b' },
  D: { id: 'D', name: '浅滩', cost: 3, kind: 'land',     color: '#7fa0a8', dark: '#41565c' },
  V: { id: 'V', name: '河流', cost: 0, kind: 'river',    color: '#4d84a0', dark: '#274554' },
  O: { id: 'O', name: '海洋', cost: 0, kind: 'water',    color: '#3d6b80', dark: '#1e3a47' },
  C: { id: 'C', name: '城市', cost: 1, kind: 'land',     color: '#c8b48a', dark: '#6e6047' },
};

export const CITY_SIZE = {
  village: { key: 'village', name: '村镇', income: 8,  defense: 1, slots: 1 },
  town:    { key: 'town',    name: '城',   income: 14, defense: 3, slots: 2 },
  city:    { key: 'city',    name: '大城', income: 22, defense: 6, slots: 3 },
  capital: { key: 'capital', name: '都城', income: 32, defense: 8, slots: 4 },
};

// 城防加成（01 章 5.2）
export function cityDefBonus(defense) {
  if (defense <= 1) return 0;
  if (defense <= 6) return 1;
  if (defense <= 8) return 2;
  return 3;
}
