// 阶段 C-1：把 45 个元件临时铺开在网格上，用于测量各符号实际尺寸
// 坐标单位：0.01 inch (10 mil)

const LIB = '0819f05c4eef4c71ace90d822a990e87';

const PARTS = {
  U_MCU:  '701a1177d7184d1bbf7f86d69d9385c2',
  U_CODEC:'cd3a046e4b0b48efa1e91da1a702171e',
  U_LDO:  '536ec92fc3224faaaf04a7535f8d0c3c',
  U_QBL:  '4bf6fb56f0a44a96860771f6cfb8e6d4',
  J_USB:  '74d31c19993b4b9581f3175a7da4b280',
  J_HP:   '9a9449f8ff604c9182183eead54bd112',
  J_LCD:  '2c7fe9ee72e142c8be8fff6a7c9556af',
  SW_K:   'e172d7e2efcc4dacbd06ce78bfc17a19',
  R_5K1:  'b5d09b57bc354a60b86d6a6308651647',
  R_1M:   'b37ebeb11cd54bebb515f79f1ed51ef5',
  R_10K:  'b948db94476e4027ac8953235755ec96',
  R_100:  '5303080f43d74b41ae76fc5142aa97e5',
  R_100K: '40ff282b3d594c33b798d1707d8406cb',
  C_100N: '96b39256cc3f4d80bd3b503deb4f3328',
  C_10U:  '80646d555bcf4558bdde69f7f0e5dc8d',
  C_1U:   'f4744ff7405a46a48e360c2c6fadeca3',
  C_4N7:  'f0419ed7c5724c298e313f427615045e',
  C_220U: 'ae14c42f2de24c7a81bf187d457e0ca4',
  FB_600: '3f8019f446b6494881e61d1b5a3121c4',
};

// [位号, 器件键]
const LIST = [
  ['U1','U_MCU'], ['U2','U_CODEC'], ['U3','U_LDO'], ['Q1','U_QBL'],
  ['J1','J_USB'], ['J2','J_HP'], ['J3','J_LCD'],
  ['SW1','SW_K'], ['SW2','SW_K'], ['SW3','SW_K'], ['SW4','SW_K'], ['SW5','SW_K'], ['SW6','SW_K'],
  ['R1','R_5K1'], ['R2','R_5K1'], ['R3','R_1M'],
  ['R4','R_10K'], ['R5','R_10K'], ['R6','R_10K'], ['R7','R_10K'],
  ['R8','R_10K'], ['R9','R_10K'], ['R10','R_10K'], ['R11','R_10K'],
  ['R12','R_100'], ['R13','R_100'], ['R14','R_100K'],
  ['C1','C_4N7'], ['C2','C_1U'], ['C3','C_1U'],
  ['C4','C_100N'], ['C5','C_100N'], ['C6','C_100N'],
  ['C7','C_100N'], ['C8','C_100N'], ['C9','C_100N'],
  ['C10','C_10U'], ['C11','C_10U'], ['C12','C_10U'], ['C13','C_10U'], ['C14','C_10U'],
  ['C15','C_220U'], ['C16','C_220U'],
  ['FB1','FB_600'], ['FB2','FB_600'],
];

const COLS = 8, DX = 700, DY = 600, X0 = 600, Y0 = 600;

const placed = [];
for (let i = 0; i < LIST.length; i++) {
  const [des, key] = LIST[i];
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = X0 + col * DX, y = Y0 + row * DY;
  const c = await eda.sch_PrimitiveComponent.create(
    { libraryUuid: LIB, uuid: PARTS[key] }, x, y, '', 0, false, true, true
  );
  if (!c) { placed.push({ des, error: 'create 返回 undefined' }); continue; }
  await eda.sch_PrimitiveComponent.modify(c.primitiveId, { designator: des });
  placed.push({ des, id: c.primitiveId, x, y });
  await new Promise(r => setTimeout(r, 100));
}

return { total: LIST.length, placedCount: placed.filter(p => p.id).length, placed };
