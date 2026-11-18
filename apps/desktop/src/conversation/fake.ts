/**
 * A scripted conversation source for Stage 1 (E2). It serves fixed
 * conversations in English or Chinese and answers what the user does with
 * canned replies, so every block the screen can show appears on fake data:
 * messages, working text, thinking, tool calls (local, remote, failed, cut),
 * an approval, a task, and markers.
 *
 * Nothing here talks to a model. Stage 3 replaces this with a source built
 * on the harness's events, behind the same interface (source.ts).
 */

import type { Locale } from "../i18n/messages";
import type { Block, Conversation, ToolCall } from "./model";
import type { ConversationSource, ConversationSummary } from "./source";

export type ScenarioId = "hike" | "chat";
export const SCENARIOS: readonly ScenarioId[] = ["hike", "chat"];

/** Texts of the fake data, which plays the part of model output and device names. */
const text = {
  en: {
    character: "Dafeiyu",
    thisDevice: "This device",
    phone: "Phone",
    server: "Home server",
    desk: "Study desktop",
    hikeTitle: "Weekend hike",
    u1: "Can you check the weather in Hangzhou this weekend? I'm thinking of going hiking.",
    w1: "Checking the forecast and the user's trip notes before suggesting a day.",
    m1: "Saturday looks great: 18 to 24 °C, cloudy in the morning and sunny after noon. Sunday has a 70% chance of rain in the afternoon.",
    m2: "Your notes say you wanted to try the Jiuxi trail. Saturday morning would be perfect for it.",
    remembered: "Wants to hike the Jiuxi trail on a sunny weekend",
    taskTitle: "Watch Sunday's weather and warn if it changes",
    taskLatest: "Checking the forecast every hour",
    u2: "Nice. Book the 8:30 bus for Saturday and tell Mia.",
    w2: "Booking spends money, so it needs approval. The message to Mia goes through the phone, which is offline.",
    action: "buy a bus ticket",
    waiting: "Waiting for your approval…",
    thinking: "Thinking…",
    offline: "The phone is offline",
    seats: "2 seats left",
    results: "6 results",
    lines: "42 lines",
    allowedReply: "Done: one seat on the 8:30 bus on Saturday. I'll tell Mia when your phone is back online.",
    deniedReply: "All right, I won't book it. Let me know if you'd like another time.",
    reply: "This is a preview on scripted data. Real conversations arrive in Stage 3.",
    chatTitle: "Presentation day",
    c1: "I finally finished the presentation!",
    c2: "Congratulations! How do you feel now that it's done?",
    c3: "Tired but relieved. The Q&A went better than I expected.",
    c4: "That's the best kind of tired. Which question were you most worried about?",
    c5: "The one about the budget. But I had the numbers ready.",
    c6: "So the preparation paid off. Want to treat yourself tonight?",
    c7: "Maybe the ramen place you mentioned last week?",
    gift: "Birthday gift ideas",
    japanese: "Learning Japanese",
    photos: "Sorting my photos",
    books: "Book recommendations",
    printer: "Fixing the printer",
    hoursAgo: "2 h ago",
    yesterday: "Yesterday",
    today: "08:40",
    monday: "Mon",
    date: "Nov 12",
  },
  "zh-CN": {
    character: "大肥鱼",
    thisDevice: "本设备",
    phone: "手机",
    server: "家里的服务器",
    desk: "书房电脑",
    hikeTitle: "周末徒步",
    u1: "帮我看看杭州这个周末的天气？我想去徒步。",
    w1: "先查天气预报和用户的出行笔记，再建议哪天去。",
    m1: "周六很合适：18 到 24 °C，上午多云，午后转晴。周日下午有 70% 的概率下雨。",
    m2: "你的笔记里写着想走九溪那条线，周六上午去正好。",
    remembered: "想在晴朗的周末走九溪线",
    taskTitle: "盯着周日的天气，有变化就提醒",
    taskLatest: "每小时查一次天气预报",
    u2: "好。订周六 8:30 的车，再告诉一下米娅。",
    w2: "订票要花钱，需要批准。给米娅的消息要通过手机发，但手机离线了。",
    action: "买一张车票",
    waiting: "等待你的批准…",
    thinking: "思考中…",
    offline: "手机离线",
    seats: "剩 2 个座位",
    results: "6 条结果",
    lines: "42 行",
    allowedReply: "订好了：周六 8:30 那班车的一个座位。等你手机上线，我再告诉米娅。",
    deniedReply: "好的，那就先不订。想换时间的话告诉我。",
    reply: "这是用脚本数据做的预览，真正的对话在第 3 阶段接入。",
    chatTitle: "汇报日",
    c1: "我终于讲完那个汇报了！",
    c2: "恭喜！讲完之后感觉怎么样？",
    c3: "累，但是松了口气。问答环节比我想的顺利。",
    c4: "这是最好的那种累。你最担心的是哪个问题？",
    c5: "预算那个。不过数字我都准备好了。",
    c6: "看来准备没白费。今晚要不要犒劳一下自己？",
    c7: "比如你上周提到的那家拉面？",
    gift: "生日礼物点子",
    japanese: "学日语",
    photos: "整理照片",
    books: "书单推荐",
    printer: "修打印机",
    hoursAgo: "2 小时前",
    yesterday: "昨天",
    today: "08:40",
    monday: "周一",
    date: "11月12日",
  },
} satisfies Record<Locale, Record<string, string>>;

type Texts = (typeof text)["en"];

function tool(call: Omit<ToolCall, "startedAt"> & { startedAt?: string }): ToolCall {
  return { startedAt: "09:12:31", ...call };
}

function hike(t: Texts): Conversation {
  const blocks: Block[] = [
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
        device: t.thisDevice,
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
        device: t.thisDevice,
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
    {
      kind: "task",
      id: "k1",
      task: {
        id: "k1",
        title: t.taskTitle,
        device: t.server,
        latest: t.taskLatest,
        elapsedSeconds: 72,
        running: true,
        steps: [
          tool({
            id: "k1-1",
            name: { toolset: "Web", tool: "Fetch", argument: "weather.com.cn/hangzhou" },
            category: "web",
            status: "done",
            summary: "12 KB",
            durationMs: 2100,
            device: t.server,
          }),
        ],
      },
    },
    { kind: "user", id: "u2", text: t.u2, time: "09:14" },
    { kind: "working", id: "w2", text: t.w2 },
    {
      kind: "tool",
      id: "t4",
      call: tool({
        id: "t4",
        name: { remote: "phone", toolset: "Messages", tool: "Send", argument: "Mia" },
        category: "messages",
        status: "offline",
        failure: t.offline,
        device: t.phone,
        startedAt: "09:14:05",
        input: '{ "to": "Mia", "text": "…" }',
      }),
    },
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
        device: t.thisDevice,
        startedAt: "09:14:06",
        input: '{ "from": "Hangzhou", "to": "Jiuxi", "departure": "2026-11-22T08:30" }',
        output: "08:30 Hangzhou East → Jiuxi, ¥28, 2 seats left",
      }),
    },
    {
      kind: "approval",
      id: "a1",
      request: {
        id: "a1",
        action: t.action,
        device: t.phone,
        reason: "spends",
        arguments: '{\n  "route": "Hangzhou East → Jiuxi",\n  "departure": "2026-11-22 08:30",\n  "seats": 1,\n  "price": "¥28"\n}',
      },
    },
  ];
  return {
    id: "hike",
    title: t.hikeTitle,
    device: t.thisDevice,
    character: { name: t.character },
    blocks,
    activity: { text: t.waiting },
    contextUsed: 0.62,
  };
}

function chat(t: Texts): Conversation {
  return {
    id: "chat",
    title: t.chatTitle,
    device: t.thisDevice,
    character: { name: t.character },
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
    contextUsed: 0.18,
  };
}

function brief(t: Texts, summary: ConversationSummary): Conversation {
  return {
    id: summary.id,
    title: summary.title,
    device: summary.device,
    character: { name: t.character },
    blocks: [
      { kind: "user", id: `${summary.id}-u`, text: summary.title, time: "10:00" },
      { kind: "message", id: `${summary.id}-m`, text: t.reply, time: "10:00" },
    ],
    contextUsed: 0.05,
  };
}

function summaries(t: Texts): ConversationSummary[] {
  return [
    { id: "hike", title: t.hikeTitle, group: "running", device: t.thisDevice, active: true },
    { id: "photos", title: t.photos, group: "running", device: t.desk },
    { id: "gift", title: t.gift, group: "carry-on", device: t.phone, when: t.hoursAgo },
    { id: "japanese", title: t.japanese, group: "carry-on", device: t.server, when: t.yesterday },
    { id: "chat", title: t.chatTitle, group: "recent", device: t.thisDevice, when: t.today },
    { id: "books", title: t.books, group: "recent", device: t.thisDevice, when: t.monday },
    { id: "printer", title: t.printer, group: "recent", device: t.thisDevice, when: t.date },
  ];
}

/** How long the fake "thinks" before a canned reply. */
export const FAKE_REPLY_DELAY_MS = 1500;

export function createFakeSource(locale: Locale): ConversationSource {
  const t = text[locale];
  const list = summaries(t);
  const conversations = new Map<string, Conversation>([
    ["hike", hike(t)],
    ["chat", chat(t)],
  ]);
  // The other conversations in the list get a short exchange, so that every
  // item of the sidebar opens something.
  for (const summary of list) {
    if (!conversations.has(summary.id)) conversations.set(summary.id, brief(t, summary));
  }
  const listeners = new Set<() => void>();
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const update = (id: string, change: (conversation: Conversation) => Conversation) => {
    const current = conversations.get(id);
    if (!current) return;
    conversations.set(id, change(current));
    for (const listener of listeners) listener();
  };
  const now = () => new Date().toTimeString().slice(0, 5);
  const reply = (id: string, message: string) => {
    setTimeout(() => {
      update(id, (conversation) => ({
        ...conversation,
        activity: undefined,
        blocks: [
          ...conversation.blocks.map((block) => (block.kind === "user" && block.pending ? { ...block, pending: false } : block)),
          { kind: "message", id: nextId("m"), text: message, time: now() },
        ],
      }));
    }, FAKE_REPLY_DELAY_MS);
  };

  return {
    list: () => list,
    conversation: (id) => conversations.get(id),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send(id, message) {
      const running = conversations.get(id)?.activity !== undefined;
      update(id, (conversation) => ({
        ...conversation,
        // During a turn the message waits for the next step (it cuts in).
        blocks: [...conversation.blocks, { kind: "user", id: nextId("u"), text: message, time: now(), pending: running }],
        activity: conversation.activity ?? { text: t.thinking },
      }));
      if (!running) reply(id, t.reply);
    },
    stop(id) {
      update(id, (conversation) => ({
        ...conversation,
        activity: undefined,
        blocks: conversation.blocks.map((block) =>
          block.kind === "tool" && (block.call.status === "running" || block.call.status === "waiting")
            ? { ...block, call: { ...block.call, status: "cancelled" } }
            : block,
        ),
      }));
    },
    answer(id, approvalId, decision) {
      update(id, (conversation) => ({
        ...conversation,
        blocks: conversation.blocks.map((block) =>
          block.kind === "approval" && block.request.id === approvalId
            ? { ...block, request: { ...block.request, decision } }
            : block,
        ),
        activity: { text: t.thinking },
      }));
      reply(id, decision === "allowed" ? t.allowedReply : t.deniedReply);
    },
  };
}
