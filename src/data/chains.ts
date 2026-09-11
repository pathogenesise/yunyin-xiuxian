/**
 * 奇缘 —— 6 条缘 · 15 个阶段事件(数据驱动,阶段事件随链推进逐段出现)
 *
 * 与普通事件的分工:
 * - 普通事件按**区域标签**随机出现,同一件事在哪里都能碰上;
 * - 奇缘按**链条阶段**出现 —— 上一程结了哪一段缘,下一程才轮得到它。
 *   故阶段事件一律带 `chain` 标签,任何区域都不引用它(见 eventEngine.regionEventPoolFor),
 *   只有 pickChainStageEvent 这一条路能把它们请出来。
 *
 * 链条身份只此一处:谁属于哪条链、是第几程,一律问 chainOfEvent,
 * 不在别处再写一份 id 前缀清单(重复的口径迟早对不上)。
 */
import type { EventChoice, EventDef, EventEffect, EventOutcome } from '@/types'

/** 奇缘阶段事件的专属标签 —— 任何区域都不得引用它,否则奇缘会漏进随机池 */
export const CHAIN_TAG = 'chain'

function o(weight: number, text: string, ...effects: EventEffect[]): EventOutcome {
  return { weight, text, effects: effects.length ? effects : [{ type: 'nothing' }] }
}

function c(label: string, outcomes: EventOutcome[], opts: Partial<Omit<EventChoice, 'label' | 'outcomes'>> = {}): EventChoice {
  return { label, outcomes, ...opts }
}

function ev(id: string, title: string, text: string, minRealm: number, choices: EventChoice[]): EventDef {
  return { id, title, text, tags: [CHAIN_TAG], choices, weight: 100, minRealm }
}

const leave = (text = '你收回目光,转身离去。缘未到,强求不得。') => c('离去', [o(1, text)], { isDefault: true })

/** 一条奇缘:若干程,按序推进 */
export interface ChainDef {
  id: string
  name: string
  /** 一句话写这条缘为何未了(展示层用) */
  hint: string
  /** 各程事件 id,顺序即缘分 */
  stages: string[]
}

/**
 * 6 条奇缘 —— 五条起于人间寻常处,一条自仙界云海接续(真仙之上不必只走凡间的旧账)。
 * 每条的起点门槛写在第一程事件的 minRealm 上,链条自身不另存一份。
 */
export const CHAINS: ChainDef[] = [
  {
    id: 'old_man_stone',
    name: '青石问路',
    hint: '青石上的老者,问的从来不是答案',
    stages: ['old_man_stone_1', 'old_man_stone_2', 'old_man_stone_3']
  },
  {
    id: 'sword_in_lake',
    name: '湖中剑影',
    hint: '湖心的影子,比岸边的人先动',
    stages: ['sword_in_lake_1', 'sword_in_lake_2']
  },
  {
    id: 'wounded_fox',
    name: '灵狐衔恩',
    hint: '你救过的那只灵狐,记得你的气味',
    stages: ['wounded_fox_1', 'wounded_fox_2', 'wounded_fox_3']
  },
  {
    id: 'ancient_tree',
    name: '古树藏卷',
    hint: '树心里,前人替你留了一页',
    stages: ['ancient_tree_1', 'ancient_tree_2']
  },
  {
    id: 'night_lantern',
    name: '夜灯照路',
    hint: '灯往哪走,路就往哪开',
    stages: ['night_lantern_1', 'night_lantern_2']
  },
  {
    id: 'yunzhong',
    name: '云海故碑',
    hint: '碑上那两个字,是你自己当年刻的',
    stages: ['yunzhong_1', 'yunzhong_2', 'yunzhong_3']
  }
]

/** 15 个阶段事件 —— 前一程结了,后一程才可能出现 */
export const CHAIN_EVENTS: EventDef[] = [
  // ---- 青石问路 ----
  ev(
    'old_man_stone_1',
    '青石上的老者',
    '道旁一块青石,石上坐着个老者,衣裳洗得发白。他看你良久,忽然问:「你说,道是什么?」',
    0,
    [
      c(
        '据实相告',
        [
          o(65, '老者点点头:「答得诚,不答得巧。」他指给你看石缝里的一线苔痕。', { type: 'exp', reqPct: 0.06 }),
          o(35, '老者摇头:「你答的是别人的道。」他不再言语。', { type: 'material', id: 'wudao', amount: 1 })
        ],
        { isDefault: true }
      ),
      c('反问于他', [
        o(1, '老者笑了:「问得好。你下回还从这儿过,我再说与你听。」', { type: 'material', id: 'wudao', amount: 2 })
      ]),
      leave('你未答,绕石而过。身后老者仍坐着,像一块石头。')
    ]
  ),
  ev(
    'old_man_stone_2',
    '青石犹在',
    '你又走这条道,青石还在,老者还在。他手里多了一枚石子,在掌心转着:「上回的话,你想过没有?」',
    1,
    [
      c(
        '接过石子',
        [
          o(60, '石子入手微凉,内里竟有一缕极淡的灵气。', { type: 'exp', reqPct: 0.08 }, { type: 'material', id: 'ore', amount: 4 }),
          o(40, '石子不过是石子。老者道:「你看,你还是在找里头有什么。」', { type: 'material', id: 'wudao', amount: 2 })
        ],
        { isDefault: true }
      ),
      c('与他并坐半日', [o(1, '半日无话,起身时你觉得心里空了一块,又满了一块。', { type: 'buff', id: 'bless_qingfeng' })]),
      leave()
    ]
  ),
  ev(
    'old_man_stone_3',
    '石上空处',
    '青石还在,老者不在。石面上被人用指力划了三个字,笔画已旧,像是刻了很多年。',
    2,
    [
      c(
        '抚字静观',
        [
          o(55, '指尖触到刻痕的一瞬,那三个字的意思忽然齐了 —— 是他留下的最后一问。', { type: 'exp', reqPct: 0.15 }),
          o(45, '你看了很久,只觉得字刻得深。', { type: 'material', id: 'wudao', amount: 3 })
        ],
        { isDefault: true }
      ),
      c('在石上补一句', [
        o(1, '你以指为笔,在旁添了四字。风过石面,像有人应了一声。', { type: 'buff', id: 'bless_daoyun' }, { type: 'material', id: 'wudao', amount: 2 })
      ])
    ]
  ),

  // ---- 湖中剑影 ----
  ev(
    'sword_in_lake_1',
    '湖中剑影',
    '湖面如镜,水底却有一道剑影,正缓缓转着。奇怪的是,剑影动时,岸上的芦苇却不摇。',
    0,
    [
      c(
        '俯身细看',
        [
          o(60, '你盯得久了,竟从剑势里看出半式杀招。', { type: 'exp', reqPct: 0.07 }),
          o(40, '剑影骤亮,你眼中刺痛,忙闭目退开。', { type: 'buff', id: 'injury' })
        ],
        { isDefault: true }
      ),
      c('以石投水', [o(1, '石子落处,剑影散了又聚。水底浮起一缕锈色。', { type: 'material', id: 'ore', amount: 3 })]),
      leave('你不去理它。剑影自顾自转着,像在等一个人。')
    ]
  ),
  ev(
    'sword_in_lake_2',
    '剑入浅滩',
    '湖水退了半尺,浅滩上斜插着一柄无鞘旧剑,剑身缠满水草。剑影不见了 —— 原来镜里照的就是它。',
    1,
    [
      c(
        '拔剑',
        [
          o(50, '剑出乎意料的轻。水草抖落,剑脊上一行小字:「赠后来者」。', { type: 'equipment', minQualityRank: 2 }),
          o(50, '剑已朽,一拔即断。断口处掉出一物。', { type: 'material', id: 'dust', amount: 6 })
        ],
        { isDefault: true }
      ),
      c('合十而退', [o(1, '你朝旧剑行了一礼。湖风忽起,衣袂翻飞。', { type: 'exp', reqPct: 0.1 })])
    ]
  ),

  // ---- 灵狐衔恩 ----
  ev(
    'wounded_fox_1',
    '受伤的灵狐',
    '林间卧着一只灵狐,后腿被兽夹咬住,见人来了也不逃,只抬眼看你,眼里干净得不像野兽。',
    0,
    [
      c(
        '替它解夹',
        [
          o(70, '夹子松开,灵狐舔了舔伤处,回头看你一眼才走。', { type: 'material', id: 'herb', amount: 5 }),
          o(30, '解夹时被划了一道,灵狐却记住了你的气味。', { type: 'buff', id: 'injury' }, { type: 'material', id: 'herb', amount: 3 })
        ],
        { isDefault: true }
      ),
      // 狠手:得一时之利,这条缘也就断在这里(后续两程不会再来)
      c(
        '取它皮毛',
        [o(1, '你下手极快。狐狸到死都没叫。皮毛尚温,你却没有多看它一眼。', { type: 'material', id: 'dust', amount: 4 })],
        { endsChain: true }
      ),
      leave('你没有管它。走远时,身后传来一声很轻的呜咽。')
    ]
  ),
  ev(
    'wounded_fox_2',
    '狐引路',
    '山路转折处,一只灵狐蹲在石上,后腿的伤已结痂。它见你来了,跳下石头,回头看你,走两步又停下。',
    1,
    [
      c(
        '随它走',
        [
          o(70, '它把你带到一处避风的石窝,里头堆着它攒下的东西。', { type: 'material', id: 'herb', amount: 6 }, { type: 'material', id: 'ore', amount: 3 }),
          o(30, '跟了半日,它忽然钻进草丛不见了 —— 只留下一小堆温热的药草。', { type: 'material', id: 'herb', amount: 4 })
        ],
        { isDefault: true }
      ),
      c('不予理会', [o(1, '它看了你一会儿,自己走了。', { type: 'material', id: 'wudao', amount: 1 })])
    ]
  ),
  ev(
    'wounded_fox_3',
    '灵狐衔来',
    '清晨推门,那只灵狐坐在阶前,嘴里衔着一株草,草叶上有露,露里有一点极细的光。它把草放下,退开三步。',
    2,
    [
      c(
        '收下',
        [
          o(60, '草入药囊,隐隐一股清气。你抬头时,灵狐已不见。', { type: 'buff', id: 'bless_jiyuan' }, { type: 'material', id: 'herb', amount: 8 }),
          o(40, '草离了它的口,光就散了,只剩一株寻常药草。', { type: 'material', id: 'herb', amount: 4 })
        ],
        { isDefault: true }
      ),
      c('推回去', [o(1, '你把草轻轻推回它面前。它歪头看你半晌,最后自己吃了,转身入林。', { type: 'exp', reqPct: 0.12 })])
    ]
  ),

  // ---- 古树藏卷 ----
  ev(
    'ancient_tree_1',
    '古树有灵',
    '一株古树,树身要几人合抱。你走近时,树皮上的纹路竟像是顺着你的呼吸起伏。',
    0,
    [
      c(
        '依树静坐',
        [
          o(65, '坐至日暮,呼吸与树同频,胸中杂念落尽。', { type: 'buff', id: 'bless_qingfeng' }),
          o(35, '坐到入夜,蚊虫扰人,终究没能定下心。', { type: 'material', id: 'wudao', amount: 1 })
        ],
        { isDefault: true }
      ),
      c('叩树三下', [o(1, '三声闷响,树洞里忽然滚出一枚松果。', { type: 'material', id: 'herb', amount: 3 })]),
      leave()
    ]
  ),
  ev(
    'ancient_tree_2',
    '树心空处',
    '古树被雷劈开一道口子,树心里是空的。空处放着一只木匣,匣上无锁,只系了根旧绳。',
    1,
    [
      c(
        '解绳开匣',
        [
          o(55, '匣中是一卷手抄残页,字迹被水浸过,仍可辨读。', { type: 'material', id: 'page', amount: 10 }),
          o(45, '匣中空无一物,只有一张写着「来晚了」的纸。', { type: 'material', id: 'wudao', amount: 3 })
        ],
        { isDefault: true }
      ),
      c('不取', [o(1, '你把匣子放回原处,重新系好。古树在头顶落下一片叶,正巧落进你掌心。', { type: 'exp', reqPct: 0.09 })])
    ]
  ),

  // ---- 夜灯照路 ----
  ev(
    'night_lantern_1',
    '夜灯',
    '夜路上没有星月,前头却有一点灯火,不高不低地悬着。你走它走,你停它停。',
    0,
    [
      c(
        '跟随灯火',
        [
          o(60, '灯把你引到一处从没走过的岔口,岔口后头是条近路。', { type: 'exp', reqPct: 0.06 }),
          o(40, '追了半夜,灯忽然灭在一处荒坟前。', { type: 'buff', id: 'curse_xinmo' })
        ],
        { isDefault: true }
      ),
      c('就地歇下', [o(1, '你不追了。灯悬了一会儿,自己飘远。', { type: 'material', id: 'wudao', amount: 1 })]),
      leave()
    ]
  ),
  ev(
    'night_lantern_2',
    '灯下有人',
    '那盏灯又出现了,这次灯下站着一个人影,背对着你,肩上落满霜。他似乎等很久了。',
    1,
    [
      c(
        '上前搭话',
        [
          o(55, '人影转过身来,递给你一盏灯:「路难走,拿着。」再抬头,他人已不在。', { type: 'buff', id: 'bless_jiyuan' }, { type: 'material', id: 'dust', amount: 5 }),
          o(45, '你走近时,人影散了 —— 地上只剩一件旧物。', { type: 'equipment', minQualityRank: 2 })
        ],
        { isDefault: true }
      ),
      c('远远行礼', [o(1, '你远远一揖。人影没有回头,只是灯亮了一亮,像是在应。', { type: 'exp', reqPct: 0.1 })])
    ]
  ),

  // ---- 云海故碑(仙界起头:高界也该有自己的缘,而不是只剩凡间那笔旧账) ----
  ev(
    'yunzhong_1',
    '云海故碑',
    '云海尽头立着一块旧碑,碑面朝海,背面朝人。转到背面,两个字:「云隐」。刀口浅,起落间是凡间的手法 —— 你认得,那是你自己刻的。',
    9,
    [
      c(
        '拂去碑上苔痕',
        [
          o(
            70,
            '苔痕落尽,碑上浮起一层极淡的灵光。说不清为什么,你心里某处松了一下。',
            { type: 'exp', reqPct: 0.05 },
            { type: 'material', id: 'wudao', amount: 2 }
          ),
          o(30, '苔痕擦不净 —— 像有人年年替你补上。你收回手,没再擦。', { type: 'material', id: 'page', amount: 1 })
        ],
        { isDefault: true }
      ),
      c('坐碑前一夜', [
        o(1, '一夜无梦。天亮时你发觉,道基比昨夜稳了。', { type: 'buff', id: 'bless_qingfeng' })
      ]),
      leave('你看了一会儿,转身入云。碑立在那里,像一直都会立着。')
    ]
  ),
  ev(
    'yunzhong_2',
    '碑后石门',
    '碑后一线石门,推开是一间空屋:一榻、一案、一灯。案上摊着半张旧图,画的是你走过的人间地界 —— 有些地方你记得,有些地方已经想不起名字。',
    12,
    [
      c('在图上添一笔', [
        o(
          1,
          '你写下新去的地名。隔日再看,旧图自己又长出一寸。',
          { type: 'exp', reqPct: 0.08 },
          { type: 'material', id: 'page', amount: 2 }
        )
      ]),
      c(
        '取走那盏灯',
        [
          o(65, '灯焰不动,提在手里却照得见路 —— 连心里那一段也照见了。', { type: 'buff', id: 'bless_daoyun' }),
          o(35, '灯在你手里熄了。屋里一下暗下来,你并不觉得可惜。', { type: 'material', id: 'dust', amount: 8 })
        ],
        { isDefault: true }
      ),
      leave('你把门原样掩上。有些屋子,来过一次就够了。')
    ]
  ),
  ev(
    'yunzhong_3',
    '履约之日',
    '神界山道上有人候着,背对着你,肩上一道旧伤。他回过头:「碑,我给你守到你回来。」',
    15,
    [
      c(
        '应约',
        [
          o(
            60,
            '你们对坐一夜。临别他不说再见,只说:「路还长。」',
            { type: 'exp', reqPct: 0.12 },
            { type: 'buff', id: 'bless_daoyun' },
            { type: 'material', id: 'wudao', amount: 6 }
          ),
          o(40, '你想说的话终究没说出口,他也没问。天亮时山道上只剩你一个。', { type: 'exp', reqPct: 0.1 })
        ],
        { isDefault: true }
      ),
      c('先谢过他', [
        o(
          1,
          '你郑重一揖。他受了一半,把另一半还了回来:「本就是你的。」',
          { type: 'exp', reqPct: 0.08 },
          { type: 'material', id: 'page', amount: 3 }
        )
      ]),
      leave('你远远一揖,没有走近。他也没有回头。')
    ]
  )
]

/** 某事件属于哪条链的第几程(非奇缘返回 null)—— 事件引擎靠它推进缘分 */
export function chainOfEvent(eventId: string): { chain: ChainDef; stage: number } | null {
  for (const chain of CHAINS) {
    const stage = chain.stages.indexOf(eventId)
    if (stage >= 0) return { chain, stage }
  }
  return null
}
