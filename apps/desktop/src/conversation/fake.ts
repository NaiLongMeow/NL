/**
 * A scripted session source for Stage 1 (E2). It serves a fixed set of
 * devices, live sessions, and archived sessions in English or Chinese, and
 * answers what the user does with canned replies, so that every block and
 * state the screens can show appears on fake data (UI design note, sections
 * 4 and 5):
 *
 * - "errands", a shared session the user told eight things at once: it kept
 *   the quick ones, dispatched the rest (4.12), and is now idle, counting
 *   down to its archiving (4.11) while its tasks run on elsewhere;
 * - the sessions that received those tasks: new ones the harness started on
 *   this laptop, the home server, and the phone (offline), and existing ones
 *   that accept tasks ("photos" on the study desktop, "hike" on this laptop);
 * - "hike", with working text, thinking, tool calls (local, remote, cut), a
 *   memory marker, and an approval that waits;
 * - "photos", which stopped to ask the user a question (4.13);
 * - "presentation", a plain chat that does not accept tasks;
 * - an archive of earlier sessions to carry on from.
 *
 * Nothing here talks to a model. Stage 3 replaces this with a source built
 * on the harness's events, behind the same interface (source.ts).
 */

import type { Locale } from "../i18n/messages";
import { characterState, pendingQuestion, type Block, type Conversation, type DispatchedTask, type QuestionAnswer, type SessionKind, type SessionLink, type ToolCall } from "./model";
import type { ArchivedSession, Device, SessionSource, SessionStatus, SessionSummary } from "./source";

/** Texts of the fake data, which plays the part of model output and of names the user chose. */
const text = {
  en: {
    character: "Dafeiyu",
    laptop: "My laptop",
    desk: "Study desktop",
    server: "Home server",
    phone: "Phone",
    speaker: "Living room speaker",
    thinking: "Thinking…",
    reply: "This is a preview on scripted data. Real sessions arrive in Stage 3.",
    newSession: "New session",
    justNow: "Just now",
    endedSummary: "Summary saved.",

    errandsTitle: "Errands this week",
    errandsAsk:
      "A few things for this week:\n1. Sort my Downloads folder by type\n2. File this year's photos on the study desktop by month\n3. Keep an eye on Sunday's weather and tell me if it rains\n4. Book the 8:30 bus to Jiuxi on Saturday\n5. Tell Mia the plan for Saturday\n6. Check that my dentist appointment next Wednesday still stands\n7. Put last month's bills into one table\n8. Suggest three audiobooks for the commute",
    errandsPlan:
      "Eight tasks. The dentist check and the audiobooks are quick, so I keep them. Files on the laptop go to its device session, the photos to the session on the study desktop that is already sorting them, the bus to the weekend hike session, and the rest to new sessions.",
    errandsDentist: "Your dentist appointment stands: next Wednesday at 15:00 at the Chengxi clinic.",
    errandsBooks:
      "Three audiobooks that work in short sittings: Sapiens, The Courage to Be Disliked, and The Three-Body Problem. The other tasks went to other sessions; the card above shows how they are doing, and they keep going even after this session closes.",
    dDownloads: "Sort the Downloads folder",
    dPhotos: "File this year's photos by month",
    dWeather: "Watch Sunday's weather",
    dBus: "Book the 8:30 bus to Jiuxi",
    dMia: "Tell Mia the plan for Saturday",
    dDentist: "Check next Wednesday's dentist appointment",
    dBills: "Put last month's bills in a table",
    dBooks: "Suggest three commute audiobooks",
    noteDentist: "Wed 15:00, still on",
    noteBills: "bills-2026-10.xlsx",
    noteBooks: "Three picks",

    downloadsTitle: "Sort the Downloads folder",
    downloadsTask:
      "Sort the Downloads folder by type: documents, images, installers, and archives in a folder each. Move installers untouched for 30 days to \"To delete\" instead of deleting them.",
    downloadsPlan: "List the folder, then group by extension. Deleting needs approval, so old installers only move to \"To delete\".",
    downloadsMoving: "Moving files…",
    items214: "214 items",
    files38: "38 files",
    files61: "61 files",

    photosTitle: "Sorting photos",
    photosAsk: "How much space do the photos on this computer take?",
    photosAnswer: "Pictures holds 3,412 photos, 18.6 GB in all. Half of them are from 2026.",
    photosTask: "File this year's photos by month, into Pictures/2026/01 to 12.",
    photosMoving: "Filing photos by month…",
    photosQuestion: "212 photos have no date, so I can't tell their month. Where should they go?",
    photosUndated: "Into a folder named Undated",
    photosUndatedDetail: "Pictures/2026/Undated",
    photosModified: "By the date the file was last changed",
    photosModifiedDetail: "Often the day it was copied, not the day it was taken",
    photosLeave: "Leave them where they are",
    photosWaiting: "Waiting for your answer…",
    photosAnswered: (answer: string) => `Got it: ${answer}. Filing the rest now.`,
    photosSkipped: "All right, I'll leave the undated photos where they are.",
    photos1706: "1,706 photos",
    photos842: "842 photos",

    weatherTitle: "Watch Sunday's weather",
    weatherTask: "Keep an eye on Sunday's weather in Hangzhou and tell me if it is going to rain.",
    weatherReply:
      "I'll check the forecast every hour. Right now Sunday afternoon has a 70% chance of rain; if that still holds on Saturday evening, I'll suggest moving the hike.",
    weatherHourly: "Checking the forecast every hour",

    hikeTitle: "Weekend hike",
    u1: "Can you check the weather in Hangzhou this weekend? I'm thinking of going hiking.",
    w1: "Checking the forecast and the user's trip notes before suggesting a day.",
    m1: "Saturday looks great: 18 to 24 °C, cloudy in the morning and sunny after noon. Sunday has a 70% chance of rain in the afternoon.",
    m2: "Your notes say you wanted to try the Jiuxi trail. Saturday morning would be perfect for it.",
    remembered: "Wants to hike the Jiuxi trail on a sunny weekend",
    busTask: "Book one seat on the 8:30 bus from Hangzhou East to Jiuxi on Saturday.",
    w2: "Booking spends money, so it needs approval.",
    action: "buy a bus ticket",
    waiting: "Waiting for your approval…",
    seats: "2 seats left",
    results: "6 results",
    lines: "42 lines",
    allowedReply: "Done: one seat on the 8:30 bus on Saturday.",
    deniedReply: "All right, I won't book it. Let me know if you'd like another time.",

    miaTitle: "Message Mia",
    miaTask: "Tell Mia: we're hiking the Jiuxi trail on Saturday morning, taking the 8:30 bus. Ask if she wants to come.",
    miaWaiting: "Waiting for the phone to come online…",

    billsTitle: "Last month's bills",
    billsTask: "Put last month's bills into one table, by category, with a total for each.",
    billsDone:
      "Done: bills-2026-10.xlsx in the shared files. Food ¥2,140, transport ¥486, rent ¥4,800, other ¥1,312; ¥8,738 in all.",
    files23: "23 files",
    sheet: "4 categories",

    chatTitle: "Presentation day",
    c1: "I finally finished the presentation!",
    c2: "Congratulations! How do you feel now that it's done?",
    c3: "Tired but relieved. The Q&A went better than I expected.",
    c4: "That's the best kind of tired. Which question were you most worried about?",
    c5: "The one about the budget. But I had the numbers ready.",
    c6: "So the preparation paid off. Want to treat yourself tonight?",
    c7: "Maybe the ramen place you mentioned last week?",

    gift: "Birthday gift ideas",
    giftSummary: "A birthday gift for Mom: leaning towards a massager under ¥800; three candidates noted.",
    japanese: "Learning Japanese",
    japaneseSummary: "Fifteen minutes of kana practice a day; next time starts with the か row.",
    books: "Book recommendations",
    booksSummary: "Six science fiction novels listed. Foundation is done; Dune is next.",
    printer: "Fixing the printer",
    printerSummary: "The printer was offline after a failed driver update; reinstalling the driver fixed it. Its model is remembered.",
    weekly: "Weekly report",
    weeklySummary: "This week's meeting notes sorted; the report draft is in the shared files.",
    hoursAgo: "2 h ago",
    yesterday: "Yesterday",
    monday: "Mon",
    nov12: "Nov 12",
    nov10: "Nov 10",
  },
  "zh-CN": {
    character: "大肥鱼",
    laptop: "我的笔记本",
    desk: "书房电脑",
    server: "家里的服务器",
    phone: "手机",
    speaker: "客厅音箱",
    thinking: "思考中…",
    reply: "这是用脚本数据做的预览，真正的会话在第 3 阶段接入。",
    newSession: "新会话",
    justNow: "刚刚",
    endedSummary: "摘要已保存。",

    errandsTitle: "这周的杂事",
    errandsAsk:
      "这周帮我办几件事：\n1. 把下载文件夹按类型整理一下\n2. 书房电脑上今年的照片按月份归档\n3. 盯着周日的天气，要下雨就提醒我\n4. 订周六 8:30 去九溪的车\n5. 告诉米娅周六的安排\n6. 看看下周三的牙医预约还在不在\n7. 把上个月的账单汇总成一张表\n8. 推荐三本适合通勤听的有声书",
    errandsPlan:
      "一共八件事。牙医预约和有声书很快，我自己办；笔记本上的文件交给它的设备会话，照片交给书房电脑上正在整理照片的会话，订车并到「周末徒步」，其余的新建会话。",
    errandsDentist: "牙医预约还在：下周三 15:00，城西口腔。",
    errandsBooks:
      "有声书挑了三本，都能一段段地听：《人类简史》《被讨厌的勇气》《三体》。其余几件交给了别的会话，进展看上面的卡片；这个会话结束了，它们也会接着做。",
    dDownloads: "整理下载文件夹",
    dPhotos: "今年的照片按月份归档",
    dWeather: "盯着周日的天气",
    dBus: "订周六 8:30 去九溪的车",
    dMia: "告诉米娅周六的安排",
    dDentist: "查下周三的牙医预约",
    dBills: "上个月的账单汇总成表",
    dBooks: "推荐三本通勤听的有声书",
    noteDentist: "周三 15:00，还在",
    noteBills: "bills-2026-10.xlsx",
    noteBooks: "挑好了三本",

    downloadsTitle: "整理下载文件夹",
    downloadsTask:
      "把下载文件夹按类型整理：文档、图片、安装包、压缩包各放一个文件夹。30 天没动过的安装包挪到「待删除」，不要直接删。",
    downloadsPlan: "先列出下载文件夹，再按扩展名分组。删除需要批准，所以旧安装包只挪到「待删除」。",
    downloadsMoving: "正在移动文件…",
    items214: "214 项",
    files38: "38 个文件",
    files61: "61 个文件",

    photosTitle: "整理照片",
    photosAsk: "看看这台电脑上的照片占了多少空间？",
    photosAnswer: "图片文件夹里有 3,412 张照片，一共 18.6 GB，其中一半是 2026 年拍的。",
    photosTask: "把今年的照片按月份归档，放到 Pictures/2026/01 到 12。",
    photosMoving: "正在按月份归档照片…",
    photosQuestion: "有 212 张照片没有拍摄日期，分不出月份。它们放哪儿？",
    photosUndated: "放进一个叫“无日期”的文件夹",
    photosUndatedDetail: "Pictures/2026/无日期",
    photosModified: "按文件最后修改的日期",
    photosModifiedDetail: "往往是拷进来的那天，不一定是拍摄那天",
    photosLeave: "留在原处不动",
    photosWaiting: "等你回答…",
    photosAnswered: (answer: string) => `好的：${answer}。剩下的这就归档。`,
    photosSkipped: "好，没日期的照片先留在原处。",
    photos1706: "1,706 张",
    photos842: "842 张",

    weatherTitle: "盯着周日天气",
    weatherTask: "盯着周日杭州的天气，预报说要下雨就提醒我。",
    weatherReply: "我每小时看一次预报。现在周日下午下雨的概率是 70%，要是到周六晚上还这样，我就提醒你改期。",
    weatherHourly: "每小时查一次天气预报",

    hikeTitle: "周末徒步",
    u1: "帮我看看杭州这个周末的天气？我想去徒步。",
    w1: "先查天气预报和用户的出行笔记，再建议哪天去。",
    m1: "周六很合适：18 到 24 °C，上午多云，午后转晴。周日下午有 70% 的概率下雨。",
    m2: "你的笔记里写着想走九溪那条线，周六上午去正好。",
    remembered: "想在晴朗的周末走九溪线",
    busTask: "订周六 8:30 杭州东站到九溪的车，一个座位。",
    w2: "订票要花钱，需要批准。",
    action: "买一张车票",
    waiting: "等待你的批准…",
    seats: "剩 2 个座位",
    results: "6 条结果",
    lines: "42 行",
    allowedReply: "订好了：周六 8:30 那班车的一个座位。",
    deniedReply: "好的，那就先不订。想换时间的话告诉我。",

    miaTitle: "给米娅发消息",
    miaTask: "告诉米娅：周六上午去九溪徒步，坐 8:30 的车，问她要不要一起。",
    miaWaiting: "等手机上线…",

    billsTitle: "账单汇总",
    billsTask: "把上个月的账单汇总成一张表：按类别分，附上每类的合计。",
    billsDone: "汇总好了，在共享文件里的 bills-2026-10.xlsx：餐饮 2,140 元，交通 486 元，房租 4,800 元，其他 1,312 元，合计 8,738 元。",
    files23: "23 个文件",
    sheet: "4 个类别",

    chatTitle: "汇报日",
    c1: "我终于讲完那个汇报了！",
    c2: "恭喜！讲完之后感觉怎么样？",
    c3: "累，但是松了口气。问答环节比我想的顺利。",
    c4: "这是最好的那种累。你最担心的是哪个问题？",
    c5: "预算那个。不过数字我都准备好了。",
    c6: "看来准备没白费。今晚要不要犒劳一下自己？",
    c7: "比如你上周提到的那家拉面？",

    gift: "生日礼物点子",
    giftSummary: "给妈妈挑生日礼物：倾向于 800 元以内的按摩仪，记下了三款候选。",
    japanese: "学日语",
    japaneseSummary: "定了每天 15 分钟的五十音练习，下次从「か行」开始。",
    books: "书单推荐",
    booksSummary: "列了 6 本科幻小说，《基地》读完了，下一本是《沙丘》。",
    printer: "修打印机",
    printerSummary: "打印机脱机是因为驱动更新失败，重装驱动后恢复了，型号已记住。",
    weekly: "周报",
    weeklySummary: "整理了本周的会议记录，周报草稿在共享文件里。",
    hoursAgo: "2 小时前",
    yesterday: "昨天",
    monday: "周一",
    nov12: "11月12日",
    nov10: "11月10日",
  },
} satisfies Record<Locale, Record<string, string | ((value: string) => string)>>;

type Texts = (typeof text)["en"];

/** The idle time before archiving that the fake starts with, in minutes (note, section 4.11). */
export const DEFAULT_IDLE_LIMIT = 30;

/** How long the fake "thinks" before a canned reply. */
export const FAKE_REPLY_DELAY_MS = 1500;

function tool(call: Omit<ToolCall, "startedAt"> & { startedAt?: string }): ToolCall {
  return { startedAt: "09:12:31", ...call };
}

function devices(t: Texts): Device[] {
  return [
    { id: "laptop", name: t.laptop, type: "computer", self: true, online: true },
    { id: "desktop3", name: t.desk, type: "computer", online: true },
    { id: "homeserver", name: t.server, type: "server", online: true },
    { id: "phone", name: t.phone, type: "phone", online: false },
    { id: "speaker", name: t.speaker, type: "speaker", online: true },
  ];
}

/** A live session of the fake, with what the sidebar needs besides its conversation. */
interface Live {
  conversation: Conversation;
  /** The device of a device session, by node id. */
  deviceId?: string;
  /** Minutes the session has been idle so far, for its archive countdown. */
  idleFor: number;
}

function session(
  conversation: Omit<Conversation, "character" | "acceptsTasks" | "contextUsed"> &
    Partial<Pick<Conversation, "acceptsTasks" | "contextUsed">>,
  t: Texts,
): Conversation {
  return { acceptsTasks: true, contextUsed: 0.08, character: { name: t.character }, ...conversation };
}

function scripted(t: Texts): Live[] {
  const errands: SessionLink = { id: "errands", title: t.errandsTitle };
  const dispatched: DispatchedTask[] = [
    {
      id: "d1",
      title: t.dDownloads,
      session: { id: "downloads", title: t.downloadsTitle, created: true, kind: "device", device: t.laptop },
      status: "running",
    },
    {
      id: "d2",
      title: t.dPhotos,
      session: { id: "photos", title: t.photosTitle, created: false, kind: "device", device: t.desk },
      status: "question",
    },
    {
      id: "d3",
      title: t.dWeather,
      session: { id: "weather", title: t.weatherTitle, created: true, kind: "device", device: t.server },
      status: "running",
    },
    {
      id: "d4",
      title: t.dBus,
      session: { id: "hike", title: t.hikeTitle, created: false, kind: "device", device: t.laptop },
      status: "approval",
    },
    {
      id: "d5",
      title: t.dMia,
      session: { id: "mia", title: t.miaTitle, created: true, kind: "device", device: t.phone },
      status: "device",
    },
    { id: "d6", title: t.dDentist, status: "done", note: t.noteDentist },
    {
      id: "d7",
      title: t.dBills,
      session: { id: "bills", title: t.billsTitle, created: true, kind: "shared" },
      status: "done",
      note: t.noteBills,
    },
    { id: "d8", title: t.dBooks, status: "done", note: t.noteBooks },
  ];

  const hike: Block[] = [
    { kind: "summarized", id: "s1" },
    { kind: "user", id: "u1", text: t.u1, time: "09:12" },
    { kind: "thinking", id: "th1", seconds: 6 },
    { kind: "working", id: "w1", text: t.w1 },
    {
      kind: "tool",
      id: "t1",
      call: tool({
        id: "t1",
        name: { toolset: "Web", tool: "Search", argument: '"Hangzhou weekend weather"' },
        category: "web",
        status: "done",
        summary: t.results,
        durationMs: 1200,
        device: t.laptop,
        input: '{ "query": "Hangzhou weekend weather" }',
        output: "1. Hangzhou 7-day forecast · weather.com.cn\n2. Hangzhou weekend: sun on Saturday · tianqi.com\n3. Rain expected on Sunday afternoon · cma.gov.cn",
      }),
    },
    {
      kind: "tool",
      id: "t2",
      call: tool({
        id: "t2",
        name: { toolset: "Web", tool: "Fetch", argument: "weather.com.cn/hangzhou" },
        category: "web",
        status: "done",
        summary: "14 KB",
        durationMs: 2400,
        cut: true,
        device: t.laptop,
        input: '{ "url": "https://weather.com.cn/hangzhou" }',
        output: "Sat 22 Nov: cloudy, then sunny. 18–24 °C. Wind NE 2.\nSun 23 Nov: overcast, rain from 14:00 (70%). 15–19 °C.\n…",
      }),
    },
    {
      kind: "tool",
      id: "t3",
      call: tool({
        id: "t3",
        name: { remote: "desktop3", toolset: "Files", tool: "Read", argument: "trips/hiking.md" },
        category: "files",
        status: "done",
        summary: t.lines,
        durationMs: 300,
        device: t.desk,
        input: '{ "path": "trips/hiking.md" }',
        output: "# Hikes to try\n- Jiuxi trail (Hangzhou), 3 h, sunny days only\n- Mount Huang, needs two days",
      }),
    },
    { kind: "message", id: "m1", text: t.m1, time: "09:12" },
    { kind: "message", id: "m2", text: t.m2, time: "09:12" },
    { kind: "remembered", id: "r1", text: t.remembered },
    { kind: "received", id: "rv-hike", text: t.busTask, from: errands },
    { kind: "working", id: "w2", text: t.w2 },
    {
      kind: "tool",
      id: "t5",
      call: tool({
        id: "t5",
        name: { toolset: "Bus", tool: "Search", argument: '"Hangzhou → Jiuxi, Sat 08:30"' },
        category: "booking",
        status: "done",
        summary: t.seats,
        durationMs: 800,
        device: t.laptop,
        startedAt: "09:31:06",
        input: '{ "from": "Hangzhou East", "to": "Jiuxi", "departure": "2026-11-22T08:30" }',
        output: "08:30 Hangzhou East → Jiuxi, ¥28, 2 seats left",
      }),
    },
    {
      kind: "approval",
      id: "a1",
      request: {
        id: "a1",
        action: t.action,
        device: t.laptop,
        reason: "spends",
        arguments: '{\n  "route": "Hangzhou East → Jiuxi",\n  "departure": "2026-11-22 08:30",\n  "seats": 1,\n  "price": "¥28"\n}',
      },
    },
  ];

  const move = (id: string, argument: string, status: ToolCall["status"], summary?: string) =>
    ({
      kind: "tool",
      id,
      call: tool({
        id,
        name: { toolset: "Files", tool: "Move", argument },
        category: "files",
        status,
        summary,
        durationMs: status === "done" ? 900 : undefined,
        device: t.laptop,
        startedAt: "09:32:10",
      }),
    }) satisfies Block;

  return [
    {
      idleFor: 4,
      conversation: session(
        {
          id: "errands",
          title: t.errandsTitle,
          kind: "shared",
          contextUsed: 0.21,
          blocks: [
            { kind: "user", id: "e-u", text: t.errandsAsk, time: "09:30" },
            { kind: "thinking", id: "e-th", seconds: 4 },
            { kind: "working", id: "e-w", text: t.errandsPlan },
            { kind: "dispatch", id: "e-d", tasks: dispatched },
            { kind: "message", id: "e-m1", text: t.errandsDentist, time: "09:31" },
            { kind: "message", id: "e-m2", text: t.errandsBooks, time: "09:31" },
          ],
        },
        t,
      ),
    },
    {
      idleFor: 1,
      conversation: session(
        {
          id: "bills",
          title: t.billsTitle,
          kind: "shared",
          from: errands,
          blocks: [
            { kind: "received", id: "b-r", text: t.billsTask, from: errands },
            {
              kind: "tool",
              id: "b-t1",
              call: tool({
                id: "b-t1",
                name: { toolset: "Files", tool: "Search", argument: '"bills 2026-10"' },
                category: "files",
                status: "done",
                summary: t.files23,
                durationMs: 700,
                device: t.server,
              }),
            },
            {
              kind: "tool",
              id: "b-t2",
              call: tool({
                id: "b-t2",
                name: { toolset: "Sheets", tool: "Create", argument: "bills-2026-10.xlsx" },
                category: "files",
                status: "done",
                summary: t.sheet,
                durationMs: 1600,
                device: t.server,
              }),
            },
            { kind: "message", id: "b-m", text: t.billsDone, time: "09:33" },
          ],
        },
        t,
      ),
    },
    {
      deviceId: "laptop",
      idleFor: 0,
      conversation: session(
        {
          id: "hike",
          title: t.hikeTitle,
          kind: "device",
          device: t.laptop,
          contextUsed: 0.62,
          blocks: hike,
          activity: { text: t.waiting },
        },
        t,
      ),
    },
    {
      deviceId: "laptop",
      idleFor: 0,
      conversation: session(
        {
          id: "downloads",
          title: t.downloadsTitle,
          kind: "device",
          device: t.laptop,
          from: errands,
          blocks: [
            { kind: "received", id: "dl-r", text: t.downloadsTask, from: errands },
            { kind: "working", id: "dl-w", text: t.downloadsPlan },
            {
              kind: "tool",
              id: "dl-t1",
              call: tool({
                id: "dl-t1",
                name: { toolset: "Files", tool: "List", argument: "~/Downloads" },
                category: "files",
                status: "done",
                summary: t.items214,
                durationMs: 200,
                device: t.laptop,
              }),
            },
            move("dl-t2", "*.pdf → Documents/", "done", t.files38),
            move("dl-t3", "*.png, *.jpg → Images/", "done", t.files61),
            move("dl-t4", "*.exe, *.msi → Installers/", "running"),
          ],
          activity: { text: t.downloadsMoving },
        },
        t,
      ),
    },
    {
      deviceId: "laptop",
      idleFor: 18,
      conversation: session(
        {
          id: "presentation",
          title: t.chatTitle,
          kind: "device",
          device: t.laptop,
          acceptsTasks: false,
          contextUsed: 0.18,
          blocks: [
            { kind: "user", id: "c1", text: t.c1, time: "18:02" },
            { kind: "message", id: "c2", text: t.c2, time: "18:02" },
            { kind: "user", id: "c3", text: t.c3, time: "18:03" },
            { kind: "message", id: "c4", text: t.c4, time: "18:03" },
            { kind: "user", id: "c5", text: t.c5, time: "18:04" },
            { kind: "message", id: "c6", text: t.c6, time: "18:04" },
            { kind: "message", id: "c7", text: t.c7, time: "18:04" },
            { kind: "break", id: "b1" },
          ],
        },
        t,
      ),
    },
    {
      deviceId: "desktop3",
      idleFor: 0,
      conversation: session(
        {
          id: "photos",
          title: t.photosTitle,
          kind: "device",
          device: t.desk,
          contextUsed: 0.14,
          blocks: [
            { kind: "user", id: "p-u", text: t.photosAsk, time: "08:10" },
            { kind: "message", id: "p-m", text: t.photosAnswer, time: "08:10" },
            { kind: "received", id: "p-r", text: t.photosTask, from: errands },
            {
              kind: "tool",
              id: "p-t1",
              call: tool({
                id: "p-t1",
                name: { toolset: "Files", tool: "List", argument: "Pictures/2026" },
                category: "files",
                status: "done",
                summary: t.photos1706,
                durationMs: 400,
                device: t.desk,
              }),
            },
            {
              kind: "tool",
              id: "p-t2",
              call: tool({
                id: "p-t2",
                name: { toolset: "Files", tool: "Move", argument: "2026-01 … 2026-06" },
                category: "files",
                status: "done",
                summary: t.photos842,
                durationMs: 5200,
                device: t.desk,
              }),
            },
            {
              kind: "question",
              id: "p-q",
              question: {
                id: "q1",
                text: t.photosQuestion,
                options: [
                  { label: t.photosUndated, detail: t.photosUndatedDetail },
                  { label: t.photosModified, detail: t.photosModifiedDetail },
                  { label: t.photosLeave },
                ],
              },
            },
          ],
          activity: { text: t.photosWaiting },
        },
        t,
      ),
    },
    {
      deviceId: "homeserver",
      idleFor: 0,
      conversation: session(
        {
          id: "weather",
          title: t.weatherTitle,
          kind: "device",
          device: t.server,
          from: errands,
          blocks: [
            { kind: "received", id: "wt-r", text: t.weatherTask, from: errands },
            {
              kind: "tool",
              id: "wt-t1",
              call: tool({
                id: "wt-t1",
                name: { toolset: "Web", tool: "Fetch", argument: "weather.com.cn/hangzhou" },
                category: "web",
                status: "done",
                summary: "12 KB",
                durationMs: 2100,
                device: t.server,
              }),
            },
            { kind: "message", id: "wt-m", text: t.weatherReply, time: "09:32" },
          ],
          activity: { text: t.weatherHourly },
        },
        t,
      ),
    },
    {
      deviceId: "phone",
      idleFor: 0,
      conversation: session(
        {
          id: "mia",
          waitsForDevice: true,
          title: t.miaTitle,
          kind: "device",
          device: t.phone,
          from: errands,
          blocks: [{ kind: "received", id: "mia-r", text: t.miaTask, from: errands }],
          activity: { text: t.miaWaiting },
        },
        t,
      ),
    },
  ];
}

function archived(t: Texts): ArchivedSession[] {
  return [
    { id: "gift", title: t.gift, kind: "shared", when: t.hoursAgo, reason: "ended", summary: t.giftSummary },
    { id: "japanese", title: t.japanese, kind: "device", device: t.server, when: t.yesterday, reason: "idle", summary: t.japaneseSummary },
    { id: "books", title: t.books, kind: "shared", when: t.monday, reason: "idle", summary: t.booksSummary },
    { id: "printer", title: t.printer, kind: "device", device: t.desk, when: t.nov12, reason: "ended", summary: t.printerSummary },
    { id: "weekly", title: t.weekly, kind: "shared", when: t.nov10, reason: "idle", summary: t.weeklySummary },
  ];
}

/** What an archived session shows when opened: the request, the summary, and the archive divider. */
function archivedConversation(t: Texts, item: ArchivedSession, idleLimit: number): Conversation {
  return session(
    {
      id: item.id,
      title: item.title,
      kind: item.kind,
      device: item.device,
      archived: true,
      blocks: [
        { kind: "user", id: `${item.id}-u`, text: item.title, time: "10:00" },
        { kind: "message", id: `${item.id}-m`, text: item.summary, time: "10:00" },
        {
          kind: "archived",
          id: `${item.id}-a`,
          reason: item.reason,
          ...(item.reason === "idle" ? { idleMinutes: idleLimit } : {}),
        },
      ],
    },
    t,
  );
}

function statusOf(live: Live, idleLimit: number): SessionStatus {
  const { conversation } = live;
  const state = characterState(conversation);
  switch (state) {
    case "approval":
    case "question":
    case "device":
      return { kind: state };
    case "working":
      return { kind: "working", text: conversation.activity?.text ?? "" };
    case "idle":
      return { kind: "idle", archivesInMinutes: Math.max(1, idleLimit - live.idleFor) };
  }
}

/** The blocks with the question `questionId` answered. */
function answered(blocks: readonly Block[], questionId: string, answer: QuestionAnswer): Block[] {
  return blocks.map((block) =>
    block.kind === "question" && block.question.id === questionId ? { ...block, question: { ...block.question, answer } } : block,
  );
}

/** The words of an answer, as the character's reply repeats them. */
function answerText(answer: QuestionAnswer): string {
  if ("skipped" in answer) return "";
  return [...answer.choices, ...(answer.other ? [answer.other] : [])].join(", ");
}

export function createFakeSource(locale: Locale): SessionSource {
  const t = text[locale];
  const deviceList = devices(t);
  const live = new Map(scripted(t).map((item) => [item.conversation.id, item]));
  let archive = archived(t);
  const ended = new Map<string, Conversation>();
  let idleLimit = DEFAULT_IDLE_LIMIT;
  const listeners = new Set<() => void>();
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const summarize = (): SessionSummary[] =>
    [...live.values()].map((item) => ({
      id: item.conversation.id,
      title: item.conversation.title,
      kind: item.conversation.kind,
      deviceId: item.deviceId,
      status: statusOf(item, idleLimit),
      acceptsTasks: item.conversation.acceptsTasks,
      from: item.conversation.from,
    }));
  let list = summarize();
  const archivedConversations = new Map<string, Conversation>();

  const changed = () => {
    list = summarize();
    for (const listener of listeners) listener();
  };
  const update = (id: string, change: (item: Live) => Live) => {
    const current = live.get(id);
    if (!current) return;
    live.set(id, change(current));
    changed();
  };
  const updateConversation = (id: string, change: (conversation: Conversation) => Conversation) =>
    update(id, (item) => ({ ...item, idleFor: 0, conversation: change(item.conversation) }));

  const now = () => new Date().toTimeString().slice(0, 5);
  const reply = (id: string, message: string) => {
    setTimeout(() => {
      updateConversation(id, (conversation) => ({
        ...conversation,
        activity: undefined,
        blocks: [
          ...conversation.blocks.map((block) => (block.kind === "user" && block.pending ? { ...block, pending: false } : block)),
          { kind: "message", id: nextId("m"), text: message, time: now() },
        ],
      }));
    }, FAKE_REPLY_DELAY_MS);
  };
  const self = deviceList.find((device) => device.self)!;

  return {
    devices: () => deviceList,
    list: () => list,
    archive: () => archive,
    conversation(id) {
      const item = live.get(id);
      if (item) return item.conversation;
      const closed = ended.get(id);
      if (closed) return closed;
      const entry = archive.find((candidate) => candidate.id === id);
      if (!entry) return undefined;
      // Built once per entry and idle limit, so that snapshots stay stable.
      const key = `${id}@${idleLimit}`;
      let conversation = archivedConversations.get(key);
      if (!conversation) {
        conversation = archivedConversation(t, entry, idleLimit);
        archivedConversations.set(key, conversation);
      }
      return conversation;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send(id, message) {
      const current = live.get(id)?.conversation;
      const question = current && pendingQuestion(current);
      if (question) {
        // The message is the answer, in the user's own words; the turn goes on.
        updateConversation(id, (conversation) => ({
          ...conversation,
          blocks: [
            ...answered(conversation.blocks, question.id, { choices: [], other: message }),
            { kind: "user", id: nextId("u"), text: message, time: now() },
          ],
          activity: { text: t.thinking },
        }));
        reply(id, t.photosAnswered(message));
        return;
      }
      const running = current?.activity !== undefined;
      updateConversation(id, (conversation) => ({
        ...conversation,
        // During a turn the message waits for the next step (it cuts in).
        blocks: [...conversation.blocks, { kind: "user", id: nextId("u"), text: message, time: now(), pending: running }],
        activity: conversation.activity ?? { text: t.thinking },
      }));
      if (!running) reply(id, t.reply);
    },
    stop(id) {
      update(id, (item) => ({
        ...item,
        conversation: {
          ...item.conversation,
          waitsForDevice: false,
          activity: undefined,
          blocks: item.conversation.blocks.map((block) =>
            block.kind === "tool" && (block.call.status === "running" || block.call.status === "waiting")
              ? { ...block, call: { ...block.call, status: "cancelled" } }
              : block,
          ),
        },
      }));
    },
    answer(id, approvalId, decision) {
      updateConversation(id, (conversation) => ({
        ...conversation,
        blocks: conversation.blocks.map((block) =>
          block.kind === "approval" && block.request.id === approvalId ? { ...block, request: { ...block.request, decision } } : block,
        ),
        activity: { text: t.thinking },
      }));
      reply(id, decision === "allowed" ? t.allowedReply : t.deniedReply);
    },
    answerQuestion(id, questionId, answer) {
      updateConversation(id, (conversation) => ({
        ...conversation,
        blocks: answered(conversation.blocks, questionId, answer),
        activity: { text: t.thinking },
      }));
      reply(id, "skipped" in answer ? t.photosSkipped : t.photosAnswered(answerText(answer)));
    },
    setAcceptsTasks(id, accepts) {
      update(id, (item) => ({ ...item, conversation: { ...item.conversation, acceptsTasks: accepts } }));
    },
    end(id) {
      const item = live.get(id);
      if (!item) return;
      const lastMessage = [...item.conversation.blocks].reverse().find((block) => block.kind === "message");
      const closed: Conversation = {
        ...item.conversation,
        archived: true,
        activity: undefined,
        blocks: [...item.conversation.blocks, { kind: "archived", id: nextId("a"), reason: "ended" }],
      };
      live.delete(id);
      ended.set(id, closed);
      archive = [
        {
          id,
          title: closed.title,
          kind: closed.kind,
          device: closed.device,
          when: t.justNow,
          reason: "ended",
          summary: lastMessage?.kind === "message" ? lastMessage.text : t.endedSummary,
        },
        ...archive,
      ];
      changed();
    },
    start(kind: SessionKind) {
      const id = nextId("new");
      live.set(id, {
        deviceId: kind === "device" ? self.id : undefined,
        idleFor: 0,
        conversation: session(
          { id, title: t.newSession, kind, device: kind === "device" ? self.name : undefined, blocks: [], contextUsed: 0 },
          t,
        ),
      });
      changed();
      return id;
    },
    carryOn(archivedId) {
      const entry = archive.find((candidate) => candidate.id === archivedId);
      const id = nextId("carry");
      live.set(id, {
        deviceId: entry?.kind === "device" ? self.id : undefined,
        idleFor: 0,
        conversation: session(
          {
            id,
            title: entry?.title ?? t.newSession,
            kind: entry?.kind ?? "shared",
            device: entry?.kind === "device" ? self.name : undefined,
            blocks: [{ kind: "summarized", id: nextId("s") }],
            contextUsed: 0.04,
          },
          t,
        ),
      });
      changed();
      return id;
    },
    setIdleLimit(minutes) {
      idleLimit = minutes;
      changed();
    },
  };
}
